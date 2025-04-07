from __future__ import print_function
import business_api_client
from business_api_client.rest import ApiException
from business_api_client import CampaignCreationApi
from business_api_client import AdgroupApi
from business_api_client import AdAcoApi
from business_api_client import FileApi
import requests
from datetime import datetime
import hashlib
import os
import ffmpeg
import json
import tiktok_account_config

def initialize_api():
    """Initialize TikTok Ads API"""
    access_token = 'b8586d78d2a3d2ae1b542c1e8c99c0e3c82bdaaf'  # Long-term access token
    
    # Initialize the API configuration
    configuration = business_api_client.Configuration()
    configuration.access_token = access_token
    configuration.host = "https://business-api.tiktok.com"
    
    # Create API client
    api_client = business_api_client.ApiClient(configuration)
    
    # Initialize specific API instances
    apis = {
        'campaign_api': CampaignCreationApi(api_client),
        'adgroup_api': AdgroupApi(api_client),
        'ad_api': AdAcoApi(api_client),
        'file_api': FileApi(api_client)
    }
    
    return apis

def upload_image(apis, advertiser_id, image_path):
    """Upload image and return image ID and URL"""
    try:
        print(f"Uploading image: {image_path}")
        
        # Verify file exists
        if not os.path.exists(image_path):
            error_msg = f"File not found: {image_path}"
            print(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Get file info for debugging
        file_size = os.path.getsize(image_path)
        print(f"File size: {file_size / 1024:.2f} KB")
        
        # Read image file
        with open(image_path, 'rb') as f:
            image_data = f.read()
        
        # Calculate MD5 hash
        image_signature = hashlib.md5(image_data).hexdigest()
        
        # Add timestamp to filename to avoid duplicates
        original_filename = os.path.basename(image_path)
        file_base, file_ext = os.path.splitext(original_filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_filename = f"{file_base}_{timestamp}{file_ext}"
        
        print(f"Using unique filename: {unique_filename}")
        
        # API endpoint and headers
        url = "https://business-api.tiktok.com/open_api/v1.3/file/image/ad/upload/"
        headers = {
            "Access-Token": apis['file_api'].api_client.configuration.access_token
        }
        
        # Prepare multipart form-data
        files = {
            "image_file": (unique_filename, image_data, 'application/octet-stream')
        }
        data = {
            "advertiser_id": str(advertiser_id),
            "upload_type": "UPLOAD_BY_FILE",
            "image_signature": image_signature,
            "file_name": unique_filename
        }
        
        print(f"Prepared request with file: {unique_filename}, signature: {image_signature}")
        
        # Make request
        response = requests.post(url, headers=headers, data=data, files=files)
        response_data = response.json()
        
        print(f"Upload response: {response_data}")
        
        if response_data.get('code') == 0:
            image_id = response_data['data']['image_id']
            image_url = response_data['data']['image_url']
            return image_id, image_url
        else:
            error_message = response_data.get('message', 'Unknown error')
            error_code = response_data.get('code', 'Unknown code') 
            raise Exception(f"Failed to upload image. Code: {error_code}, Message: {error_message}")
            
    except FileNotFoundError as e:
        raise  # Re-raise to be caught and handled by caller
    except Exception as e:
        error_message = f"Error uploading image: {str(e)}"
        print(error_message)
        raise Exception(error_message)

def validate_video(video_path):
    """Validate video meets TikTok's requirements"""
    try:
        probe = ffmpeg.probe(video_path)
        video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
        
        # Get video properties
        width = int(video_info['width'])
        height = int(video_info['height'])
        duration = float(video_info['duration'])
        size_bytes = os.path.getsize(video_path)
        size_mb = size_bytes / (1024 * 1024)  # Convert to MB
        
        print(f"Video properties:")
        print(f"Resolution: {width}x{height}")
        print(f"Duration: {duration} seconds")
        print(f"File size: {size_mb:.2f} MB")
        
        # Check TikTok's requirements
        if size_mb > 500:
            raise Exception("Video file size must be under 500MB")
        if duration > 180:
            raise Exception("Video duration must be under 180 seconds")
        if width < 600 or height < 600:
            raise Exception("Video resolution must be at least 600x600")
        if width > 4096 or height > 4096:
            raise Exception("Video resolution must not exceed 4096x4096")
            
        return True
        
    except Exception as e:
        raise Exception(f"Video validation failed: {str(e)}")

def upload_video(apis, advertiser_id, video_path):
    """Upload video and return video ID and cover URL"""
    try:
        print(f"Uploading video: {video_path}")
        
        # Validate video first
        validate_video(video_path)
        
        # Verify file exists
        if not os.path.exists(video_path):
            error_msg = f"File not found: {video_path}"
            print(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Get file info for debugging
        file_size = os.path.getsize(video_path)
        print(f"File size: {file_size / 1024 / 1024:.2f} MB")
        
        # Read video file
        with open(video_path, 'rb') as f:
            video_data = f.read()
        
        # Calculate MD5 hash
        video_signature = hashlib.md5(video_data).hexdigest()
        
        # Add timestamp to filename to avoid duplicates
        original_filename = os.path.basename(video_path)
        file_base, file_ext = os.path.splitext(original_filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_filename = f"{file_base}_{timestamp}{file_ext}"
        
        print(f"Using unique filename: {unique_filename}")
        
        # API endpoint and headers
        url = "https://business-api.tiktok.com/open_api/v1.3/file/video/ad/upload/"
        headers = {
            "Access-Token": apis['file_api'].api_client.configuration.access_token
        }
        
        # Prepare multipart form-data
        files = {
            "video_file": (unique_filename, video_data, 'video/mp4')
        }
        data = {
            "advertiser_id": str(advertiser_id),
            "upload_type": "UPLOAD_BY_FILE",
            "video_signature": video_signature,
            "file_name": unique_filename,
            "auto_bind_enabled": True,
            "auto_fix_enabled": True,
            "is_third_party": False,
            "flaw_detect": True
        }
        
        # Make request
        response = requests.post(url, headers=headers, data=data, files=files)
        response_data = response.json()
        
        print("Video upload response:", response_data)  # Debug print
        
        if response_data.get('code') == 0 and response_data.get('data'):
            # Get the first item from the data list
            video_data = response_data['data'][0]
            video_id = video_data.get('video_id')
            video_cover_url = video_data.get('video_cover_url')
            
            if not video_id:
                raise Exception("Video ID not found in response")
            if not video_cover_url:
                raise Exception("Video cover URL not found in response")
            
            return video_id, video_cover_url
            
        else:
            error_message = response_data.get('message', 'Unknown error')
            error_code = response_data.get('code', 'Unknown code')
            raise Exception(f"Failed to upload video. Code: {error_code}, Message: {error_message}")
            
    except Exception as e:
        print(f"Full error: {str(e)}")  # Debug print
        raise Exception(f"Error uploading video: {str(e)}")

def get_image_from_url(url):
    """Download image from URL and return the binary data"""
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception("Failed to download image from URL")
    return response.content

def create_ios14_app_install_campaign(apis, advertiser_id, campaign_name="OKX iOS14 App Install Campaign32"):
    """Create a TikTok iOS 14 app install campaign"""
    # Get account details from config
    account_details = tiktok_account_config.get_account_details(advertiser_id)
    app_id = account_details.get('app_id_ios') if account_details else '7337670998554165249'  # Default as fallback
    
    print(f"Using app_id for iOS14 campaign: {app_id}")
    
    campaign_data = {
        'advertiser_id': advertiser_id,
        'campaign_name': campaign_name,
        'objective_type': 'APP_PROMOTION',
        'app_promotion_type': 'APP_INSTALL',
        'campaign_type': 'IOS14_CAMPAIGN',
        'budget_mode': 'BUDGET_MODE_INFINITE',
        'app_id': app_id,
        'campaign_app_profile_page_state': 'OFF',
        'is_advanced_dedicated_campaign': True,
        'operation_status': 'DISABLE'
    }
    
    try:
        response = apis['campaign_api'].campaign_create(
            access_token=apis['campaign_api'].api_client.configuration.access_token,
            body=campaign_data
        )
        campaign_id = response['data']['campaign_id']
        print(f"iOS 14 App Install Campaign created successfully. ID: {campaign_id}")
        return campaign_id
    except ApiException as e:
        print(f"Error creating iOS 14 app install campaign: {str(e)}")
        raise

def create_adgroup_for_ios14_app_install(apis, advertiser_id, campaign_id, budget=500, name=None, country=None):
    """
    Create an adgroup for iOS14 app install campaign
    
    Args:
        apis: The TikTok API object
        advertiser_id: ID of the advertiser account
        campaign_id: ID of the campaign to create adgroup in
        budget: Daily budget in USD (default: 500)
        name: Name of the adgroup (optional)
        country: Location ID for targeting (e.g., '7' for US, '298795' for Turkey)
    
    Returns:
        str: ID of the created adgroup
    """
    if not name:
        name = f"Ad Group {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    # Use provided country or default to US (location_id: 7)
    target_location = country if country else '7'
    print(f"Using location ID for targeting: {target_location}")
        
    start_time = datetime.now()
    
    # Get account details from config
    account_details = tiktok_account_config.get_account_details(advertiser_id)
    app_id = account_details.get('app_id_ios') if account_details else '7337670998554165249'  # Default as fallback

    adgroup_data = {
        'advertiser_id': advertiser_id,
        'campaign_id': campaign_id,
        'adgroup_name': name,
        'promotion_type': 'APP_IOS',
        'optimization_goal': 'IN_APP_EVENT',
        'optimization_event': 'ACTIVE_REGISTER',
        'billing_event': 'OCPM',
        'bid_type': 'BID_TYPE_NO_BID',
        'budget_mode': 'BUDGET_MODE_DAY',
        'budget': budget,
        'schedule_type': 'SCHEDULE_FROM_NOW',
        'schedule_start_time': start_time.strftime("%Y-%m-%d %H:%M:%S"),
        'operation_status': 'DISABLE',
        'operating_systems': ['IOS'],
        'ios14_targeting': 'IOS14_PLUS',
        'min_ios_version': '14.5',
        'location_ids': [target_location],
        'pacing': 'PACING_MODE_SMOOTH',
        'placement_type': 'PLACEMENT_TYPE_AUTOMATIC',
        'click_attribution_window': 'SEVEN_DAYS',
        'view_attribution_window': 'ONE_DAY'
    }
    
    # Add app_id if available
    if app_id:
        adgroup_data['app_id'] = app_id

    try:
        response = apis['adgroup_api'].adgroup_create(
            access_token=apis['adgroup_api'].api_client.configuration.access_token,
            body=adgroup_data
        )
        adgroup_id = response['data']['adgroup_id']
        print(f"Ad Group for iOS 14 App Install created successfully. ID: {adgroup_id}")
        return adgroup_id
    except ApiException as e:
        print(f"Error creating ad group for iOS 14 app install: {str(e)}")
        raise

def create_ad(apis, advertiser_id, adgroup_id, media_info, ad_name="iOS 14 App Install Ad"):
    """Create a TikTok ad for iOS 14 app install"""
    try:
        # Get account details from config
        account_details = tiktok_account_config.get_account_details(advertiser_id)
        identity_id = account_details.get('identity_id') if account_details else '7470489284983209992'  # Default as fallback
        
        url = "https://business-api.tiktok.com/open_api/v1.3/ad/create/"
        headers = {
            'Access-Token': apis['file_api'].api_client.configuration.access_token,
            'Content-Type': 'application/json'
        }
        
        creative = {
            'ad_format': 'SINGLE_VIDEO' if media_info['type'] == 'video' else 'CAROUSEL_ADS',
            'ad_name': ad_name,
            'identity_type': 'CUSTOMIZED_USER',
            'identity_id': identity_id,
            'app_name': 'OKX: Buy Bitcoin & Crypto',
            'call_to_action': 'DOWNLOAD_NOW',
            'ad_text': 'Download OKX - The most trusted crypto trading platform'
        }
        
        # Add debug information for ad name
        print(f"Setting ad name to: '{ad_name}'")
        
        # Set format-specific parameters based on media type
        if media_info['type'] == 'video':
            creative.update({
                'video_id': media_info['ids'][0],
                'image_ids': [media_info['thumbnail_id']]  # Use the uploaded cover image ID
            })
        else:  # image
            creative.update({
                'image_ids': media_info['ids'],  # Use all uploaded images, not just the first one
                'music_id': '6991891121504782338'
            })
        
        ad_data = {
            'advertiser_id': str(advertiser_id),
            'adgroup_id': str(adgroup_id),
            'ad_name': ad_name,
            'status': 'DISABLE',
            'creatives': [creative]
        }
        
        print("Ad creation request data:", ad_data)  # Debug print
        
        response = requests.post(url, headers=headers, json=ad_data)
        response_data = response.json()
        
        print("Ad API Response:", response_data)
        
        if response_data.get('code') == 0:
            ad_ids = response_data['data'].get('ad_ids', [])
            if ad_ids:
                ad_id = ad_ids[0]
                print(f"Ad created successfully. ID: {ad_id}")
                return ad_id
            else:
                raise Exception("Ad creation succeeded but no ad_id was returned.")
        else:
            raise Exception(f"Failed to create ad: {response_data.get('message')}")
            
    except Exception as e:
        print(f"Error creating ad: {str(e)}")
        raise

def main():
    # Initialize the API
    apis = initialize_api()
    
    try:
        """
        When using the Ads Studio interface, this code won't be used directly.
        Instead, the app.py file will:
        1. Get selected assets from the asset library
        2. Construct full paths to those assets
        3. Call the functions in this module to create campaigns
        
        This main function is primarily for testing/demonstration purposes.
        """
        # Example of using assets from a library instead of hardcoded paths
        # In a real application, these paths would come from a library system
        library_assets = [
            {
                'id': 'asset1',
                'name': 'Sample Image 1',
                'file_path': '/path/to/library/images/sample1.jpg',
                'type': 'image'
            },
            {
                'id': 'asset2',
                'name': 'Sample Video 1',
                'file_path': '/path/to/library/videos/sample1.mp4',
                'type': 'video'
            }
        ]
        
        # Extract image paths from library assets
        image_paths = []
        video_paths = []
        
        for asset in library_assets:
            if asset['type'] == 'image':
                image_paths.append(asset['file_path'])
            elif asset['type'] == 'video':
                video_paths.append(asset['file_path'])
        
        # For this example, we'll use just the images
        media_type = 'image' if image_paths else ('video' if video_paths else None)
        media_paths = image_paths if media_type == 'image' else video_paths
        
        if not media_paths:
            raise ValueError("No valid media assets found in library")
            
        media_ids = []
        media_urls = []
        thumbnail_id = None
        
        # Upload media based on type
        for path in media_paths:
            try:
                if media_type == 'video':
                    # Upload video and get cover URL
                    media_id, cover_url = upload_video(apis, advertiser_id, path)
                    media_ids.append(media_id)
                    print(f"Video uploaded successfully. ID: {media_id}")
                    print(f"Video cover URL: {cover_url}")
                    
                    # Download cover image and upload it to get image_id
                    try:
                        # Create a temporary file for the cover image
                        temp_cover_path = path.rsplit('.', 1)[0] + '_cover.jpg'
                        
                        # Download and save cover image
                        cover_data = get_image_from_url(cover_url)
                        with open(temp_cover_path, 'wb') as f:
                            f.write(cover_data)
                        
                        # Upload cover image to get image_id
                        thumbnail_id, _ = upload_image(apis, advertiser_id, temp_cover_path)
                        print(f"Cover image uploaded successfully. ID: {thumbnail_id}")
                        
                        # Clean up temporary file
                        os.remove(temp_cover_path)
                        
                    except Exception as e:
                        print(f"Error processing video cover: {str(e)}")
                        # Continue without thumbnail
                else:
                    # Upload image
                    image_id, image_url = upload_image(apis, advertiser_id, path)
                    media_ids.append(image_id)
                    media_urls.append(image_url)
                    print(f"Image uploaded successfully. ID: {image_id}")
            except Exception as e:
                print(f"Error processing asset {path}: {str(e)}")
                # Continue with other assets
        
        if not media_ids:
            raise Exception("Failed to upload any media")
        
        # Create the campaign
        campaign_name = f"iOS 14 App Install Campaign {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        campaign_id = create_ios14_app_install_campaign(apis, advertiser_id, campaign_name)
        
        # Create the ad group with a specific budget
        budget = 500.00  # Default budget
        adgroup_id = create_adgroup_for_ios14_app_install(apis, advertiser_id, campaign_id, budget)
        
        # Create the ad with the uploaded media
        media_info = {
            'type': media_type,
            'ids': media_ids,
            'thumbnail_id': thumbnail_id
        }
        
        ad_id = create_ad(apis, advertiser_id, adgroup_id, media_info)
        
        print("Campaign creation completed successfully!")
        print(f"Campaign ID: {campaign_id}")
        print(f"Adgroup ID: {adgroup_id}")
        print(f"Ad ID: {ad_id}")
        
        return campaign_id, adgroup_id, ad_id
    except Exception as e:
        print(f"Error in campaign creation: {str(e)}")
        raise

if __name__ == "__main__":
    main() 