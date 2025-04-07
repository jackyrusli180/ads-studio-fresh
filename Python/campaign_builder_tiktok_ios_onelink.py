from __future__ import print_function
import business_api_client
from business_api_client.rest import ApiException
from business_api_client import CampaignCreationApi
from business_api_client import AdgroupApi
from business_api_client import AdAcoApi
from business_api_client import FileApi
import requests
import os
from datetime import datetime
import hashlib  # Only needed for random hash in upload_image
import mimetypes
import base64
import json
import ffmpeg
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
        
        print(f"Prepared request with file: {unique_filename}, signature: {video_signature}")
        
        # Make request
        response = requests.post(url, headers=headers, data=data, files=files)
        response_data = response.json()
        
        print(f"Upload response: {response_data}")
        
        if response_data.get('code') == 0:
            video_id = response_data['data']['video_id']
            cover_url = response_data['data'].get('video_cover_url')
            if not cover_url:
                print("Warning: No cover URL found in response. Using fallback method to get cover.")
                # Fallback to getting cover URL from additional API call if needed
            return video_id, cover_url
        else:
            error_message = response_data.get('message', 'Unknown error')
            error_code = response_data.get('code', 'Unknown code') 
            raise Exception(f"Failed to upload video. Code: {error_code}, Message: {error_message}")
            
    except FileNotFoundError as e:
        raise  # Re-raise to be caught and handled by caller
    except Exception as e:
        error_message = f"Error uploading video: {str(e)}"
        print(error_message)
        raise Exception(error_message)

def create_campaign(apis, advertiser_id, campaign_name="OKX iOS Campaign136"):
    """Create a TikTok ad campaign"""
    campaign_data = {
        'advertiser_id': advertiser_id,
        'campaign_name': campaign_name,
        'objective_type': 'LEAD_GENERATION',
        'budget_mode': 'BUDGET_MODE_INFINITE',
        'operation_status': 'DISABLE'
    }
    
    try:
        response = apis['campaign_api'].campaign_create(
            access_token=apis['campaign_api'].api_client.configuration.access_token,
            body=campaign_data
        )
        campaign_id = response['data']['campaign_id']
        print(f"Campaign created successfully. ID: {campaign_id}")
        return campaign_id
    except ApiException as e:
        print(f"Error creating campaign: {str(e)}")
        raise

def create_adgroup(apis, advertiser_id, campaign_id, budget=500.00, adgroup_name="Web Signup Ad Group"):
    """Create a TikTok ad group"""
    start_time = datetime.now()
    
    adgroup_data = {
        'advertiser_id': advertiser_id,
        'campaign_id': campaign_id,
        'adgroup_name': adgroup_name,
        'promotion_type': 'LEAD_GENERATION',
        'promotion_target_type':'EXTERNAL_WEBSITE',
        'optimization_goal': 'CONVERT',
        'billing_event': 'OCPM',
        'bid_type': 'BID_TYPE_NO_BID',
        "pacing": "PACING_MODE_SMOOTH",
        'budget_mode': 'BUDGET_MODE_DAY',
        'budget': budget,
        'schedule_type': 'SCHEDULE_FROM_NOW',
        'schedule_start_time': start_time.strftime("%Y-%m-%d %H:%M:%S"),
        'operation_status': 'DISABLE',
        'location_ids': ['298795'],
        'operating_systems': ['IOS'],
        'placement_type': 'PLACEMENT_TYPE_AUTOMATIC',
        'auto_targeting_enabled': False,
        'click_attribution_window': 'SEVEN_DAYS',
        'view_attribution_window': 'OFF',
        'pixel_id': '7408759583411290130',
        'optimization_event': 'ON_WEB_REGISTER'
    }
    
    try:
        response = apis['adgroup_api'].adgroup_create(
            access_token=apis['adgroup_api'].api_client.configuration.access_token,
            body=adgroup_data
        )
        # Access response as dictionary
        adgroup_id = response['data']['adgroup_id']
        print(f"Ad Group created successfully. ID: {adgroup_id}")
        return adgroup_id
    except ApiException as e:
        print(f"Error creating ad group: {str(e)}")
        raise

def create_ad(apis, advertiser_id, adgroup_id, media_info, ad_name="Web Signup Ad", custom_landing_page_url=None):
    """Create a TikTok ad using direct API call with ad-level landing page URL"""
    try:
        account_details = tiktok_account_config.get_account_details(advertiser_id)
        identity_id = account_details.get('identity_id') if account_details else '7470489284983209992'

        landing_page_url = custom_landing_page_url or account_details.get('landing_page_url') if account_details else 'https://okex.onelink.me/qjih/7tx4urtd'

        landing_page_url = landing_page_url.replace('__CALLBACK_PARAM__', '{{ttclid}}').replace('__CAMPAIGN_ID__', '{{campaign_id}}').replace('__AID__', '{{adgroup_id}}').replace('__CID__', '{{ad_id}}')

        url = "https://business-api.tiktok.com/open_api/v1.3/ad/create/"
        headers = {'Access-Token': apis['file_api'].api_client.configuration.access_token, 'Content-Type': 'application/json'}

        creative = {'ad_format': 'SINGLE_VIDEO' if media_info['type'] == 'video' else 'CAROUSEL_ADS', 'ad_name': ad_name, 'identity_type': 'CUSTOMIZED_USER', 'identity_id': identity_id, 'call_to_action': 'SIGN_UP', 'landing_page_url': landing_page_url, 'ad_text': 'Trade crypto with OKX - The most trusted crypto trading platform'}

        if media_info['type'] == 'video':
            creative.update({'video_id': media_info['ids'][0], 'image_ids': [media_info['thumbnail_id']]})
        else:
            creative.update({'image_ids': media_info['ids'], 'music_id': '6991891121504782338'})

        ad_data = {'advertiser_id': str(advertiser_id), 'adgroup_id': str(adgroup_id), 'ad_name': ad_name, 'status': 'DISABLE', 'creatives': [creative]}

        response = requests.post(url, headers=headers, json=ad_data)
        response_data = response.json()

        if response_data.get('code') == 0:
            ad_ids = response_data['data'].get('ad_ids', [])
            if ad_ids:
                return ad_ids[0]
            else:
                raise Exception("Ad creation succeeded but no ad_id was returned.")
        else:
            raise Exception(f"Failed to create ad: {response_data.get('message')}")

    except Exception as e:
        print(f"Error creating ad: {str(e)}")
        raise

def get_image_from_url(url):
    """Download image from URL and return the binary data"""
    response = requests.get(url)
    if response.status_code != 200:
        raise Exception("Failed to download image from URL")
    return response.content

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
        
        # For this example, we'll use just the first available asset
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
        
        # Create campaign with timestamp in name to avoid conflicts
        campaign_name = f"iOS Onelink Campaign {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        campaign_id = create_campaign(apis, advertiser_id, campaign_name)
        
        # Create ad group with a specific budget
        budget = 500.00  # Default budget
        adgroup_id = create_adgroup(apis, advertiser_id, campaign_id, budget)
        
        # Create ad using the uploaded media
        media_info = {
            'type': media_type,
            'ids': media_ids,
            'thumbnail_id': thumbnail_id
        }
        
        ad_id = create_ad(apis, advertiser_id, adgroup_id, media_info)
        
        print("Campaign creation completed successfully!")
        print(f"Campaign ID: {campaign_id}")
        print(f"Ad Group ID: {adgroup_id}")
        print(f"Ad ID: {ad_id}")
        
        return campaign_id, adgroup_id, ad_id
    except Exception as e:
        print(f"Error in campaign creation: {str(e)}")
        raise

if __name__ == "__main__":
    main() 