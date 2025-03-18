"""
TikTok ads module.
Provides functionality for creating and managing TikTok ads.
"""
import logging
import time
from typing import Dict, List, Optional, Any, Set

from business_api_client.api.ad_api import AdApi
from business_api_client.api.adgroup_api import AdgroupApi

from app.services.tiktok.client import TikTokClient, SDK_AVAILABLE


class TikTokAdsMixin:
    """Mixin for TikTok ad functionality."""
    
    def create_ad(self, ad_data):
        """
        Create a new ad on TikTok
        
        Args:
            ad_data: Dictionary containing ad information
                
        Returns:
            Ad ID from TikTok
        """
        try:
            logging.info(f"[TikTok] Received ad creation request with data: {ad_data}")
            
            # First process any images
            image_ids = []
            video_ids = []
            
            logging.info(f"[TikTok] Processing assets...")
            
            if 'assets' in ad_data and ad_data['assets']:
                assets = ad_data['assets']
                logging.info(f"[TikTok] Found {len(assets)} assets in ad_data")
                
                for asset in assets:
                    asset_type = asset.get('type', '').lower()
                    asset_url = asset.get('url', '')
                    asset_name = asset.get('name', 'Unnamed asset')
                    
                    logging.info(f"[TikTok] Processing asset: {asset_name} (type: {asset_type}, URL: {asset_url})")
                    
                    if not asset_url:
                        logging.warning(f"[TikTok] Missing URL for asset: {asset_name}")
                        continue
                    
                    if asset_type == 'image':
                        # Upload the image and get the image ID
                        image_id = self._upload_image(asset_url)
                        if image_id:
                            logging.info(f"[TikTok] Successfully uploaded image: {asset_name}, image_id: {image_id}")
                            image_ids.append(image_id)
                            
                            # Add a small delay between uploads to ensure unique timestamps for generated images
                            time.sleep(0.5)
                        else:
                            logging.error(f"[TikTok] Failed to upload image: {asset_name}")
                    
                    elif asset_type == 'video':
                        # Upload the video and get the video ID
                        video_id = self._upload_video(asset_url)
                        if video_id:
                            logging.info(f"[TikTok] Successfully uploaded video: {asset_name}, video_id: {video_id}")
                            video_ids.append(video_id)
                        else:
                            logging.error(f"[TikTok] Failed to upload video: {asset_name}")
                    
                    else:
                        logging.warning(f"[TikTok] Unsupported asset type: {asset_type}")
            
            # Also check for direct asset IDs in ad_data (uploaded through a different process)
            if 'image_ids' in ad_data and ad_data['image_ids']:
                for img_id in ad_data['image_ids']:
                    if img_id not in image_ids:
                        image_ids.append(img_id)
                        logging.info(f"[TikTok] Added direct image_id: {img_id}")
                        
            if 'video_ids' in ad_data and ad_data['video_ids']:
                for vid_id in ad_data['video_ids']:
                    if vid_id not in video_ids:
                        video_ids.append(vid_id)
                        logging.info(f"[TikTok] Added direct video_id: {vid_id}")
            
            # Process multiple image assets for carousel ads
            if len(image_ids) >= 2:
                logging.info(f"[TikTok] Detected multiple images ({len(image_ids)}), considering for CAROUSEL_ADS format")
                
                # Set format to CAROUSEL_ADS if not explicitly set to something else
                if not ad_data.get('format'):
                    ad_format = 'CAROUSEL_ADS'
                    logging.info(f"[TikTok] Auto-setting ad format to CAROUSEL_ADS based on multiple images")
            
            # Construct the ad creation request
            ad_name = ad_data.get('name', f"Ad {int(time.time())}")
            # Also check if ad_name is provided in the user_data from step 4
            if not ad_name and 'user_data' in ad_data and isinstance(ad_data['user_data'], dict):
                ad_name = ad_data['user_data'].get('ad_name')
                if ad_name:
                    logging.info(f"[TikTok] Using ad_name from user_data: {ad_name}")
                    
            ad_text = ad_data.get('text', "Check out our product")
            adgroup_id = ad_data.get('adgroup_id')
            
            # Get adgroup details to check promotion_type
            adgroup_promotion_type = None
            skip_landing_page_url = False
            
            if adgroup_id:
                try:
                    logging.info(f"[TikTok] Getting adgroup details to check promotion_type for {adgroup_id}")
                    adgroup_api = AdgroupApi(self.api_client)
                    
                    response = adgroup_api.adgroup_get(
                        advertiser_id=self.advertiser_id,
                        filtering={"adgroup_ids": [adgroup_id]},
                        access_token=self.access_token
                    )
                    
                    if hasattr(response, 'data') and hasattr(response.data, 'list') and len(response.data.list) > 0:
                        adgroup = response.data.list[0]
                        
                        # Get promotion_type if available
                        if hasattr(adgroup, 'promotion_type'):
                            adgroup_promotion_type = adgroup.promotion_type
                            logging.info(f"[TikTok] Adgroup promotion_type: {adgroup_promotion_type}")
                            
                            # If promotion_type is APP, we don't need landing_page_url
                            if adgroup_promotion_type in ['APP_ANDROID', 'APP_IOS', 'APP']:
                                skip_landing_page_url = True
                                logging.info(f"[TikTok] Will skip landing_page_url for app promotion type: {adgroup_promotion_type}")
                except Exception as e:
                    logging.error(f"[TikTok] Error retrieving adgroup data: {e}")
            
            # The campaign_id may be used or needed for some processes
            campaign_id = ad_data.get('campaign_id')
            
            # Determine ad format based on provided format in ad_data or auto-detect from assets
            ad_format = ad_data.get('format')
            
            # Auto-detect format if not explicitly set
            if not ad_format:
                if video_ids and len(video_ids) > 0:
                    ad_format = 'SINGLE_VIDEO'
                    logging.info(f"[TikTok] Auto-detected ad format: SINGLE_VIDEO based on assets")
                elif image_ids and len(image_ids) >= 2:
                    ad_format = 'CAROUSEL_ADS'
                    logging.info(f"[TikTok] Auto-detected ad format: CAROUSEL_ADS based on {len(image_ids)} images")
                elif image_ids and len(image_ids) == 1:
                    ad_format = 'SINGLE_IMAGE'
                    logging.info(f"[TikTok] Auto-detected ad format: SINGLE_IMAGE based on assets")
                else:
                    logging.warning(f"[TikTok] Could not determine ad format from assets, defaulting to SINGLE_IMAGE")
                    ad_format = 'SINGLE_IMAGE'
            
            # Check if we have the right assets for the chosen format
            if ad_format == 'SINGLE_IMAGE' and not image_ids:
                logging.error("[TikTok] Cannot create single image ad without an image")
                return None
                
            if ad_format == 'SINGLE_VIDEO' and not video_ids:
                logging.error("[TikTok] Cannot create single video ad without a video")
                return None
            
            if ad_format == 'CAROUSEL_ADS' and len(image_ids) < 2:
                logging.warning(f"[TikTok] Carousel ads should have at least 2 images, found {len(image_ids)}")
                # Continue anyway, will be validated later
            
            # Prepare the creative object
            creative = {
                'ad_name': ad_name,
                'ad_text': ad_text,
                'ad_format': ad_format,
            }
            
            creative_material = {}
            
            # Add assets based on ad format
            if ad_format == 'SINGLE_IMAGE':
                if image_ids:
                    creative_material['material_id'] = image_ids[0]  # Use material_id instead of image_id
                    logging.info(f"[TikTok] Using material_id for single image ad: {image_ids[0]}")
            
            elif ad_format == 'SINGLE_VIDEO':
                if video_ids:
                    creative_material['material_id'] = video_ids[0]  # Use material_id instead of video_id
                    logging.info(f"[TikTok] Using material_id for single video ad: {video_ids[0]}")
                    
                    # Add thumbnail if available
                    if 'thumbnail_id' in ad_data:
                        creative_material['image_id'] = ad_data['thumbnail_id']
                        logging.info(f"[TikTok] Added thumbnail image_id: {ad_data['thumbnail_id']}")
            
            elif ad_format == 'CAROUSEL_ADS':
                # Process carousel images
                logging.info(f"[TikTok] Processing {len(image_ids)} images for carousel, IDs: {image_ids}")
                carousel_images = []
                for img_id in image_ids:
                    carousel_images.append({
                        'material_id': img_id,  # Using material_id instead of image_id
                        'ad_text': ad_text  # Same ad_text for all carousel images
                    })
                    logging.info(f"[TikTok] Added carousel image with material_id: {img_id}")
                
                if carousel_images:
                    creative_material['carousel_images'] = carousel_images
                    logging.info(f"[TikTok] Added {len(carousel_images)} images to carousel")
                    
                    # Add music_id for carousel ads if provided or use default
                    if 'music_id' in ad_data:
                        creative_material['music_id'] = ad_data['music_id']
                        logging.info(f"[TikTok] Added music_id from ad data: {ad_data['music_id']}")
                    else:
                        # Import the default music ID from config
                        from app.config.tiktok_config import DEFAULT_MUSIC_ID
                        creative_material['music_id'] = DEFAULT_MUSIC_ID
                        logging.info(f"[TikTok] Added default music_id: {DEFAULT_MUSIC_ID}")
            
            # Add required call to action - TikTok requires this
            creative_material['call_to_action'] = ad_data.get('call_to_action', 'LEARN_MORE')
            logging.info(f"[TikTok] Added call to action: {creative_material['call_to_action']}")
            
            # Add required landing page URL - TikTok requires this
            landing_page_url = ad_data.get('landing_page_url')
            
            # If no landing_page_url provided, try to get from account configuration
            if not landing_page_url and not skip_landing_page_url:
                from app.config.tiktok_config import get_tiktok_account_details
                account_details = get_tiktok_account_details(self.advertiser_id)
                if account_details and 'landing_page_url' in account_details:
                    landing_page_url = account_details['landing_page_url']
                    logging.info(f"[TikTok] Using landing_page_url from account configuration")
            
            # Use configured URL or default to example.com, but only if not skipping it
            if not skip_landing_page_url:
                creative_material['landing_page_url'] = landing_page_url or 'https://example.com'
                logging.info(f"[TikTok] Added landing page URL: {creative_material['landing_page_url']}")
                
                # Add URL type based on URL content
                url_type = 'NORMAL'  # Default
                if 'onelink' in creative_material['landing_page_url'] or 'app.link' in creative_material['landing_page_url']:
                    url_type = 'APP_INSTALL'
                    logging.info(f"[TikTok] Detected app install URL, setting landing_page_url_type: {url_type}")
                    
                    # For APP_INSTALL ads, download_type is required
                    creative_material['download_type'] = 'DOWNLOAD_NOW'
                    logging.info(f"[TikTok] Added download_type: DOWNLOAD_NOW for app install ad")
                    
                    # For APP_INSTALL ads, operating_systems is required
                    creative_material['operating_systems'] = ['IOS', 'ANDROID']
                    logging.info(f"[TikTok] Added operating_systems: ['IOS', 'ANDROID']")
                
                # Set the landing page URL type
                creative_material['landing_page_url_type'] = url_type
                logging.info(f"[TikTok] Added landing_page_url_type: {url_type}")
            else:
                # For App promotion types derived from adgroup, set fields appropriately
                url_type = 'APP_INSTALL'
                creative_material['landing_page_url_type'] = url_type
                creative_material['download_type'] = 'DOWNLOAD_NOW'
                creative_material['operating_systems'] = ['IOS', 'ANDROID']
                logging.info(f"[TikTok] Set app promotion fields without landing_page_url for {adgroup_promotion_type}")
            
            # Add identity information
            identity_id = ad_data.get('identity_id')
            identity_type = ad_data.get('identity_type') or self.get_identity_type()
            
            if identity_id:
                creative_material['identity_id'] = identity_id
                logging.info(f"[TikTok] Using identity_id: {identity_id}")
            if identity_type:
                creative_material['identity_type'] = identity_type
                logging.info(f"[TikTok] Using identity_type: {identity_type}")
                
                # For CUSTOMIZED_USER type, ensure we set the authorization status
                if identity_type == 'CUSTOMIZED_USER' and identity_id:
                    creative_material['identity_authorized'] = True
                    logging.info("[TikTok] Setting identity_authorized: True")
                    
                    # For CUSTOMIZED_USER identity type, display_name is required
                    display_name = ad_data.get('display_name') or "OKX Official"
                    creative_material['display_name'] = display_name
                    logging.info(f"[TikTok] Setting display_name: {display_name}")
            
            # Add app information for APP_INSTALL ads
            if url_type == 'APP_INSTALL' or adgroup_promotion_type in ['APP_ANDROID', 'APP_IOS', 'APP']:
                # Get app_id from config or ad_data
                app_id = ad_data.get('app_id')
                if not app_id:
                    from app.config.tiktok_config import get_tiktok_account_details
                    account_details = get_tiktok_account_details(self.advertiser_id)
                    
                    # If adgroup_promotion_type is available, use it to determine which app_id to use
                    if adgroup_promotion_type == 'APP_ANDROID':
                        app_id = account_details.get('app_id_android')
                        logging.info(f"[TikTok] Using Android app_id based on adgroup promotion_type: {app_id}")
                    elif adgroup_promotion_type == 'APP_IOS':
                        app_id = account_details.get('app_id_ios')
                        logging.info(f"[TikTok] Using iOS app_id based on adgroup promotion_type: {app_id}")
                    else:
                        # Default to either one if not specified
                        app_id = account_details.get('app_id_ios') or account_details.get('app_id_android')
                        logging.info(f"[TikTok] Using default app_id: {app_id}")
                
                if app_id:
                    creative_material['app_id'] = app_id
                    logging.info(f"[TikTok] Added app_id: {app_id}")
                    
                    # Add app_name
                    app_name = ad_data.get('app_name') or "OKX"
                    creative_material['app_name'] = app_name
                    logging.info(f"[TikTok] Added app_name: {app_name}")
                    
                    # Add store_id/page_id based on app_id type and promotion type
                    from app.config.tiktok_config import get_tiktok_account_details
                    account_details = get_tiktok_account_details(self.advertiser_id)
                    
                    if adgroup_promotion_type == 'APP_IOS' or (account_details and 'app_id_ios' in account_details and account_details['app_id_ios'] == app_id):
                        creative_material['page_id'] = app_id  # For iOS apps
                        logging.info(f"[TikTok] Added page_id for iOS app: {app_id}")
                    elif adgroup_promotion_type == 'APP_ANDROID' or (account_details and 'app_id_android' in account_details and account_details['app_id_android'] == app_id):
                        creative_material['store_id'] = app_id  # For Android apps
                        logging.info(f"[TikTok] Added store_id for Android app: {app_id}")
                    else:
                        # If we can't determine the platform, add both to be safe
                        creative_material['page_id'] = app_id
                        creative_material['store_id'] = app_id
                        logging.info(f"[TikTok] Added both page_id and store_id as fallback: {app_id}")
            
            # Add the creative material to the creative
            creative['creative_material'] = creative_material
            
            # If we still don't have a material_id, try to check if there are direct image_ids to use
            if 'material_id' not in creative_material and ad_format in ['SINGLE_IMAGE', 'SINGLE_VIDEO']:
                logging.warning(f"[TikTok] No material_id found in creative_material, checking for direct image/video ID assignments")
                
                # Try to find any image_ids or video_ids directly in ad_data
                if 'image_ids' in ad_data and ad_data['image_ids'] and ad_format == 'SINGLE_IMAGE':
                    creative_material['material_id'] = ad_data['image_ids'][0]
                    logging.info(f"[TikTok] Using directly provided image_id as material_id: {creative_material['material_id']}")
                elif 'video_ids' in ad_data and ad_data['video_ids'] and ad_format == 'SINGLE_VIDEO':
                    creative_material['material_id'] = ad_data['video_ids'][0]
                    logging.info(f"[TikTok] Using directly provided video_id as material_id: {creative_material['material_id']}")
            
            # Get adset data to copy over any relevant parameters
            if adgroup_id and not creative_material.get('material_id') and not creative_material.get('carousel_images'):
                try:
                    logging.info(f"[TikTok] Attempting to copy creative parameters from adset {adgroup_id}")
                    adgroup_api = AdgroupApi(self.api_client)
                    
                    response = adgroup_api.adgroup_get(
                        advertiser_id=self.advertiser_id,
                        filtering={"adgroup_ids": [adgroup_id]},
                        access_token=self.access_token
                    )
                    
                    if hasattr(response, 'data') and hasattr(response.data, 'list') and len(response.data.list) > 0:
                        adgroup = response.data.list[0]
                        logging.info(f"[TikTok] Retrieved adgroup data: {adgroup}")
                        
                        # Copy relevant parameters from adgroup if available
                        if hasattr(adgroup, 'creatives') and len(adgroup.creatives) > 0:
                            adgroup_creative = adgroup.creatives[0]
                            logging.info(f"[TikTok] Found creative in adgroup: {adgroup_creative}")
                            
                            # Apply the same ad_format as the adgroup if not set
                            if hasattr(adgroup_creative, 'ad_format'):
                                creative['ad_format'] = adgroup_creative.ad_format
                                logging.info(f"[TikTok] Using ad_format from adgroup: {creative['ad_format']}")
                            
                            # Copy over the material_id or carousel_images if needed
                            if hasattr(adgroup_creative, 'creative_material'):
                                adgroup_material = adgroup_creative.creative_material
                                
                                if hasattr(adgroup_material, 'material_id') and not creative_material.get('material_id'):
                                    creative_material['material_id'] = adgroup_material.material_id
                                    logging.info(f"[TikTok] Using material_id from adgroup: {creative_material['material_id']}")
                                
                                if hasattr(adgroup_material, 'carousel_images') and not creative_material.get('carousel_images'):
                                    # We just want to copy the structure, not the actual images
                                    logging.info(f"[TikTok] Found carousel structure in adgroup")
                                    
                                    # If we have image_ids but no carousel_images, create them using our image_ids
                                    if image_ids and len(image_ids) > 0:
                                        carousel_images = []
                                        for img_id in image_ids:
                                            carousel_images.append({
                                                'material_id': img_id,
                                                'ad_text': ad_text
                                            })
                                            logging.info(f"[TikTok] Added carousel image with material_id: {img_id}")
                                        
                                        if carousel_images:
                                            creative_material['carousel_images'] = carousel_images
                                            logging.info(f"[TikTok] Created carousel images based on uploaded images")
                except Exception as e:
                    logging.error(f"[TikTok] Error retrieving adgroup data: {e}")
            
            # Prepare the final request
            request_data = {
                'adgroup_id': adgroup_id,
                'creative': creative,
                'advertiser_id': self.advertiser_id,
                'status': ad_data.get('status', 'DISABLE')
            }
            
            # Final validation
            logging.info(f"[TikTok] Final ad create request data: {request_data}")
            
            if not creative.get('ad_text'):
                creative['ad_text'] = "Check out our product"
                logging.info(f"[TikTok] Added missing ad_text at creative level")
            
            if not creative_material.get('ad_text'):
                creative_material['ad_text'] = creative['ad_text']
                logging.info(f"[TikTok] Added missing ad_text in creative_material")
            
            # Check carousel images - make sure we have at least 2 for carousel ads
            if 'carousel_images' in creative_material:
                for img in creative_material['carousel_images']:
                    if not img.get('ad_text'):
                        img['ad_text'] = creative['ad_text']
                        logging.info(f"[TikTok] Added missing ad_text to carousel image")
                
                # TikTok requires at least 2 images for carousel ads
                if len(creative_material['carousel_images']) < 2:
                    logging.error(f"[TikTok] Not enough images for carousel ad, need at least 2, got {len(creative_material['carousel_images'])}")
                    # This will likely fail, but continue anyway
                    
                # Let's make sure we don't exceed TikTok's limit
                if len(creative_material['carousel_images']) > 35:
                    logging.warning(f"[TikTok] Too many images for carousel ad, maximum is 35, got {len(creative_material['carousel_images'])}")
                    creative_material['carousel_images'] = creative_material['carousel_images'][:35]
                    logging.info(f"[TikTok] Reduced to 35 images for carousel ad")
            
            # Create the API instance
            ad_api = AdApi(self.api_client)
            
            # Make the API call
            logging.info(f"[TikTok] Creating ad with request: {request_data}")
            
            response = ad_api.ad_create(
                access_token=self.access_token,
                body=request_data
            )
            
            # Process response
            logging.info(f"[TikTok] Ad creation response type: {type(response)}")
            
            if isinstance(response, dict):
                # Dictionary response format
                logging.info(f"[TikTok] Ad creation response: {response}")
                
                if response.get('code') == 0 and response.get('data') and response['data'].get('ad_id'):
                    ad_id = response['data']['ad_id']
                    logging.info(f"[TikTok] Successfully created ad: {ad_id}")
                    return ad_id
                else:
                    error_code = response.get('code', 'Unknown code')
                    error_msg = response.get('message', 'Unknown error')
                    logging.error(f"[TikTok] Ad creation failed with code {error_code}: {error_msg}")
            
            elif hasattr(response, 'code') and hasattr(response, 'message'):
                # Object response format
                logging.info(f"[TikTok] Ad creation response code: {response.code}")
                
                if response.code == 0 and hasattr(response, 'data') and hasattr(response.data, 'ad_id'):
                    ad_id = response.data.ad_id
                    logging.info(f"[TikTok] Successfully created ad: {ad_id}")
                    return ad_id
                else:
                    error_msg = response.message
                    logging.error(f"[TikTok] Ad creation failed: {error_msg}")
            
            else:
                logging.error(f"[TikTok] Unexpected response format: {response}")
            
            return None
            
        except Exception as e:
            logging.error(f"[TikTok] Error creating ad: {e}")
            return None
    
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