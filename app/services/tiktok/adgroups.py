"""
TikTok ad groups module.
Provides functionality for working with TikTok ad groups.
"""
import logging
from typing import Dict, List, Any, Optional

from business_api_client.api.adgroup_api import AdgroupApi

from app.services.tiktok.client import TikTokClient, SDK_AVAILABLE


class TikTokAdGroupsMixin:
    """Mixin for TikTok ad group functionality."""
    
    def get_adgroups(self, campaign_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch ad groups from the advertiser account, optionally filtered by campaign.
        
        Args:
            campaign_id: Optional campaign ID to filter ad groups
            
        Returns:
            List of ad group dictionaries with normalized data structure
        """
        if not SDK_AVAILABLE or not self.api_client:
            logging.error("TikTok SDK not available or not initialized")
            return []
            
        try:
            # Create ad group API instance
            api_instance = AdgroupApi(self.api_client)
            
            # Prepare request parameters
            params = {
                'page_size': 100
            }
            
            if campaign_id:
                # TikTok SDK expects campaign_ids in filtering parameter as a list
                params['filtering'] = {
                    'campaign_ids': [campaign_id]
                }
            
            # Make API request
            logging.info(f"Calling TikTok API to get adgroups for advertiser_id: {self.advertiser_id}, campaign_id: {campaign_id}")
            response = api_instance.adgroup_get(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                **params
            )
            
            # Process response - handle both object and dictionary response formats
            adgroup_list = []
            
            if isinstance(response, dict):
                # Dictionary response format
                logging.info("Processing dictionary response format")
                if response.get('data') and response['data'].get('list'):
                    for adgroup in response['data']['list']:
                        adgroup_list.append({
                            'id': adgroup.get('adgroup_id'),
                            'name': adgroup.get('adgroup_name'),
                            'campaign_id': adgroup.get('campaign_id'),
                            'status': adgroup.get('status') or adgroup.get('secondary_status'),
                            'optimization_goal': adgroup.get('optimization_goal'),
                            'budget': adgroup.get('budget'),
                            'budget_mode': adgroup.get('budget_mode'),
                            'bid': adgroup.get('bid'),
                            'create_time': adgroup.get('create_time'),
                            'modify_time': adgroup.get('modify_time')
                        })
                    logging.info(f"Processed {len(adgroup_list)} adgroups from dictionary response")
            elif hasattr(response, 'code') and hasattr(response, 'data'):
                # Object response format
                logging.info("Processing object response format")
                if response.code == 0 and hasattr(response.data, 'get'):
                    for adgroup in response.data.get('list', []):
                        adgroup_list.append({
                            'id': adgroup.get('adgroup_id'),
                            'name': adgroup.get('adgroup_name'),
                            'campaign_id': adgroup.get('campaign_id'),
                            'status': adgroup.get('status'),
                            'optimization_goal': adgroup.get('optimization_goal'),
                            'budget': adgroup.get('budget'),
                            'budget_mode': adgroup.get('budget_mode'),
                            'bid': adgroup.get('bid'),
                            'create_time': adgroup.get('create_time'),
                            'modify_time': adgroup.get('modify_time')
                        })
                    logging.info(f"Processed {len(adgroup_list)} adgroups from object response")
            else:
                logging.warning(f"Unexpected response format: {type(response)}")
                
            return adgroup_list
            
        except Exception as e:
            logging.error(f"Error fetching TikTok ad groups: {e}")
            return []
    
    def create_adgroup(self, adgroup_data: Dict[str, Any]) -> Optional[str]:
        """
        Create a new ad group.
        
        Args:
            adgroup_data: Ad group data dictionary
            
        Returns:
            Ad group ID if successful, None otherwise
        """
        if not SDK_AVAILABLE or not self.api_client:
            logging.error("TikTok SDK not available or not initialized")
            return None
            
        try:
            # Create ad group API instance
            api_instance = AdgroupApi(self.api_client)
            
            # Make API request
            logging.info(f"Calling TikTok API to create ad group for advertiser_id: {self.advertiser_id}")
            response = api_instance.adgroup_create(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                body=adgroup_data
            )
            
            # Process response
            if isinstance(response, dict):
                # Dictionary response format
                if response.get('code') == 0 and response.get('data') and response['data'].get('adgroup_id'):
                    adgroup_id = response['data']['adgroup_id']
                    logging.info(f"Successfully created ad group: {adgroup_id}")
                    return adgroup_id
                else:
                    error_msg = response.get('message', 'Unknown error')
                    logging.error(f"Failed to create ad group: {error_msg}")
            elif hasattr(response, 'code') and hasattr(response, 'data'):
                # Object response format
                if response.code == 0 and response.data and hasattr(response.data, 'adgroup_id'):
                    adgroup_id = response.data.adgroup_id
                    logging.info(f"Successfully created ad group: {adgroup_id}")
                    return adgroup_id
                else:
                    error_msg = getattr(response, 'message', 'Unknown error')
                    logging.error(f"Failed to create ad group: {error_msg}")
            else:
                logging.warning(f"Unexpected response format: {type(response)}")
                
            return None
            
        except Exception as e:
            logging.error(f"Error creating TikTok ad group: {e}")
            return None 