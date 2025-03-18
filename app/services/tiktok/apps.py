"""
TikTok apps module.
Provides functionality for working with TikTok apps.
"""
import logging
import requests
from typing import Dict, List, Optional, Any

from app.services.tiktok.client import TikTokClient, SDK_AVAILABLE


class TikTokAppsMixin:
    """Mixin for TikTok app functionality."""
    
    def get_app_list(self) -> List[Dict[str, Any]]:
        """
        Retrieve the list of apps and their IDs from TikTok API.
        
        Returns:
            List of app dictionaries with normalized data structure
        """
        if not SDK_AVAILABLE or not self.api_client:
            logging.error("TikTok SDK not available or not initialized")
            return []
            
        try:
            # This endpoint might need to be called directly if not available in SDK
            url = "https://business-api.tiktok.com/open_api/v1.3/app/list/"
            headers = {
                "Access-Token": self.access_token,
                "Content-Type": "application/json"
            }
            params = {
                "advertiser_id": self.advertiser_id
            }
            
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            apps = []
            for app in data.get('data', {}).get('list', []):
                app_info = {
                    'app_name': app.get('app_name'),
                    'app_id': app.get('app_id'),
                    'marketplace': app.get('marketplace'),
                    'app_type': app.get('app_type'),
                    'url': app.get('url'),
                    'package_name': app.get('package_name')
                }
                apps.append(app_info)
            
            return apps
            
        except Exception as e:
            logging.error(f"Error fetching TikTok app list: {e}")
            return [] 