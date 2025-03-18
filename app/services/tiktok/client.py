"""
TikTok API client module.
Provides base functionality for TikTok API access.
"""
import logging
from typing import Optional

# Import centralized configuration
from app.config import credentials
from app.config.tiktok_config import ACCESS_TOKEN, IDENTITY_TYPE, get_tiktok_account_details

# Import the TikTok SDK
try:
    import business_api_client
    from business_api_client import Configuration, ApiClient
    from business_api_client.api.campaign_creation_api import CampaignCreationApi
    from business_api_client.api.adgroup_api import AdgroupApi
    from business_api_client.api.ad_api import AdApi
    from business_api_client.api.file_api import FileApi
    logging.info("Successfully imported TikTok SDK")
    SDK_AVAILABLE = True
except ImportError as e:
    logging.error(f"Failed to import TikTok SDK. Error: {e}")
    SDK_AVAILABLE = False


class TikTokClient:
    """Base client for interacting with the TikTok Ads API using the official SDK."""
    
    def __init__(self, access_token: Optional[str] = None, advertiser_id: Optional[str] = None):
        """
        Initialize the TikTok client with credentials.
        
        Args:
            access_token: TikTok API access token
            advertiser_id: TikTok advertiser account ID
        """
        self.access_token = access_token or ACCESS_TOKEN
        self.advertiser_id = advertiser_id or credentials.TIKTOK_ADVERTISER_ID
        self.api_client = self._initialize_api_client() if SDK_AVAILABLE else None
        
    def _initialize_api_client(self) -> Optional[ApiClient]:
        """
        Initialize the TikTok API client.
        
        Returns:
            ApiClient: Configured TikTok API client or None if initialization fails
        """
        try:
            configuration = Configuration()
            configuration.access_token = self.access_token
            configuration.host = "https://business-api.tiktok.com"
            return ApiClient(configuration)
        except Exception as e:
            logging.error(f"Failed to initialize TikTok API client: {e}")
            return None
    
    def get_identity_type(self):
        """
        Get the identity type for the current advertiser ID.
        
        Returns:
            str: The identity type for this advertiser
        """
        return get_tiktok_account_details(self.advertiser_id).get('identity_type', IDENTITY_TYPE)
    
    def is_initialized(self) -> bool:
        """
        Check if the client is properly initialized.
        
        Returns:
            bool: True if SDK is available and API client is initialized
        """
        return SDK_AVAILABLE and self.api_client is not None 