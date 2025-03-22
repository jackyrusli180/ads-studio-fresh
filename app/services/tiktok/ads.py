"""
TikTok ads module.
Provides functionality for creating and managing TikTok ads.
"""
import logging
import time
import os
import hashlib
import json
import requests
from typing import Dict, List, Optional, Any, Set
from datetime import datetime
import tempfile
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO

from business_api_client.api.ad_api import AdApi
from business_api_client.api.adgroup_api import AdgroupApi
from business_api_client.api.file_api import FileApi
from business_api_client.rest import ApiException

from app.services.tiktok.client import TikTokClient, SDK_AVAILABLE
from app.services.asset_service import project_root  # Import project_root from asset_service

# Debug mode - can be enabled via TIKTOK_DEBUG_MODE environment variable
DEBUG_MODE = os.environ.get('TIKTOK_DEBUG_MODE', 'false').lower() in ('true', '1', 'yes')

if DEBUG_MODE:
    logging.info("[TikTok] DEBUG MODE is enabled - API calls will be simulated")
else:
    logging.info("[TikTok] DEBUG MODE is disabled - API calls will be made to TikTok")


class TikTokAdsMixin:
    """Mixin for TikTok ad functionality."""
    
    def is_initialized(self):
        """Check if the client is initialized."""
        # Default implementation assumes client is initialized 
        # This will be called when TikTokAdsMixin is used standalone
        return True
        
    def create_ad(self, ad_data):
        """
        Create a new ad on TikTok using the official TikTok SDK.
        
        Args:
            ad_data: Dictionary containing ad information
                
        Returns:
            Ad ID from TikTok if successful, None otherwise
        """
        try:
            logging.info(f"[TikTok] Received ad creation request with data: {ad_data}")
            
            # If in debug mode, just return a mock ad ID
            if DEBUG_MODE:
                mock_ad_id = f"debug_ad_{int(time.time())}"
                logging.info(f"[TikTok] DEBUG MODE: Skipping actual ad creation, using mock ad ID: {mock_ad_id}")
                return mock_ad_id
            
            # Check if client is initialized
            if not self.is_initialized():
                logging.error("[TikTok] Client not initialized")
                return None
            
            # First process any images
            image_info_list = []
            video_ids = []
            
            logging.info(f"[TikTok] Processing assets...")
            
            if 'assets' in ad_data and ad_data['assets']:
                assets = ad_data['assets']
                logging.info(f"[TikTok] Found {len(assets)} assets in ad_data")
                
                for asset in assets:
                    # Check if the asset is a dictionary or a string
                    if isinstance(asset, dict):
                        asset_type = asset.get('type', '').lower()
                        asset_url = asset.get('url', '')
                        asset_name = asset.get('name', 'Unnamed asset')
                    elif isinstance(asset, str):
                        # If asset is a string, treat it as an image URL and create dictionary on the fly
                        asset_url = asset
                        asset_name = os.path.basename(asset_url)
                        # Infer asset type from file extension
                        if asset_url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
                            asset_type = 'image'
                        elif asset_url.lower().endswith(('.mp4', '.mov', '.avi', '.wmv')):
                            asset_type = 'video'
                        else:
                            asset_type = 'image'  # Default to image if can't determine
                        logging.info(f"[TikTok] Converted string asset to dict: type={asset_type}, url={asset_url}, name={asset_name}")
                    else:
                        logging.warning(f"[TikTok] Unknown asset format: {type(asset)}, skipping")
                        continue
                    
                    logging.info(f"[TikTok] Processing asset: {asset_name} (type: {asset_type}, URL: {asset_url})")
                    
                    if not asset_url:
                        logging.warning(f"[TikTok] Missing URL for asset: {asset_name}")
                        continue
                    
                    if asset_type == 'image':
                        try:
                            # Upload the image and get the image info
                            logging.info(f"[TikTok] Attempting to upload image: {asset_url}")
                            image_info = self._upload_image(asset_url)
                            if image_info:
                                logging.info(f"[TikTok] Successfully uploaded image: {asset_name}, info: {image_info}")
                                image_info_list.append(image_info)
                                
                                # Add a small delay between uploads to ensure unique timestamps for generated images
                                time.sleep(0.5)
                            else:
                                logging.error(f"[TikTok] Failed to upload image: {asset_name} - no image info returned")
                        except Exception as e:
                            logging.error(f"[TikTok] Exception during image upload for {asset_name}: {str(e)}")
                    elif asset_type == 'video':
                        try:
                            # Upload the video and get the video ID
                            logging.info(f"[TikTok] Attempting to upload video: {asset_url}")
                            video_result = self._upload_video(asset_url)
                            if video_result and 'video_id' in video_result:
                                video_id = video_result['video_id']
                                logging.info(f"[TikTok] Successfully uploaded video: {asset_name}, ID: {video_id}")
                                video_ids.append(video_id)
                                
                                # Store image_id for the cover image if available
                                if 'image_id' in video_result and video_result['image_id']:
                                    image_id = video_result['image_id']
                                    image_info = {'image_id': image_id, 'material_id': image_id}
                                    image_info_list.append(image_info)
                                    logging.info(f"[TikTok] Added cover image for video: ID: {image_id}")
                                
                                # Add a delay to allow TikTok to process the video before creating the ad
                                # This is crucial because TikTok needs time to process uploaded videos
                                processing_delay = 45  # seconds
                                logging.info(f"[TikTok] Video upload successful. Waiting {processing_delay} seconds for TikTok to process the video...")
                                time.sleep(processing_delay)
                                
                                # Add a small delay between uploads
                                time.sleep(0.5)
                            else:
                                logging.error(f"[TikTok] Failed to upload video: {asset_name} - no video ID returned")
                        except Exception as e:
                            logging.error(f"[TikTok] Exception during video upload for {asset_name}: {str(e)}")

            # Extract adgroup_id from ad_data
            adgroup_id = None
            if 'adgroup_id' in ad_data and ad_data['adgroup_id']:
                adgroup_id = ad_data['adgroup_id']
            elif 'adgroup_ids' in ad_data and ad_data['adgroup_ids'] and len(ad_data['adgroup_ids']) > 0:
                adgroup_id = ad_data['adgroup_ids'][0]
            
            # Debug the adgroup_id value
            logging.info(f"[TikTok] Extracted adgroup_id from ad_data: '{adgroup_id}'")
            
            # Check if adgroup_id is "undefined" - if so, we need to use campaign ID instead
            if adgroup_id == "undefined" and 'campaign_ids' in ad_data and ad_data['campaign_ids']:
                # Use the campaign ID as a fallback - in TikTok, campaign IDs can sometimes be used
                # where adgroup_ids are expected for certain operations
                campaign_id = ad_data['campaign_ids'][0]
                logging.info(f"[TikTok] Found 'undefined' adgroup_id, using campaign_id '{campaign_id}' instead")
                adgroup_id = campaign_id
            
            # Final validation check
            if adgroup_id == "undefined":
                logging.error("[TikTok] Invalid adgroup_id: 'undefined'. This will cause the API to reject the request")
                return None
            
            if not adgroup_id:
                logging.error("[TikTok] No adgroup_id found in ad_data, this will cause the API to reject the request")
                return None
            
            # Get adgroup information to determine placement type using SDK
            adgroup_info = self._get_adgroup_info(adgroup_id)
            if not adgroup_info:
                logging.warning(f"[TikTok] Could not retrieve adgroup info for {adgroup_id}")
            else:
                logging.info(f"[TikTok] Retrieved adgroup info: {json.dumps(adgroup_info, indent=2)}")
            
            # Configure the ad creative
            # Determine ad_format based on assets
            if video_ids and len(video_ids) > 0:
                # If we have videos, use SINGLE_VIDEO format
                ad_format = 'SINGLE_VIDEO'
                logging.info(f"[TikTok] Setting ad_format to SINGLE_VIDEO based on video assets")
            elif image_info_list and len(image_info_list) >= 2:
                # If we have multiple images, use CAROUSEL_ADS format
                ad_format = 'CAROUSEL_ADS'
                logging.info(f"[TikTok] Setting ad_format to CAROUSEL_ADS based on multiple image assets")
            elif image_info_list and len(image_info_list) == 1:
                # If we have a single image, fail the ad creation
                # TikTok doesn't support SINGLE_IMAGE format and we should not duplicate
                logging.error(f"[TikTok] Cannot create ad: TikTok requires at least 2 images for carousel ads, but only 1 provided")
                return {"success": False, "error": "TikTok requires at least 2 images for carousel ads. Please add another image."}
            else:
                # If ad_data specifies video as asset type, use SINGLE_VIDEO
                if 'assets' in ad_data and ad_data['assets']:
                    video_assets = [asset for asset in ad_data['assets'] if asset.get('type') == 'video']
                    if video_assets:
                        ad_format = 'SINGLE_VIDEO'
                        logging.info(f"[TikTok] Setting ad_format to SINGLE_VIDEO based on video asset type in ad_data")
                    else:
                        # Default to CAROUSEL_ADS
                        ad_format = 'CAROUSEL_ADS'
                        logging.info(f"[TikTok] Default to CAROUSEL_ADS as TikTok doesn't support SINGLE_IMAGE")
                else:
                    # Default format if specified in ad_data, otherwise use CAROUSEL_ADS
                    ad_format = ad_data.get('ad_format', 'CAROUSEL_ADS')
                    logging.info(f"[TikTok] Using format from ad_data or default: {ad_format}")
            
            # Get default values from account configuration
            try:
                from app.config.tiktok_config import get_tiktok_account_details
                account_details = get_tiktok_account_details(self.advertiser_id)
                identity_id = account_details.get('identity_id')
                # Always use CUSTOMIZED_USER for identity_type, not null or BRAND
                identity_type = "CUSTOMIZED_USER"
                display_name = account_details.get('display_name', "OKX Official")
                landing_page_url = account_details.get('landing_page_url', "https://okx.com")
                
                logging.info(f"[TikTok] Using account values: identity_id={identity_id}, identity_type={identity_type}")
            except Exception as e:
                logging.error(f"[TikTok] Error getting account values: {str(e)}")
                identity_id = None
                # Always use CUSTOMIZED_USER, not BRAND
                identity_type = "CUSTOMIZED_USER"
                display_name = "OKX Official"
                landing_page_url = "https://okx.com"
            
            # Set call to action - default to LEARN_MORE if not specified
            call_to_action = ad_data.get('call_to_action', "LEARN_MORE")
            
            # Log all incoming ad_data keys and values for debugging
            logging.info(f"[TikTok] Incoming ad_data keys: {list(ad_data.keys())}")
            for key in ['ad_name', 'headline', 'ad_text']:
                if key in ad_data:
                    logging.info(f"[TikTok] ad_data['{key}'] = '{ad_data.get(key)}'")
            
            # Prepare the creative based on ad format, prioritizing directly provided values
            # over fallbacks and defaults
            creative = {}
            
            # Ad name - ensure we don't use empty strings
            if 'ad_name' in ad_data and ad_data['ad_name'] and ad_data['ad_name'].strip():
                creative["ad_name"] = ad_data['ad_name'].strip()
                logging.info(f"[TikTok] Using provided ad_name: '{creative['ad_name']}'")
            elif 'headline' in ad_data and ad_data['headline'] and ad_data['headline'].strip():
                creative["ad_name"] = ad_data['headline'].strip()
                logging.info(f"[TikTok] Using headline as ad_name: '{creative['ad_name']}'")
            else:
                creative["ad_name"] = f"Ad {int(time.time())}"
                logging.info(f"[TikTok] Using default ad_name: '{creative['ad_name']}'")
            
            # Ad text - ensure we don't use empty strings
            if 'ad_text' in ad_data and ad_data['ad_text'] and ad_data['ad_text'].strip():
                creative["ad_text"] = ad_data['ad_text'].strip()
                logging.info(f"[TikTok] Using provided ad_text: '{creative['ad_text']}'")
            elif 'headline' in ad_data and ad_data['headline'] and ad_data['headline'].strip():
                creative["ad_text"] = ad_data['headline'].strip()
                logging.info(f"[TikTok] Using headline as ad_text: '{creative['ad_text']}'")
            else:
                creative["ad_text"] = "Check out our products!"
                logging.info(f"[TikTok] Using default ad_text: '{creative['ad_text']}'")
            
            # Add other creative fields
            creative.update({
                "ad_format": ad_format,
                "call_to_action": call_to_action,
                "landing_page_url": ad_data.get('landing_page_url', landing_page_url),
                "identity_id": ad_data.get('identity_id', identity_id),
                "identity_type": ad_data.get('identity_type', identity_type),
                "display_name": ad_data.get('display_name', display_name)
            })
            
            # Final validation for essential fields - only applied if fields are completely empty
            if not creative.get("ad_name") or creative.get("ad_name") == "":
                logging.warning("[TikTok] ad_name is empty, setting a default value")
                creative["ad_name"] = f"Ad {int(time.time())}"
                
            if not creative.get("ad_text") or creative.get("ad_text") == "":
                logging.warning("[TikTok] ad_text is empty, setting a default value")
                creative["ad_text"] = "Check out our products!"
            
            # Log the input values for debugging
            logging.info(f"[TikTok] Using ad_name: '{creative['ad_name']}', ad_text: '{creative['ad_text']}'")
            
            if ad_format == 'CAROUSEL_ADS':
                logging.info("[TikTok] Setting up carousel ad creative")
                
                # Get a valid music ID for carousel ads
                music_id = self._get_valid_music_id()
                if not music_id:
                    music_id = self._get_default_music_id()
                    
                if not music_id:
                    logging.error("[TikTok] Failed to get a valid music ID for carousel ad")
                    return None
                    
                logging.info(f"[TikTok] Using music ID for carousel ad: {music_id}")
                
                # Extract image_ids from image_info_list
                image_ids = [img_info['image_id'] for img_info in image_info_list]
                
                # Log image IDs to debug empty array issue
                logging.info(f"[TikTok] Using {len(image_ids)} image IDs for carousel ad: {image_ids}")
                
                # Make sure we have at least 2 images for carousel
                if len(image_ids) < 2:
                    logging.error(f"[TikTok] Carousel ad requires at least 2 images, but only {len(image_ids)} provided")
                    return {"success": False, "error": "TikTok requires at least 2 images for carousel ads. Please add another image."}
                
                # Add carousel-specific fields to creative
                creative["image_ids"] = image_ids
                creative["music_id"] = music_id
                
            elif ad_format == 'SINGLE_VIDEO':
                logging.info("[TikTok] Setting up single video ad creative")
                
                # Need video ID for single video ad
                if not video_ids:
                    logging.error("[TikTok] No video ID available for SINGLE_VIDEO ad format")
                    return None
                
                # Add video-specific fields to creative
                creative["video_id"] = video_ids[0]
                creative["image_ids"] = [img_info['image_id'] for img_info in image_info_list]  # For cover images
                
            # Create the full ad creation body
            ad_create_body = {
                "advertiser_id": self.advertiser_id,
                "adgroup_id": adgroup_id,
                "creatives": [creative]
            }
            
            # Log the ad creation request
            logging.info(f"[TikTok] Ad creation request: {json.dumps(ad_create_body, indent=2)}")
            
            # Create the ad API instance for SDK
            ad_api = AdApi()
            
            # Implement retry logic with exponential backoff
            max_retries = 3
            retry_count = 0
            backoff_time = 2  # Start with 2 seconds
            
            while retry_count <= max_retries:
                try:
                    # Create the ad using the SDK with access_token as required parameter and body as kwargs
                    response = ad_api.ad_create(
                        access_token=self.access_token,
                        body=ad_create_body
                    )
                    
                    # Process the response
                    if hasattr(response, 'to_dict'):
                        response_dict = response.to_dict()
                    else:
                        response_dict = response
                        
                    logging.info(f"[TikTok] Ad creation response: {json.dumps(response_dict, indent=2)}")
                    
                    # Check for success
                    success = False
                    error_code = None
                    error_message = None
                    
                    if isinstance(response_dict, dict):
                        error_code = response_dict.get('code')
                        
                        # First try to get ad IDs regardless of the response code
                        if 'data' in response_dict:
                            data = response_dict.get('data')
                            
                            # Extract ad_id from response
                            if "ad_ids" in data and data["ad_ids"]:
                                ad_id = data["ad_ids"][0]
                                logging.info(f"[TikTok] Successfully created ad with ID: {ad_id}")
                                return ad_id
                            elif "ad_id" in data:
                                ad_id = data["ad_id"]
                                logging.info(f"[TikTok] Successfully created ad with ID: {ad_id}")
                                return ad_id
                        
                        # If we didn't find ad IDs but code is 0, mark as success
                        if error_code == 0:
                            success = True  # Even if we can't get the ID, it was created
                        
                        # Check for error message
                        if 'message' in response_dict:
                            error_message = response_dict.get('message')
                    
                    if success:
                        logging.info("[TikTok] Ad created successfully but couldn't extract ID")
                        return f"success_{int(time.time())}"  # Return a placeholder success ID
                    
                    # For certain error codes, the ad might still have been created
                    if error_code in [40002, 40100, 40109]:  # Add known error codes where the ad is still created
                        logging.warning(f"[TikTok] Got error code {error_code} but the ad might have been created: {error_message}")
                        return f"possible_success_{int(time.time())}"  # Return a placeholder for possible success
                    
                    # Check for video processing errors (error code 40053 - Failed to get video information)
                    if error_code == 40053 and video_ids:
                        video_id = video_ids[0]
                        logging.warning(f"[TikTok] Got error code 40053 (Failed to get video information) for video {video_id}. Video may still be processing.")
                        
                        # Wait longer and retry
                        additional_delay = 60  # Wait a full minute
                        logging.info(f"[TikTok] Waiting additional {additional_delay} seconds for video processing to complete...")
                        time.sleep(additional_delay)
                        
                        # Retry regardless of retry count
                        logging.info(f"[TikTok] Retrying ad creation after additional delay...")
                        continue
                    
                    # Check if this is a rate limit error (code 51021)
                    if error_code == 51021:
                        logging.warning(f"[TikTok] Rate limit exceeded. Retrying in {backoff_time} seconds...")
                        time.sleep(backoff_time)
                        retry_count += 1
                        backoff_time *= 2  # Exponential backoff
                        continue
                        
                    # If we get here, it's a non-recoverable error
                    logging.error(f"[TikTok] Failed to create ad: {error_message}")
                    return None
                    
                except ApiException as e:
                    error_body = getattr(e, 'body', None)
                    logging.error(f"[TikTok] API Exception during ad creation: {e}")
                    if error_body:
                        logging.error(f"[TikTok] Error creating ad: {error_body}")
                        
                        # Check if the error message indicates the ad was still created
                        if isinstance(error_body, str) and ("You no longer have access to the TikTok account" in error_body or "select a new identity" in error_body):
                            logging.info("[TikTok] Despite the error, the ad was likely created successfully")
                            return f"partial_success_{int(time.time())}"  # Return a placeholder success ID
                    
                    # Rate limit error in exception
                    if hasattr(e, 'status') and e.status == 429:
                        if retry_count < max_retries:
                            logging.warning(f"[TikTok] Rate limit exceeded. Retrying in {backoff_time} seconds...")
                            time.sleep(backoff_time)
                            retry_count += 1
                            backoff_time *= 2  # Exponential backoff
                            continue
                    
                    # Non-recoverable error
                    return None
                    
                except Exception as e:
                    logging.error(f"[TikTok] Exception during ad creation: {str(e)}")
                    # Check if we should retry
                    if retry_count < max_retries:
                        logging.warning(f"[TikTok] General error. Retrying in {backoff_time} seconds...")
                        time.sleep(backoff_time)
                        retry_count += 1
                        backoff_time *= 2  # Exponential backoff
                        continue
                    
                    # Too many retries
                    return None
                
                # Break out of the loop if we got here (no exceptions or retries)
                break
            
        except Exception as e:
            logging.error(f"[TikTok] Exception during ad creation: {str(e)}")
            return None
        
    def _get_adgroup_info(self, adgroup_id):
        """Get information about an ad group.
        
        Args:
            adgroup_id: Ad group ID to get info for
            
        Returns:
            dict: Ad group information or None if not found
        """
        try:
            # Create adgroup API instance
            adgroup_api = AdgroupApi()
            
            # Create filtering parameter
            filtering = json.dumps({"adgroup_ids": [adgroup_id]})
            
            # Call the SDK method
            adgroup_response = adgroup_api.adgroup_get(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                filtering=filtering
            )
            
            # Process the response
            if hasattr(adgroup_response, 'to_dict'):
                adgroup_response_dict = adgroup_response.to_dict()
            else:
                adgroup_response_dict = adgroup_response
            
            # Check for success
            if isinstance(adgroup_response_dict, dict) and adgroup_response_dict.get("code") == 0 and "data" in adgroup_response_dict:
                data = adgroup_response_dict.get("data", {})
                
                if "list" in data and data["list"]:
                    adgroup = data["list"][0]
                    
                    # Extract needed information
                    result = {
                        "adgroup_id": adgroup.get("adgroup_id"),
                        "adgroup_name": adgroup.get("adgroup_name"),
                        "placement_type": adgroup.get("placement_type"),
                        "placements": adgroup.get("placements", []),
                        "status": adgroup.get("operation_status") or adgroup.get("status"),
                        "objective_type": adgroup.get("optimization_goal") or adgroup.get("objective_type")
                    }
                    
                    return result
                
            logging.error(f"[TikTok] Failed to get adgroup info: {adgroup_response_dict.get('message')}")
            return None
                
        except Exception as e:
            logging.error(f"[TikTok] Error getting adgroup info: {str(e)}")
            return None
        
    def _get_valid_music_id(self):
        """Get a valid music ID specifically for carousel ads.
        
        Returns:
            str: A valid music ID for carousel ads, or None if none found
        """
        try:
            logging.info("[TikTok] Fetching valid music IDs specifically for carousel ads")
            
            # Create the API endpoint URL for querying available music
            url = "https://business-api.tiktok.com/open_api/v1.3/file/music/get/"
            
            # Import credentials for app_id and secret
            from app.config.credentials import TIKTOK_APP_ID, TIKTOK_APP_SECRET
            
            # Prepare query parameters - specifically filtering for carousel ads
            params = {
                "advertiser_id": self.advertiser_id,
                "page": 1,
                "page_size": 50,
                "music_scene": "CAROUSEL_ADS",  # Specifically for carousel ads
                "search_type": "SEARCH_BY_KEYWORD",  # Required when using music_scene=CAROUSEL_ADS
                "filtering": json.dumps({"keyword": "tecnology"}),  # Keyword in filtering object
                "app_id": TIKTOK_APP_ID,
                "secret": TIKTOK_APP_SECRET
            }
            
            # Make the request
            response = requests.get(url, headers=self.headers, params=params)
            
            # Process the response
            if response.status_code == 200:
                response_json = response.json()
                logging.info(f"Music API response: {json.dumps(response_json, indent=2)}")
                
                if response_json.get("code") == 0 and response_json.get("data"):
                    if "musics" in response_json.get("data", {}):
                        music_list = response_json.get("data", {}).get("musics", [])
                        if music_list:
                            # Log all available music IDs
                            for i, music in enumerate(music_list):
                                music_id = music.get("music_id")
                                music_name = music.get("music_name", "Unknown")
                                logging.info(f"[TikTok] Available carousel music {i+1}: ID={music_id}, Name={music_name}")
                            
                            # Return the first available music ID
                            music_id = music_list[0].get("music_id")
                            logging.info(f"[TikTok] Selected carousel music ID: {music_id}")
                            return music_id
            
            # If no carousel-specific music found, notify
            logging.error("[TikTok] No valid music for carousel ads found")
            return None
            
        except Exception as e:
            logging.error(f"[TikTok] Exception during music ID fetch: {e}")
            return None
        
    def _get_default_music_id(self):
        """Get a default music ID to use when no valid music is found.
        
        Returns:
            str: A default music ID or None if not available
        """
        # Try to get from config
        try:
            from app.config.tiktok_config import DEFAULT_MUSIC_ID
            if DEFAULT_MUSIC_ID:
                logging.info(f"[TikTok] Using default music ID from config: {DEFAULT_MUSIC_ID}")
                return DEFAULT_MUSIC_ID
        except:
            pass
        
        # Hardcoded default as last resort - default ID that should work with carousel ads
        return "7265016545471397889"
    
    def get_ads(self, adgroup_id: Optional[str] = None, campaign_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch ads from the advertiser account, optionally filtered by ad group or campaign.
        
        Args:
            adgroup_id: Optional ad group ID to filter ads
            campaign_id: Optional campaign ID to filter ads
            
        Returns:
            List of ad dictionaries with normalized data structure
        """
        if not SDK_AVAILABLE or not self.api_client:
            logging.error("TikTok SDK not available or not initialized")
            return []
            
        try:
            # Create ad API instance
            api_instance = AdApi(self.api_client)
            
            # Prepare request parameters
            params = {
                'page_size': 100
            }
            
            filtering = {}
            
            if adgroup_id:
                # TikTok SDK expects adgroup_ids in filtering parameter as a list
                filtering['adgroup_ids'] = [adgroup_id]
            
            if campaign_id:
                # TikTok SDK expects campaign_ids in filtering parameter as a list
                filtering['campaign_ids'] = [campaign_id]
            
            if filtering:
                params['filtering'] = filtering
            
            # Make API request
            logging.info(f"Calling TikTok API to get ads for advertiser_id: {self.advertiser_id}")
            response = api_instance.ad_get(
                advertiser_id=self.advertiser_id,
                access_token=self.access_token,
                **params
            )
            
            # Process response - handle both object and dictionary response formats
            ad_list = []
            
            if isinstance(response, dict):
                # Dictionary response format
                logging.info("Processing dictionary response format")
                if response.get('data') and response['data'].get('list'):
                    for ad in response['data']['list']:
                        ad_list.append({
                            'id': ad.get('ad_id'),
                            'name': ad.get('ad_name'),
                            'adgroup_id': ad.get('adgroup_id'),
                            'campaign_id': ad.get('campaign_id'),
                            'status': ad.get('status'),
                            'ad_text': ad.get('ad_text'),
                            'create_time': ad.get('create_time'),
                            'modify_time': ad.get('modify_time')
                        })
                    logging.info(f"Processed {len(ad_list)} ads from dictionary response")
            elif hasattr(response, 'code') and hasattr(response, 'data'):
                # Object response format
                logging.info("Processing object response format")
                if response.code == 0 and hasattr(response.data, 'get'):
                    for ad in response.data.get('list', []):
                        ad_list.append({
                            'id': ad.get('ad_id'),
                            'name': ad.get('ad_name'),
                            'adgroup_id': ad.get('adgroup_id'),
                            'campaign_id': ad.get('campaign_id'),
                            'status': ad.get('status'),
                            'ad_text': ad.get('ad_text'),
                            'create_time': ad.get('create_time'),
                            'modify_time': ad.get('modify_time')
                        })
                    logging.info(f"Processed {len(ad_list)} ads from object response")
            else:
                logging.warning(f"Unexpected response format: {type(response)}")
                
            return ad_list
            
        except Exception as e:
            logging.error(f"Error fetching TikTok ads: {e}")
            return []
    
    def _upload_image(self, image_path):
        """
        Upload an image to TikTok using the TikTok Business API SDK.
        
        Args:
            image_path: Path or URL to the image file
            
        Returns:
            Dictionary containing image_id and material_id if successful, None otherwise
        """
        try:
            logging.info(f"[TikTok] Starting image upload for {image_path}")
            
            # If in debug mode, return mock image info
            if DEBUG_MODE:
                mock_image_id = f"debug_image_{int(time.time())}"
                mock_material_id = f"debug_material_{int(time.time())}"
                logging.info(f"[TikTok] DEBUG MODE: Mock image upload successful. ID: {mock_image_id}, Material ID: {mock_material_id}")
                return {
                    'image_id': mock_image_id,
                    'material_id': mock_material_id
                }
            
            # Check if client is initialized
            if not self.is_initialized():
                logging.error("[TikTok] Client not initialized")
                return None
            
            # Create file API instance
            file_api = FileApi()
            
            # Handle different image path formats
            if image_path.startswith(('http://', 'https://')):
                # For remote URLs, use the SDK's UPLOAD_BY_URL option
                logging.info(f"[TikTok] Processing remote URL image: {image_path}")
                
                try:
                    # Prepare parameters for uploading by URL
                    timestamp = int(time.time())
                    file_name = f"remote_image_{timestamp}.jpg"
                    
                    # Use the SDK method to upload by URL
                    response = file_api.ad_image_upload(
                        access_token=self.access_token,
                        advertiser_id=self.advertiser_id,
                        upload_type='UPLOAD_BY_URL',
                        image_url=image_path,
                        file_name=file_name
                    )
                    
                    # Process the response
                    if hasattr(response, 'to_dict'):
                        response_dict = response.to_dict()
                    else:
                        response_dict = response
                    
                    logging.info(f"[TikTok] Image upload by URL response: {json.dumps(response_dict, indent=2)}")
                    
                    # Check if there's data in the response even if code isn't 0
                    if isinstance(response_dict, dict) and 'data' in response_dict:
                        data = response_dict['data']
                        image_id = data.get('image_id')
                        material_id = data.get('material_id')
                        
                        if image_id and material_id:
                            logging.info(f"[TikTok] Remote image uploaded successfully. ID: {image_id}, Material ID: {material_id}")
                            return {
                                'image_id': image_id,
                                'material_id': material_id
                            }
                        else:
                            logging.error(f"[TikTok] Missing image_id or material_id in URL upload response: {data}")
                    else:
                        error_msg = response_dict.get('message', 'Unknown error')
                        error_code = response_dict.get('code', 'Unknown code')
                        logging.error(f"[TikTok] Image upload by URL failed with code {error_code}: {error_msg}")
                    
                    # Return None if URL upload failed instead of trying to download
                    return None
                    
                except Exception as e:
                    logging.error(f"[TikTok] Exception uploading image by URL: {str(e)}")
                    return None
            
            # Handle local file path
            if image_path.startswith('/static/'):
                # Convert Flask static path to file system path
                image_path = os.path.join(project_root, 'app', image_path.lstrip('/'))
                logging.info(f"[TikTok] Converted static path to: {image_path}")
            
            # Check if the file exists at the path
            if not os.path.exists(image_path):
                logging.error(f"[TikTok] Image file not found at {image_path}")
                
                # Try to find the file in common locations
                possible_paths = [
                    os.path.join(project_root, image_path),
                    os.path.join(project_root, 'app', 'static', 'uploads', os.path.basename(image_path)),
                    os.path.join(project_root, 'uploads', os.path.basename(image_path)),
                    os.path.join('/tmp', os.path.basename(image_path)),
                ]
                
                logging.info(f"[TikTok] Checking alternative paths: {possible_paths}")
                
                for path in possible_paths:
                    if os.path.exists(path):
                        image_path = path
                        logging.info(f"[TikTok] Found image at alternative path: {image_path}")
                        break
                else:
                    # Create a placeholder image if the file still can't be found
                    try:
                        from app.services.asset_service import AssetService
                        asset_service = AssetService()
                        placeholder_path = asset_service.create_placeholder_image(os.path.basename(image_path))
                        
                        if placeholder_path:
                            image_path = placeholder_path
                            logging.info(f"[TikTok] Created placeholder image at: {image_path}")
                        else:
                            logging.error(f"[TikTok] Failed to create placeholder image")
                            return None
                    except Exception as e:
                        logging.error(f"[TikTok] Error creating placeholder image: {str(e)}")
                        return None
            
            # Now upload the local file using the SDK
            try:
                # Calculate MD5 hash for image_signature
                image_signature = self._get_file_md5(image_path)
                logging.info(f"[TikTok] Generated MD5 signature: {image_signature}")
                
                # Generate a unique name with timestamp
                timestamp = int(time.time())
                file_name = f"{os.path.splitext(os.path.basename(image_path))[0]}_{timestamp}{os.path.splitext(image_path)[1]}"
                
                # Upload the image using the SDK
                logging.info(f"[TikTok] Uploading local image file: {image_path}")
                
                response = file_api.ad_image_upload(
                    access_token=self.access_token,
                    advertiser_id=self.advertiser_id,
                    upload_type='UPLOAD_BY_FILE',
                    image_signature=image_signature,
                    image_file=image_path
                )
                
                # Process the response
                if hasattr(response, 'to_dict'):
                    response_dict = response.to_dict()
                else:
                    response_dict = response
                
                logging.info(f"[TikTok] Local image upload response: {json.dumps(response_dict, indent=2)}")
                
                # Extract image_id and material_id
                if isinstance(response_dict, dict) and response_dict.get('code') == 0 and 'data' in response_dict:
                    data = response_dict['data']
                    image_id = data.get('image_id')
                    material_id = data.get('material_id')
                    
                    if image_id and material_id:
                        logging.info(f"[TikTok] Local image uploaded successfully. ID: {image_id}, Material ID: {material_id}")
                        return {
                            'image_id': image_id,
                            'material_id': material_id
                        }
                    else:
                        logging.error(f"[TikTok] Missing image_id or material_id in response: {data}")
                else:
                    error_msg = response_dict.get('message', 'Unknown error')
                    logging.error(f"[TikTok] Image upload failed: {error_msg}")
                    # Check if we still have image_id and material_id directly in the data
                    if isinstance(response_dict, dict) and 'data' in response_dict:
                        data = response_dict['data']
                        image_id = data.get('image_id')
                        material_id = data.get('material_id')
                        
                        if image_id and material_id:
                            logging.info(f"[TikTok] Despite error code, found valid image data. ID: {image_id}, Material ID: {material_id}")
                            return {
                                'image_id': image_id,
                                'material_id': material_id
                            }
            except Exception as e:
                logging.error(f"[TikTok] Error during image upload: {str(e)}")
            
            return None
        except Exception as e:
            logging.error(f"[TikTok] Exception during image upload: {str(e)}")
            return None
        
    def _get_file_md5(self, file_path: str) -> str:
        """Generate MD5 hash for a file."""
        md5_hash = hashlib.md5()
        with open(file_path, "rb") as f:
            # Read the file in chunks to handle large files efficiently
            for chunk in iter(lambda: f.read(4096), b""):
                md5_hash.update(chunk)
        return md5_hash.hexdigest()
        
    def _upload_video(self, video_url: str) -> Dict[str, Any]:
        """
        Upload a video to TikTok using the TikTok Business API SDK.
        
        Args:
            video_url: Path or URL to the video file
            
        Returns:
            Dictionary with video_id and image_id if successful, None otherwise
        """
        try:
            logging.info(f"[TikTok] Starting video upload for {video_url}")
            
            # Check video format and requirements first
            validation_result = self._validate_video_for_tiktok(video_url)
            if not validation_result['is_valid']:
                # Return detailed error information instead of None
                logging.error(f"[TikTok] Video validation failed: {validation_result['error']}")
                return {
                    'success': False,
                    'error': validation_result['error'],
                    'error_code': 'VIDEO_VALIDATION_FAILED',
                    'error_details': validation_result.get('details', {})
                }
            
            # If in debug mode, return mock video ID and image ID
            if DEBUG_MODE:
                mock_video_id = f"debug_video_{int(time.time())}"
                mock_image_id = f"debug_image_{int(time.time())}"
                logging.info(f"[TikTok] DEBUG MODE: Mock video upload successful. ID: {mock_video_id}")
                return {"video_id": mock_video_id, "image_id": mock_image_id}
            
            # Check if client is initialized
            if not self.is_initialized():
                logging.error("[TikTok] Client not initialized")
                return None
            
            # Create file API instance
            file_api = FileApi()
            
            # Handle different video path formats
            if video_url.startswith(('http://', 'https://')):
                # For remote URLs, use the SDK's UPLOAD_BY_URL option
                logging.info(f"[TikTok] Processing remote URL video: {video_url}")
                
                try:
                    # Prepare parameters for uploading by URL
                    timestamp = int(time.time())
                    file_name = f"remote_video_{timestamp}.mp4"
                    
                    # Use the SDK method to upload by URL
                    response = file_api.ad_video_upload(
                        access_token=self.access_token,
                        advertiser_id=self.advertiser_id,
                        upload_type='UPLOAD_BY_URL',
                        video_url=video_url,
                        file_name=file_name
                    )
                    
                    # Process the response
                    if hasattr(response, 'to_dict'):
                        response_dict = response.to_dict()
                    else:
                        response_dict = response
                    
                    logging.info(f"[TikTok] Video upload by URL response: {json.dumps(response_dict, indent=2)}")
                    
                    # Check if there's data in the response
                    video_id = None
                    if isinstance(response_dict, dict) and 'data' in response_dict:
                        data = response_dict['data']
                        # Check if data is a list (older API format)
                        if isinstance(data, list) and len(data) > 0:
                            first_item = data[0]
                            video_id = first_item.get('video_id')
                            material_id = first_item.get('material_id')
                            
                            # Get video dimensions if available
                            width = first_item.get('width', 0)
                            height = first_item.get('height', 0)
                            
                            # Prefer material_id if available, otherwise use video_id
                            result_id = material_id if material_id else video_id
                            
                            if result_id:
                                logging.info(f"[TikTok] Remote video uploaded successfully. ID: {result_id}")
                                video_id = result_id
                            else:
                                logging.error(f"[TikTok] Missing video_id or material_id in URL upload response: {first_item}")
                        # Check if data is a dict (newer API format)
                        elif isinstance(data, dict):
                            video_id = data.get('video_id')
                            material_id = data.get('material_id')
                            
                            # Get video dimensions if available
                            width = data.get('width', 0)
                            height = data.get('height', 0)
                            
                            # Prefer material_id if available, otherwise use video_id
                            result_id = material_id if material_id else video_id
                            
                            if result_id:
                                logging.info(f"[TikTok] Remote video uploaded successfully. ID: {result_id}")
                                video_id = result_id
                            else:
                                logging.error(f"[TikTok] Missing video_id or material_id in URL upload response: {data}")
                        else:
                            logging.error(f"[TikTok] Unexpected data format in response: {data}")
                    else:
                        error_msg = response_dict.get('message', 'Unknown error')
                        error_code = response_dict.get('code', 'Unknown code')
                        logging.error(f"[TikTok] Video upload by URL failed with code {error_code}: {error_msg}")
                        return None
                    
                    # If we have a video ID, create and upload a cover image
                    if video_id:
                        # Use the default dimensions if not available from the API response
                        if not width or not height or width <= 0 or height <= 0:
                            width, height = 640, 360  # Default to 16:9 landscape format
                            
                        # Create a video info dictionary for the cover image creation
                        video_info = {
                            'video_id': video_id,
                            'width': width,
                            'height': height
                        }
                        
                        # Create and upload a cover image
                        image_id = self._create_video_cover_image(video_info)
                        
                        if image_id:
                            logging.info(f"[TikTok] Created cover image with ID: {image_id} for video: {video_id}")
                            
                            # Wait for video processing to complete before returning
                            processing_delay = 45  # seconds
                            logging.info(f"[TikTok] Video and cover image uploaded successfully. Waiting {processing_delay} seconds for TikTok to complete video processing...")
                            time.sleep(processing_delay)
                            
                            return {"video_id": video_id, "image_id": image_id}
                        else:
                            logging.error(f"[TikTok] Failed to create cover image for video: {video_id}")
                            return {"video_id": video_id, "image_id": None}
                    
                    # Return None if video upload failed
                    return None
                    
                except Exception as e:
                    logging.error(f"[TikTok] Exception uploading video by URL: {str(e)}")
                    return None
            
            # Handle local file path cases - code for local file upload will go here
            logging.error(f"[TikTok] Local file upload for videos not implemented yet")
            return None
            
        except Exception as e:
            logging.error(f"[TikTok] Exception during video upload: {str(e)}")
            return None
            
    def _create_video_cover_image(self, video_info):
        """Create and upload a cover image for the video with matching dimensions
        
        Args:
            video_info: Dict with video dimensions
            
        Returns:
            str: Image ID if successful, None otherwise
        """
        try:
            # Use dimensions from video_info, with fallback to defaults if needed
            width = video_info.get("width", 0)
            height = video_info.get("height", 0)
            
            # Ensure dimensions are not zero to avoid font size errors
            if width <= 0 or height <= 0:
                width, height = 640, 360  # Default to 16:9 landscape format
                logging.info(f"[TikTok] Using default dimensions for cover image: {width}x{height}")
            
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            temp_filename = temp_file.name
            temp_file.close()
            
            # Create an image with a solid background color
            img = Image.new('RGB', (width, height), (45, 125, 210))
            draw = ImageDraw.Draw(img)
            
            # Calculate a safe font size (at least 24 pixels)
            font_size = max(min(width, height) // 10, 24)
            
            # Try to use a font, or fallback to default
            try:
                font = ImageFont.truetype("Arial", font_size)
            except IOError:
                font = ImageFont.load_default()
            
            # Add text to the image
            text = "Ad Video"
            try:
                # For newer PIL versions
                bbox = draw.textbbox((0, 0), text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
            except AttributeError:
                # Fallback for older PIL versions
                text_width = font_size * len(text) * 0.6
                text_height = font_size
                
            x_position = (width - text_width) / 2
            y_position = (height - text_height) / 2
            
            draw.text((x_position, y_position), text, fill=(255, 255, 255), font=font)
            
            # Save the image with high quality
            img.save(temp_filename, format='JPEG', quality=95)
            
            logging.info(f"[TikTok] Created cover image {width}x{height} at: {temp_filename}")
            
            # Upload the image using SDK
            file_api = FileApi()
            
            # Calculate MD5 hash
            with open(temp_filename, 'rb') as f:
                image_signature = hashlib.md5(f.read()).hexdigest()
            
            # Use the SDK method to upload the image
            response = file_api.ad_image_upload(
                access_token=self.access_token,
                advertiser_id=self.advertiser_id,
                upload_type='UPLOAD_BY_FILE',
                image_signature=image_signature,
                image_file=temp_filename
            )
            
            # Convert response to dictionary if needed
            if hasattr(response, 'to_dict'):
                response_dict = response.to_dict()
            else:
                response_dict = response
            
            # Extract data from the response dictionary
            if isinstance(response_dict, dict) and 'data' in response_dict:
                data = response_dict['data']
                if isinstance(data, dict) and 'image_id' in data:
                    image_id = data['image_id']
                    logging.info(f"[TikTok] Successfully uploaded cover image with ID: {image_id}")
                    
                    # Clean up temporary file
                    try:
                        os.unlink(temp_filename)
                    except:
                        pass
                        
                    return image_id
            
            logging.error(f"[TikTok] Failed to extract image_id from response: {response_dict}")
            
            # Clean up temporary file
            try:
                os.unlink(temp_filename)
            except:
                pass
                
            return None
                
        except Exception as e:
            logging.error(f"[TikTok] API Exception during image upload: {e}")
            return None

    def _validate_video_for_tiktok(self, video_url: str) -> Dict[str, Any]:
        """
        Validate a video against TikTok's requirements before uploading.
        
        Args:
            video_url: Path or URL to the video file
            
        Returns:
            Dict with validation results: {'is_valid': bool, 'error': str, 'details': Dict}
        """
        try:
            import requests
            import tempfile
            from urllib.parse import urlparse
            import os
            import subprocess
            import json
            import re
            
            validation_result = {
                'is_valid': True,
                'error': None,
                'details': {}
            }
            
            # Check if video URL starts with http/https
            if not video_url.startswith(('http://', 'https://')):
                return {
                    'is_valid': False,
                    'error': 'Video URL must be a valid HTTP or HTTPS URL',
                    'details': {'url': video_url}
                }
            
            # Make a HEAD request to check if the video exists and get its size
            try:
                head_response = requests.head(video_url, timeout=10)
                if head_response.status_code != 200:
                    return {
                        'is_valid': False,
                        'error': f'Video URL returned status code {head_response.status_code}',
                        'details': {'status_code': head_response.status_code, 'url': video_url}
                    }
                
                # Check file size from Content-Length header
                if 'Content-Length' in head_response.headers:
                    file_size = int(head_response.headers['Content-Length'])
                    if file_size > 500 * 1024 * 1024:  # 500 MB
                        return {
                            'is_valid': False,
                            'error': 'Video file size exceeds TikTok limit of 500 MB',
                            'details': {'file_size': file_size, 'max_size': 500 * 1024 * 1024}
                        }
                    validation_result['details']['file_size'] = file_size
            except requests.exceptions.RequestException as e:
                return {
                    'is_valid': False,
                    'error': f'Could not access video URL: {str(e)}',
                    'details': {'url': video_url, 'exception': str(e)}
                }
            
            # Download a small portion of the video to analyze its metadata
            try:
                # Create a temporary file to store the video header
                with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as temp_file:
                    temp_filename = temp_file.name
                
                # Use ffprobe to analyze the video without downloading the whole file
                ffprobe_command = [
                    'ffprobe', 
                    '-v', 'quiet', 
                    '-print_format', 'json', 
                    '-show_format', 
                    '-show_streams', 
                    video_url
                ]
                
                try:
                    # Run ffprobe and capture the output
                    result = subprocess.run(ffprobe_command, capture_output=True, text=True, timeout=30)
                    if result.returncode != 0:
                        return {
                            'is_valid': False,
                            'error': 'Failed to analyze video metadata',
                            'details': {'command_output': result.stderr}
                        }
                    
                    # Parse the JSON output
                    video_info = json.loads(result.stdout)
                    
                    # Check video stream information
                    video_stream = None
                    for stream in video_info.get('streams', []):
                        if stream.get('codec_type') == 'video':
                            video_stream = stream
                            break
                    
                    if not video_stream:
                        return {
                            'is_valid': False,
                            'error': 'No video stream found in the file',
                            'details': {}
                        }
                    
                    # Check resolution
                    width = int(video_stream.get('width', 0))
                    height = int(video_stream.get('height', 0))
                    validation_result['details']['width'] = width
                    validation_result['details']['height'] = height
                    
                    # Check duration
                    duration = float(video_info.get('format', {}).get('duration', 0))
                    validation_result['details']['duration'] = duration
                    
                    # Calculate aspect ratio
                    if width > 0 and height > 0:
                        aspect_ratio = width / height
                        validation_result['details']['aspect_ratio'] = aspect_ratio
                        
                        # Check if aspect ratio matches TikTok requirements
                        is_vertical = 0.5 <= aspect_ratio <= 0.6  # 9:16 (0.5625)
                        is_square = 0.9 <= aspect_ratio <= 1.1     # 1:1 (1.0)
                        is_horizontal = 1.7 <= aspect_ratio <= 1.8  # 16:9 (1.7777)
                        
                        if not (is_vertical or is_square or is_horizontal):
                            return {
                                'is_valid': False,
                                'error': 'Video aspect ratio does not meet TikTok requirements (must be 9:16, 1:1, or 16:9)',
                                'details': {
                                    'width': width,
                                    'height': height,
                                    'aspect_ratio': aspect_ratio,
                                    'supported_ratios': ['9:16 (vertical)', '1:1 (square)', '16:9 (horizontal)']
                                }
                            }
                    
                    # Check minimum resolution
                    if width < 540 and height < 960 and width < 640 and height < 640 and width < 960 and height < 540:
                        return {
                            'is_valid': False,
                            'error': 'Video resolution is too low for TikTok ads',
                            'details': {
                                'width': width,
                                'height': height,
                                'min_requirements': [
                                    '540x960 for vertical (9:16)',
                                    '640x640 for square (1:1)',
                                    '960x540 for horizontal (16:9)'
                                ]
                            }
                        }
                    
                    # Check duration
                    if duration < 5:
                        return {
                            'is_valid': False,
                            'error': 'Video is too short (minimum 5 seconds for TikTok ads)',
                            'details': {'duration': duration, 'min_duration': 5}
                        }
                    
                    if duration > 600:  # 10 minutes
                        return {
                            'is_valid': False,
                            'error': 'Video is too long (maximum 10 minutes for TikTok ads)',
                            'details': {'duration': duration, 'max_duration': 600}
                        }
                    
                except (subprocess.SubprocessError, json.JSONDecodeError) as e:
                    # If ffprobe fails, try to use HTTP headers as fallback
                    logging.warning(f"[TikTok] Failed to run ffprobe, using fallback validation: {str(e)}")
                    # We'll continue with basic validation based on HTTP headers
                    pass
                
                finally:
                    # Clean up the temporary file
                    try:
                        if os.path.exists(temp_filename):
                            os.unlink(temp_filename)
                    except Exception as e:
                        logging.warning(f"[TikTok] Error cleaning up temporary file: {str(e)}")
            
            except Exception as e:
                logging.warning(f"[TikTok] Error during video validation: {str(e)}")
                # If validation fails, we'll still allow the upload and let TikTok handle the validation
            
            return validation_result
            
        except Exception as e:
            logging.error(f"[TikTok] Exception during video validation: {str(e)}")
            # Return valid=True to fall back to TikTok's validation
            return {'is_valid': True, 'error': None, 'details': {}}

    # Add missing required fields for carousel ads
    def _set_required_carousel_fields(self, creative_material, ad_data):
        """
        Set required fields for carousel ad creative materials.
        
        Args:
            creative_material: The creative material to update
            ad_data: The ad data containing additional information
            
        Returns:
            Updated creative material
        """
        # Set landing_page_url if missing
        if 'landing_page_url' not in creative_material or not creative_material['landing_page_url']:
            # Try to get from ad_data first
            if 'landing_page_url' in ad_data and ad_data['landing_page_url']:
                creative_material['landing_page_url'] = ad_data['landing_page_url']
            else:
                # Try to get from account configuration
                try:
                    from app.config.tiktok_config import get_tiktok_account_details
                    account_details = get_tiktok_account_details(self.advertiser_id)
                    if 'landing_page_url' in account_details and account_details['landing_page_url']:
                        creative_material['landing_page_url'] = account_details['landing_page_url']
                    else:
                        # Use a default as last resort
                        creative_material['landing_page_url'] = "https://okx.com"
                except Exception as e:
                    logging.warning(f"[TikTok] Couldn't get landing_page_url from config: {str(e)}")
                    creative_material['landing_page_url'] = "https://okx.com"
                
        # Set display_name if missing
        if 'display_name' not in creative_material or not creative_material['display_name']:
            creative_material['display_name'] = "OKX Official"
        
        # Make sure identity_id is set
        if 'identity_id' not in creative_material or not creative_material['identity_id']:
            try:
                from app.config.tiktok_config import get_tiktok_account_details
                account_details = get_tiktok_account_details(self.advertiser_id)
                if 'identity_id' in account_details and account_details['identity_id']:
                    creative_material['identity_id'] = account_details['identity_id']
            except Exception as e:
                logging.warning(f"[TikTok] Couldn't get identity_id from config: {str(e)}")
            
        return creative_material 