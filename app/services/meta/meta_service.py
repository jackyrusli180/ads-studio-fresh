"""
Meta Advertising Service
Handles interactions with the Meta Business SDK
"""
import logging
import os
import sys
from typing import Dict, List, Any, Optional, Union

# Add the Meta SDK to the Python path
meta_sdk_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'lib', 'meta-sdk'))
if meta_sdk_path not in sys.path:
    sys.path.insert(0, meta_sdk_path)

# Import from the local SDK
from facebook_business.api import FacebookAdsApi
from facebook_business.session import FacebookSession

# Import centralized configuration
from app.config import credentials
from app.config.meta_config import get_meta_account_details

# Import our service modules
from app.services.meta.meta_asset_service import MetaAssetService
from app.services.meta.meta_ad_service import MetaAdService
from app.services.meta.meta_campaign_service import MetaCampaignService

class MetaService:
    """Service for interacting with Meta Advertising APIs"""
    
    def __init__(self, app_id: Optional[str] = None, app_secret: Optional[str] = None, 
                 access_token: Optional[str] = None, ad_account_id: Optional[str] = None):
        """Initialize the Meta service with API credentials"""
        self.app_id = app_id or credentials.META_APP_ID
        self.app_secret = app_secret or credentials.META_APP_SECRET
        self.access_token = access_token or credentials.META_ACCESS_TOKEN
        self.business_id = credentials.META_BUSINESS_ID
        self.ad_account_id = ad_account_id or credentials.META_AD_ACCOUNT_ID
        
        # Initialize the API
        self.api = self.initialize_api()
        
        # Initialize sub-services
        self.asset_service = MetaAssetService(self.api, self.ad_account_id)
        self.campaign_service = MetaCampaignService(self.api, self.ad_account_id, self.business_id)
        self.ad_service = MetaAdService(self.api, self.ad_account_id, self.asset_service)
    
    def initialize_api(self):
        """Initialize the Meta Business API with credentials"""
        try:
            session = FacebookSession(
                app_id=self.app_id,
                app_secret=self.app_secret,
                access_token=self.access_token
            )
            
            api = FacebookAdsApi(session)
            FacebookAdsApi.set_default_api(api)
            
            return api
        except Exception as e:
            logging.error(f"Error initializing Meta API: {str(e)}")
            raise
    
    @property
    def account_details(self):
        """
        Get the details for the current ad account.
        
        Returns:
            dict: Account details from meta_config
        """
        if not self.ad_account_id:
            return None
            
        return get_meta_account_details(self.ad_account_id)
    
    # Forward methods to appropriate service classes
    
    def get_ad_account(self, account_id=None):
        """Get an ad account object"""
        return self.campaign_service.get_ad_account(account_id)
    
    def get_ad_accounts(self):
        """Get all ad accounts accessible to the user"""
        return self.campaign_service.get_ad_accounts()
    
    def get_campaigns(self, account_id=None, format_data=True):
        """
        Get campaigns for a specific ad account
        
        Args:
            account_id: Optional account ID, uses default if not provided
            format_data: If True, returns formatted dictionaries; if False, returns raw API objects
            
        Returns:
            List of campaign data
        """
        return self.campaign_service.get_campaigns(account_id, format_data)
    
    def get_adsets(self, account_id=None, campaign_id=None, format_data=True):
        """
        Fetch ad sets from the ad account, optionally filtered by campaign
        
        Args:
            account_id: Optional account ID, uses default if not provided
            campaign_id: Optional campaign ID to filter ad sets
            format_data: If True, returns formatted dictionaries; if False, returns raw API objects
            
        Returns:
            List of ad set data
        """
        return self.campaign_service.get_adsets(account_id, campaign_id, format_data)
    
    def create_campaign(self, account_id=None, campaign_data=None):
        """
        Create a new campaign
        
        Args:
            account_id: Optional account ID, uses default if not provided
            campaign_data: Dictionary containing campaign details
            
        Returns:
            Created campaign object
        """
        return self.campaign_service.create_campaign(account_id, campaign_data)
    
    def create_adset(self, account_id=None, adset_data=None):
        """
        Create a new ad set in a campaign
        
        Args:
            account_id: Optional account ID, uses default if not provided
            adset_data: Dictionary containing ad set details
                
        Returns:
            Created ad set object
        """
        return self.campaign_service.create_adset(account_id, adset_data)
    
    def get_campaign_insights(self, campaign_id, format_data=True):
        """
        Get performance insights for a campaign
        
        Args:
            campaign_id: ID of the campaign to get insights for
            format_data: If True, returns formatted dictionaries; if False, returns raw API objects
            
        Returns:
            List of insight data
        """
        return self.campaign_service.get_campaign_insights(campaign_id, format_data)
            
    def create_ad(self, ad_data):
        """
        Create a new ad in Meta
        
        Args:
            ad_data (dict): Ad data including name, adset_id, assets
            
        Returns:
            dict: Created ad data or error message
        """
        return self.ad_service.create_ad(ad_data) 