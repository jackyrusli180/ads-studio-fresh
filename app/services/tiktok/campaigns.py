"""
TikTok campaigns module.
Provides functionality for working with TikTok campaigns.
"""
import logging
from typing import Dict, List, Any, Optional

from business_api_client.api.campaign_creation_api import CampaignCreationApi

from app.services.tiktok.client import TikTokClient, SDK_AVAILABLE


class TikTokCampaignsMixin:
    """Mixin for TikTok campaign functionality."""
    
    def get_campaigns(self) -> List[Dict[str, Any]]:
        """
        Fetch all campaigns from the advertiser account.
        
        Returns:
            List of campaign dictionaries with normalized data structure
        """
        if not SDK_AVAILABLE or not self.api_client:
            logging.error("TikTok SDK not available or not initialized")
            return []
            
        try:
            # Create campaign API instance
            api_instance = CampaignCreationApi(self.api_client)
            
            # Prepare request parameters
            params = {
                'page_size': 100
            }
            
            # Make API request
            logging.info(f"Calling TikTok API to get campaigns for advertiser_id: {self.advertiser_id}")
            response = api_instance.campaign_get(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                **params
            )
            
            # Process response - handle both object and dictionary response formats
            campaign_list = []
            
            if isinstance(response, dict):
                # Dictionary response format
                logging.info("Processing dictionary response format")
                if response.get('data') and response['data'].get('list'):
                    for campaign in response['data']['list']:
                        campaign_list.append({
                            'id': campaign.get('campaign_id'),
                            'name': campaign.get('campaign_name'),
                            'status': campaign.get('status') or campaign.get('secondary_status'),
                            'objective': campaign.get('objective_type'),
                            'budget': campaign.get('budget'),
                            'budget_mode': campaign.get('budget_mode'),
                            'create_time': campaign.get('create_time'),
                            'modify_time': campaign.get('modify_time')
                        })
                    logging.info(f"Processed {len(campaign_list)} campaigns from dictionary response")
            elif hasattr(response, 'code') and hasattr(response, 'data'):
                # Object response format
                logging.info("Processing object response format")
                if response.code == 0 and hasattr(response.data, 'get'):
                    for campaign in response.data.get('list', []):
                        campaign_list.append({
                            'id': campaign.get('campaign_id'),
                            'name': campaign.get('campaign_name'),
                            'status': campaign.get('status'),
                            'objective': campaign.get('objective_type'),
                            'budget': campaign.get('budget'),
                            'budget_mode': campaign.get('budget_mode'),
                            'create_time': campaign.get('create_time'),
                            'modify_time': campaign.get('modify_time')
                        })
                    logging.info(f"Processed {len(campaign_list)} campaigns from object response")
            else:
                logging.warning(f"Unexpected response format: {type(response)}")
                
            return campaign_list
            
        except Exception as e:
            logging.error(f"Error fetching TikTok campaigns: {e}")
            return []
    
    def create_campaign(self, campaign_data: Dict[str, Any]) -> Optional[str]:
        """
        Create a new campaign.
        
        Args:
            campaign_data: Campaign data dictionary
            
        Returns:
            Campaign ID if successful, None otherwise
        """
        if not SDK_AVAILABLE or not self.api_client:
            logging.error("TikTok SDK not available or not initialized")
            return None
            
        try:
            # Create campaign API instance
            api_instance = CampaignCreationApi(self.api_client)
            
            # Make API request
            logging.info(f"Calling TikTok API to create campaign for advertiser_id: {self.advertiser_id}")
            response = api_instance.campaign_create(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                body=campaign_data
            )
            
            # Process response
            if isinstance(response, dict):
                # Dictionary response format
                if response.get('code') == 0 and response.get('data') and response['data'].get('campaign_id'):
                    campaign_id = response['data']['campaign_id']
                    logging.info(f"Successfully created campaign: {campaign_id}")
                    return campaign_id
                else:
                    error_msg = response.get('message', 'Unknown error')
                    logging.error(f"Failed to create campaign: {error_msg}")
            elif hasattr(response, 'code') and hasattr(response, 'data'):
                # Object response format
                if response.code == 0 and response.data and hasattr(response.data, 'campaign_id'):
                    campaign_id = response.data.campaign_id
                    logging.info(f"Successfully created campaign: {campaign_id}")
                    return campaign_id
                else:
                    error_msg = getattr(response, 'message', 'Unknown error')
                    logging.error(f"Failed to create campaign: {error_msg}")
            else:
                logging.warning(f"Unexpected response format: {type(response)}")
                
            return None
            
        except Exception as e:
            logging.error(f"Error creating TikTok campaign: {e}")
            return None 