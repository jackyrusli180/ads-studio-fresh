"""
TikTok API service for interacting with the TikTok Ads API.
Uses the official TikTok Business API Client SDK.

This file is maintained for backward compatibility.
The implementation has been moved to the app.services.tiktok package.
"""
import logging

# Import the new modular implementation
from app.services.tiktok import TikTokService

# For backward compatibility, re-export TikTokService
__all__ = ["TikTokService"]

logging.info("TikTok service module loaded from modular implementation")

"""
TikTok API service using direct HTTP requests.
This is a compatibility layer for legacy code that expects a TikTokService class.
"""
import logging
import json
from app.services.tiktok.client import TikTokClient

class TikTokService(TikTokClient):
    """
    TikTok service using direct HTTP requests.
    Implements all TikTok API functionality needed by the application.
    """
    def __init__(self, advertiser_id=None, access_token=None):
        """
        Initialize the TikTok service.
        
        Args:
            advertiser_id: ID of the advertiser account to use
            access_token: Optional access token, if not provided will use the one from config
        """
        super().__init__(advertiser_id=advertiser_id, access_token=access_token)
        logging.info(f"[TikTok] Initialized TikTok service with advertiser ID: {self.advertiser_id}")
    
    def create_ad(self, ad_data):
        """
        Create a new ad on TikTok.
        
        Args:
            ad_data: Dictionary containing ad information
            
        Returns:
            Ad ID from TikTok if successful, None otherwise
        """
        # Import the implementation on demand to avoid circular imports
        from app.services.tiktok.ads import TikTokAdsMixin
        
        # Create a temporary instance just for creating the ad
        ads_mixin = TikTokAdsMixin()
        
        # Copy over the necessary attributes
        ads_mixin.advertiser_id = self.advertiser_id
        ads_mixin.access_token = self.access_token
        ads_mixin.headers = self.headers
        
        # Call the implementation
        return ads_mixin.create_ad(ad_data)
        
    def get_campaigns(self, status=None):
        """
        Get campaigns for the current advertiser account.
        
        Args:
            status: Filter campaigns by status
            
        Returns:
            List of campaign objects
        """
        # Call parent class implementation that uses the SDK
        return super().get_campaigns(status=status)
            
    def get_adgroups(self, campaign_ids=None, status=None):
        """
        Get ad groups for the current advertiser account.
        
        Args:
            campaign_ids: Filter ad groups by campaign IDs
            status: Filter ad groups by status
            
        Returns:
            List of ad group objects
        """
        # Call parent class implementation that uses the SDK
        return super().get_adgroups(campaign_ids=campaign_ids, status=status) 