"""
TikTok API client module.
Uses the official TikTok Business API SDK.
"""
import logging
import os
import json
import time

# Import the TikTok Business API SDK
import business_api_client
from business_api_client.rest import ApiException
from business_api_client.api.campaign_creation_api import CampaignCreationApi
from business_api_client.api.adgroup_api import AdgroupApi
from business_api_client.api.authentication_api import AuthenticationApi
from business_api_client.api.tool_api import ToolApi
from business_api_client.configuration import Configuration

from app.config.tiktok_config import ACCESS_TOKEN, TIKTOK_ACCOUNTS, get_tiktok_account_details
from app.config.credentials import TIKTOK_APP_ID, TIKTOK_APP_SECRET

# API Base URL
API_BASE_URL = "https://business-api.tiktok.com/open_api/v1.3"

# Flag indicating whether the SDK is available
SDK_AVAILABLE = True

class TikTokClient:
    """Client for interacting with the TikTok API using the official SDK."""
    
    def __init__(self, access_token=None, advertiser_id=None):
        """
        Initialize the TikTok client.
        
        Args:
            access_token: Access token for authenticating to the TikTok API
            advertiser_id: ID of the advertiser account to use
        """
        # Set a default access token from the config if environment variable isn't set
        self.access_token = access_token or ACCESS_TOKEN
        
        # Use the provided advertiser_id if available, otherwise get the first one from config
        self.advertiser_id = advertiser_id
        if not self.advertiser_id and TIKTOK_ACCOUNTS:
            # Get the first advertiser ID from the configuration
            self.advertiser_id = next(iter(TIKTOK_ACCOUNTS.keys()))
            
        logging.info(f"[TikTok] Initializing client with advertiser ID: {self.advertiser_id}")
        
        # Validate advertiser_id
        if not self.advertiser_id:
            logging.error("[TikTok] No advertiser ID provided")
            
        # Set up the default headers
        self.headers = {
            "Access-Token": self.access_token,
            "Content-Type": "application/json"
        }
        
        # Initialize the SDK configuration
        self.configuration = Configuration()
        self.configuration.api_key['Access-Token'] = self.access_token
        self.api_client = business_api_client.ApiClient(self.configuration)
        
        # Test the connection
        self._test_connection()
    
    def _test_connection(self):
        """Test the API connection with a simple request."""
        try:
            # Make a simple API call to verify the token and advertiser ID
            logging.info(f"[TikTok] Testing API connection with advertiser ID: {self.advertiser_id}")
            
            try:
                # Use the SDK to test the connection
                auth_api = AuthenticationApi(self.api_client)
                
                # Check if we have app_id and secret available
                if hasattr(TIKTOK_APP_ID, 'strip') and hasattr(TIKTOK_APP_SECRET, 'strip') and TIKTOK_APP_ID.strip() and TIKTOK_APP_SECRET.strip():
                    # Make API request using the SDK with app_id and secret
                    response = auth_api.oauth2_advertiser_get(
                        app_id=TIKTOK_APP_ID,
                        secret=TIKTOK_APP_SECRET,
                        access_token=self.access_token
                    )
                else:
                    # Log an informational message that we're proceeding without authentication validation
                    logging.info("[TikTok] App ID or secret not available, skipping authentication validation")
                    # Return True since we can't validate but don't want to break functionality
                    return True
                
                if hasattr(response, 'code') and response.code == 0:
                    logging.info("[TikTok] API connection test successful")
                    return True
                else:
                    error_message = getattr(response, 'message', 'Unknown error')
                    logging.error(f"[TikTok] API connection test failed: {error_message}")
                    # Continue despite the error since the token might still work for some operations
                    return True
            except ApiException as e:
                logging.error(f"[TikTok] API connection test failed with exception: {str(e)}")
                # Continue despite the error since the token might still work for some operations
                return True
        except Exception as e:
            logging.error(f"[TikTok] API connection test failed with exception: {str(e)}")
            # Continue despite the error since the token might still work for some operations
            return True
    
    def is_initialized(self):
        """
        Check if the client is properly initialized.
        
        Returns:
            bool: True if correctly initialized
        """
        return self.access_token and self.advertiser_id
    
    def make_request(self, method, endpoint, params=None, data=None, files=None):
        """
        Make a request to the TikTok API using direct HTTP requests.
        
        This method is needed for operations not fully supported by the SDK.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (without the base URL)
            params: Query parameters
            data: Request body data
            files: Files to upload
            
        Returns:
            Response data or None if the request failed
        """
        try:
            # Import requests here to avoid dependency issues if it's not installed
            import requests
            
            url = f"{API_BASE_URL}/{endpoint.lstrip('/')}"
            
            # Ensure params has app_id and secret
            if params is None:
                params = {}
            
            # Add app_id and secret if not already present - these are required!
            if 'app_id' not in params:
                params['app_id'] = TIKTOK_APP_ID
            if 'secret' not in params:
                params['secret'] = TIKTOK_APP_SECRET
            
            # Log the request
            logging.info(f"[TikTok] Making {method} request to {url}")
            if params:
                # Create a copy of params to log without showing the secret
                log_params = params.copy()
                if 'secret' in log_params:
                    log_params['secret'] = '***HIDDEN***'
                logging.info(f"[TikTok] Params: {json.dumps(log_params)}")
            if data:
                logging.info(f"[TikTok] Data: {json.dumps(data)}")
            
            # Prepare headers based on the content type
            headers = self.headers.copy()
            
            # Make the request
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method.upper() == 'POST':
                if files:
                    # For file uploads, we need to remove Content-Type header
                    headers.pop("Content-Type", None)
                    response = requests.post(url, headers=headers, data=data, files=files)
                else:
                    response = requests.post(url, headers=headers, json=data, params=params)
            else:
                logging.error(f"[TikTok] Unsupported HTTP method: {method}")
                return None
            
            # Parse the response
            response_data = response.json()
            logging.info(f"[TikTok] Response status: {response.status_code}, code: {response_data.get('code')}")
            
            return response_data
        except ImportError:
            logging.error("[TikTok] The requests library is not installed. Please install it to use direct API requests.")
            return None
        except Exception as e:
            logging.error(f"[TikTok] Error making API request: {str(e)}")
            return None
    
    def get_identity_types(self):
        """
        Get available identity types for the advertiser.
        
        Returns:
            List of identity types or None if the request fails
        """
        if not self.is_initialized():
            logging.error("[TikTok] Client not initialized")
            return None
            
        try:
            # Use the SDK to get identity types
            logging.info(f"[TikTok] Getting identity types for advertiser ID: {self.advertiser_id}")
            
            # Use the Tool API to get advertiser info
            tool_api = ToolApi(self.api_client)
            
            # Make API request using the SDK
            response = tool_api.tool_action_category(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token
            )
            
            if hasattr(response, 'code') and response.code == 0 and hasattr(response, 'data'):
                return response.data
            else:
                error_message = getattr(response, 'message', 'Unknown error')
                logging.error(f"[TikTok] Failed to get identity types: {error_message}")
                return None
        except ApiException as e:
            logging.error(f"[TikTok] Failed to get identity types: {str(e)}")
            return None
        except Exception as e:
            logging.error(f"[TikTok] Failed to get identity types: {str(e)}")
            return None

    @property
    def account_details(self):
        """
        Get the details for the current advertiser account.
        
        Returns:
            dict: Account details from tiktok_config
        """
        if not self.advertiser_id:
            return None
            
        return get_tiktok_account_details(self.advertiser_id)

    def get_campaigns(self, status=None):
        """
        Get campaigns for the current advertiser account.
        
        Args:
            status: Filter campaigns by status
            
        Returns:
            List of campaign objects
        """
        try:
            # Create campaign API instance
            api_instance = CampaignCreationApi(self.api_client)
            
            # Prepare request parameters
            params = {
                'page_size': 100
            }
            
            # Add filtering if status is provided
            if status:
                from business_api_client.models.filtering_campaign_get import FilteringCampaignGet
                filtering = FilteringCampaignGet(status=status)
                params['filtering'] = filtering
            
            # Make API request
            logging.info(f"[TikTok] Getting campaigns for advertiser_id: {self.advertiser_id}")
            response = api_instance.campaign_get(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                **params
            )
            
            # Process response
            if hasattr(response, 'data') and hasattr(response.data, 'list'):
                logging.info(f"[TikTok] Retrieved {len(response.data.list)} campaigns")
                return response.data.list
            elif isinstance(response, dict) and 'data' in response and 'list' in response['data']:
                logging.info(f"[TikTok] Retrieved {len(response['data']['list'])} campaigns")
                return response['data']['list']
            else:
                logging.warning(f"[TikTok] No campaigns found or empty response")
                return []
        except ApiException as e:
            logging.error(f"[TikTok] Error getting campaigns: {str(e)}")
            return []
        except Exception as e:
            logging.error(f"[TikTok] Error getting campaigns: {str(e)}")
            return []

    def get_adgroups(self, campaign_ids=None, status=None):
        """
        Get ad groups for the current advertiser account.
        
        Args:
            campaign_ids: Filter ad groups by campaign IDs
            status: Filter ad groups by status
            
        Returns:
            List of ad group objects
        """
        try:
            # Create adgroup API instance
            api_instance = AdgroupApi(self.api_client)
            
            # Prepare request parameters
            params = {
                'page_size': 100
            }
            
            # Add filtering if campaign_ids or status is provided
            if campaign_ids or status:
                from business_api_client.models.filtering_adgroup_get import FilteringAdgroupGet
                
                filtering_params = {}
                if campaign_ids:
                    filtering_params['campaign_ids'] = campaign_ids if isinstance(campaign_ids, list) else [campaign_ids]
                if status:
                    filtering_params['status'] = status
                    
                params['filtering'] = FilteringAdgroupGet(**filtering_params)
            
            # Make API request
            logging.info(f"[TikTok] Getting ad groups for advertiser_id: {self.advertiser_id}")
            response = api_instance.adgroup_get(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                **params
            )
            
            # Process response
            if hasattr(response, 'data') and hasattr(response.data, 'list'):
                logging.info(f"[TikTok] Retrieved {len(response.data.list)} ad groups")
                return response.data.list
            elif isinstance(response, dict) and 'data' in response and 'list' in response['data']:
                logging.info(f"[TikTok] Retrieved {len(response['data']['list'])} ad groups")
                return response['data']['list']
            else:
                logging.warning(f"[TikTok] No ad groups found or empty response")
                return []
        except ApiException as e:
            logging.error(f"[TikTok] Error getting ad groups: {str(e)}")
            return []
        except Exception as e:
            logging.error(f"[TikTok] Error getting ad groups: {str(e)}")
            return [] 