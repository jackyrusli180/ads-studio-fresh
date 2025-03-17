"""
TikTok API service for interacting with the TikTok Ads API.
Uses the official TikTok Business API Client SDK.
"""
import os
import logging
from typing import Dict, List, Optional, Any, Union

# Import centralized configuration
from app.config import credentials

# Import the TikTok SDK
try:
    import business_api_client
    from business_api_client import Configuration, ApiClient
    from business_api_client.api.campaign_creation_api import CampaignCreationApi
    from business_api_client.api.adgroup_api import AdgroupApi
    from business_api_client.api.ad_api import AdApi
    logging.info("Successfully imported TikTok SDK")
    SDK_AVAILABLE = True
except ImportError as e:
    logging.error(f"Failed to import TikTok SDK. Error: {e}")
    SDK_AVAILABLE = False


class TikTokService:
    """Service for interacting with the TikTok Ads API using the official SDK."""
    
    def __init__(self, access_token: Optional[str] = None, advertiser_id: Optional[str] = None):
        """
        Initialize the TikTok service with credentials.
        
        Args:
            access_token: TikTok API access token
            advertiser_id: TikTok advertiser account ID
        """
        self.access_token = access_token or credentials.TIKTOK_ACCESS_TOKEN
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
            import requests
            
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
                    'package_name': app.get('package_name'),
                    'app_id': app.get('app_id'),
                    'platform': app.get('platform')
                }
                apps.append(app_info)
            
            return apps
                
        except Exception as e:
            logging.error(f"Error retrieving app list: {e}")
            return []
    
    def create_ad(self, ad_data: Dict[str, Any]) -> str:
        """
        Create a new ad in TikTok Ads.
        
        Args:
            ad_data: Dictionary containing ad details including:
                - name: Ad name
                - adgroup_id: ID of the AdGroup to place the ad in
                - creative_type: 'IMAGE' or 'VIDEO'
                - assets: List of asset objects with 'url', 'type', etc.
                
        Returns:
            String ID of the created ad
        """
        if not SDK_AVAILABLE or not self.api_client:
            logging.error("TikTok SDK not available or not initialized")
            raise ValueError("TikTok SDK not available")
            
        try:
            logging.info(f"Creating TikTok ad with data: {ad_data}")
            
            # Create ad API instance
            from business_api_client.api.ad_api import AdApi
            api_instance = AdApi(self.api_client)
            
            # Check if we have image or video assets
            assets = ad_data.get('assets', [])
            
            if not assets:
                raise ValueError("No assets provided for ad creation")
            
            # Filter assets by type
            image_assets = [a for a in assets if a.get('type') == 'image']
            video_assets = [a for a in assets if a.get('type') == 'video']
            
            # Upload assets to TikTok
            creative_materials = []
            
            if image_assets:
                # For each image, upload to TikTok's servers
                for image_asset in image_assets[:1]:  # Just use the first image for simplicity
                    image_url = image_asset.get('url')
                    if not image_url:
                        continue
                    
                    # Upload the image
                    image_id = self._upload_image(image_url)
                    
                    if image_id:
                        creative_materials.append({
                            'image_id': image_id
                        })
            
            if video_assets:
                # For each video, upload to TikTok's servers
                for video_asset in video_assets[:1]:  # Just use the first video for simplicity
                    video_url = video_asset.get('url')
                    if not video_url:
                        continue
                    
                    # Upload the video
                    video_id = self._upload_video(video_url)
                    
                    if video_id:
                        creative_materials.append({
                            'video_id': video_id
                        })
            
            if not creative_materials:
                raise ValueError("Failed to upload any assets to TikTok")
            
            # Prepare the ad creation request
            ad_create_body = {
                'advertiser_id': self.advertiser_id,
                'adgroup_id': ad_data.get('adgroup_id'),
                'creatives': [{
                    'ad_name': ad_data.get('name', 'New TikTok Ad'),
                    'ad_format': 'SINGLE_IMAGE' if image_assets else 'SINGLE_VIDEO',
                    'creative_material': creative_materials[0],
                    'call_to_action': 'LEARN_MORE',
                    'ad_text': ad_data.get('headline', 'Check this out!')
                }]
            }
            
            # Make the API request
            logging.info(f"Calling TikTok API to create ad: {ad_create_body}")
            response = api_instance.ad_create(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                body=ad_create_body
            )
            
            # Process response
            if hasattr(response, 'code') and response.code == 0:
                # Object response format
                ad_id = response.data.ad_ids[0] if hasattr(response.data, 'ad_ids') and response.data.ad_ids else None
            elif isinstance(response, dict) and response.get('code') == 0:
                # Dictionary response format
                ad_id = response.get('data', {}).get('ad_ids', [None])[0]
            else:
                logging.error(f"Unexpected response from TikTok API: {response}")
                raise ValueError("Failed to create TikTok ad")
            
            if not ad_id:
                raise ValueError("No ad ID returned from TikTok API")
                
            logging.info(f"Successfully created TikTok ad with ID: {ad_id}")
            return ad_id
            
        except Exception as e:
            logging.error(f"Error creating TikTok ad: {e}")
            raise
    
    def _upload_image(self, image_url: str) -> str:
        """
        Upload an image to TikTok's servers
        
        Args:
            image_url: URL of the image to upload
            
        Returns:
            Image ID from TikTok
        """
        try:
            import tempfile
            import requests
            import os
            import time
            from business_api_client.api.file_api import FileApi
            
            # Download the image to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as temp_file:
                response = requests.get(image_url, stream=True)
                response.raise_for_status()
                
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)
                    
                temp_file_path = temp_file.name
            
            try:
                # Create file API instance
                api_instance = FileApi(self.api_client)
                
                # Prepare the file upload
                file_info = {
                    'advertiser_id': self.advertiser_id,
                    'file_name': f'image_{int(time.time())}.jpg',
                    'file_type': 'IMAGE',
                    'upload_type': 'UPLOAD_BY_FILE'
                }
                
                # Make the API request
                response = api_instance.file_image_ad_upload(
                    advertiser_id=self.advertiser_id,
                    access_token=self.access_token,
                    file=temp_file_path,
                    **file_info
                )
                
                # Clean up the temporary file
                os.unlink(temp_file_path)
                
                # Process response
                if hasattr(response, 'code') and response.code == 0:
                    # Object response format
                    image_id = response.data.image_id if hasattr(response.data, 'image_id') else None
                elif isinstance(response, dict) and response.get('code') == 0:
                    # Dictionary response format
                    image_id = response.get('data', {}).get('image_id')
                else:
                    logging.error(f"Unexpected response from TikTok API: {response}")
                    return None
                
                return image_id
                
            except Exception as e:
                # Clean up in case of error
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                raise
                
        except Exception as e:
            logging.error(f"Error uploading image to TikTok: {e}")
            return None
    
    def _upload_video(self, video_url: str) -> str:
        """
        Upload a video to TikTok's servers
        
        Args:
            video_url: URL of the video to upload
            
        Returns:
            Video ID from TikTok
        """
        try:
            import tempfile
            import requests
            import os
            import time
            from business_api_client.api.file_api import FileApi
            
            # Download the video to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                response = requests.get(video_url, stream=True)
                response.raise_for_status()
                
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)
                    
                temp_file_path = temp_file.name
            
            try:
                # Create file API instance
                api_instance = FileApi(self.api_client)
                
                # Prepare the file upload
                file_info = {
                    'advertiser_id': self.advertiser_id,
                    'file_name': f'video_{int(time.time())}.mp4',
                    'file_type': 'VIDEO',
                    'upload_type': 'UPLOAD_BY_FILE'
                }
                
                # Make the API request
                response = api_instance.file_video_ad_upload(
                    advertiser_id=self.advertiser_id,
                    access_token=self.access_token,
                    file=temp_file_path,
                    **file_info
                )
                
                # Clean up the temporary file
                os.unlink(temp_file_path)
                
                # Process response
                if hasattr(response, 'code') and response.code == 0:
                    # Object response format
                    video_id = response.data.video_id if hasattr(response.data, 'video_id') else None
                elif isinstance(response, dict) and response.get('code') == 0:
                    # Dictionary response format
                    video_id = response.get('data', {}).get('video_id')
                else:
                    logging.error(f"Unexpected response from TikTok API: {response}")
                    return None
                
                return video_id
                
            except Exception as e:
                # Clean up in case of error
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                raise
                
        except Exception as e:
            logging.error(f"Error uploading video to TikTok: {e}")
            return None 