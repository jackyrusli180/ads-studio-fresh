import os
import requests
import logging
from datetime import datetime, timedelta
import json
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)

class MetaAdLibraryService:
    """Service to interact with Meta Ad Library API"""
    
    BASE_URL = "https://graph.facebook.com/v18.0/ads_archive"
    
    def __init__(self):
        self.access_token = os.environ.get('META_AD_LIBRARY_ACCESS_TOKEN', '')
        if not self.access_token:
            logger.warning("META_AD_LIBRARY_ACCESS_TOKEN not set in environment variables")
        else:
            logger.info(f"Meta Ad Library API token loaded (length: {len(self.access_token)})")
    
    def get_competitor_ads(self, competitor_name: str) -> List[Dict[str, Any]]:
        """
        Fetch ads for a specific competitor from Meta Ad Library
        
        Args:
            competitor_name: Name of the competitor
            
        Returns:
            List of ad data dictionaries
        """
        params = {
            'search_terms': competitor_name,
            'ad_type': 'POLITICAL_AND_ISSUE_ADS',  # This gives more data fields
            'ad_reached_countries': ['ALL'],
            'access_token': self.access_token,
            'fields': ','.join([
                'page_id',
                'page_name',
                'ad_snapshot_url',
                'ad_creative_bodies',
                'ad_creative_link_titles',
                'ad_creative_link_descriptions',
                'ad_creative_link_captions',
                'ad_creative_link_url',
                'impressions',
                'spend',
                'currency',
                'ad_delivery_start_time',
                'ad_delivery_stop_time',
                'publisher_platforms',
                'demographic_distribution'
            ]),
            'limit': 100  # Fetch up to 100 ads per request
        }
        
        try:
            # Real API call
            logger.info(f"Fetching ads for competitor: {competitor_name}")
            response = requests.get(self.BASE_URL, params=params)
            
            if response.status_code != 200:
                logger.error(f"Meta API Error: Status {response.status_code}, Response: {response.text}")
                return []
                
            data = response.json()
            logger.info(f"Successfully fetched ads for {competitor_name}: {len(data.get('data', []))} ads found")
            
            # Process and format the results
            ads = []
            for ad in data.get('data', []):
                processed_ad = self._process_ad_data(ad)
                processed_ad['competitor_name'] = competitor_name
                ads.append(processed_ad)
                
            return ads
        except requests.RequestException as e:
            logger.error(f"Error fetching ads for {competitor_name}: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error while fetching ads for {competitor_name}: {str(e)}", exc_info=True)
            return []
    
    def get_all_competitors_ads(self, competitors: List[str]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Fetch ads for multiple competitors and organize them by competitor
        
        Args:
            competitors: List of competitor names
            
        Returns:
            Dictionary with competitor names as keys and lists of ad data as values
        """
        result = {}
        for competitor in competitors:
            result[competitor] = self.get_competitor_ads(competitor)
        return result
    
    def _process_ad_data(self, ad: Dict[str, Any]) -> Dict[str, Any]:
        """Process and normalize ad data from the API response"""
        processed = {
            'page_id': ad.get('page_id', ''),
            'page_name': ad.get('page_name', ''),
            'ad_snapshot_url': ad.get('ad_snapshot_url', ''),
            'ad_creative_text': self._get_first_item(ad.get('ad_creative_bodies', [])),
            'ad_creative_image_url': '',  # The API doesn't directly provide image URLs
            'publisher_platforms': ad.get('publisher_platforms', []),
            'demographic_distribution': ad.get('demographic_distribution', [])
        }
        
        # Process impressions (comes as a range)
        impressions = ad.get('impressions', {})
        if impressions:
            processed['impressions_lower'] = impressions.get('lower_bound')
            processed['impressions_upper'] = impressions.get('upper_bound')
        
        # Process spend (comes as a range in a specific currency)
        spend = ad.get('spend', {})
        if spend:
            processed['spend_lower'] = spend.get('lower_bound')
            processed['spend_upper'] = spend.get('upper_bound')
            processed['currency'] = ad.get('currency')
        
        # Process date fields
        if 'ad_delivery_start_time' in ad:
            processed['ad_delivery_date_start'] = ad['ad_delivery_start_time']
        
        if 'ad_delivery_stop_time' in ad:
            processed['ad_delivery_date_end'] = ad['ad_delivery_stop_time']
        
        return processed
    
    @staticmethod
    def _get_first_item(items: List) -> Optional[str]:
        """Safely get the first item from a list or return None"""
        return items[0] if items and len(items) > 0 else None 