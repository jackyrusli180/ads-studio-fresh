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

def create_android_app_install_campaign(apis, advertiser_id, campaign_name="OKX Android App Install Campaign1"):
    """Create a TikTok Android app install campaign"""
    campaign_data = {
        'advertiser_id': advertiser_id,
        'campaign_name': campaign_name,
        'objective_type': 'APP_PROMOTION',
        'app_promotion_type': 'APP_INSTALL',
        'budget_mode': 'BUDGET_MODE_INFINITE',
        'operation_status': 'DISABLE'
    }
    
    try:
        response = apis['campaign_api'].campaign_create(
            access_token=apis['campaign_api'].api_client.configuration.access_token,
            body=campaign_data
        )
        campaign_id = response['data']['campaign_id']
        print(f"Android App Install Campaign created successfully. ID: {campaign_id}")
        return campaign_id
    except ApiException as e:
        print(f"Error creating Android app install campaign: {str(e)}")
        raise

def create_adgroup_for_android_app_install(apis, advertiser_id, campaign_id, budget=500.00, adgroup_name="Android App Install Ad Group", country="298795"):
    """Create a TikTok ad group for Android app install"""
    start_time = datetime.now()
    
    # Get account details from config
    account_details = tiktok_account_config.get_account_details(advertiser_id)
    app_id = account_details.get('app_id_android') if account_details else '7337674614505504770'  # Default as fallback

    adgroup_data = {
        'advertiser_id': advertiser_id,
        'campaign_id': campaign_id,
        'adgroup_name': adgroup_name,
        'app_id': app_id, 
        'promotion_type': 'APP_ANDROID',
        'optimization_goal': 'IN_APP_EVENT',
        'optimization_event': 'ACTIVE_REGISTER',
        'billing_event': 'OCPM',
        'bid_type': 'BID_TYPE_NO_BID',
        'budget_mode': 'BUDGET_MODE_DAY',
        'budget': budget,
        'schedule_type': 'SCHEDULE_FROM_NOW',
        'schedule_start_time': start_time.strftime("%Y-%m-%d %H:%M:%S"),
        'operation_status': 'DISABLE',
        'operating_systems': ['ANDROID'],
        'location_ids': [country],
        'pacing': 'PACING_MODE_SMOOTH',
        'placement_type': 'PLACEMENT_TYPE_AUTOMATIC',
        'click_attribution_window': 'SEVEN_DAYS',
        'view_attribution_window': 'OFF'
    }
    
    try:
        response = apis['adgroup_api'].adgroup_create(
            access_token=apis['adgroup_api'].api_client.configuration.access_token,
            body=adgroup_data
        )
        adgroup_id = response['data']['adgroup_id']
        print(f"Ad Group for Android App Install created successfully. ID: {adgroup_id}")
        return adgroup_id
    except ApiException as e:
        print(f"Error creating ad group for Android app install: {str(e)}")
        raise

def create_ad(apis, advertiser_id, adgroup_id, media_info, ad_name="Android App Install Ad"):
    """Create a TikTok ad for Android app install"""
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
        # Define media path - can be either image or video
        media_paths = [
            "/Users/jackyrusli/Downloads/testcoin.jpeg"  # or .mp4
        ]
        
        # Determine media type from file extension
        media_type = 'video' if media_paths[0].lower().endswith(('.mp4', '.mov')) else 'image'
        media_ids = []
        media_urls = []
        thumbnail_id = None
        
        # Upload media based on type
        for path in media_paths:
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
                    print(f"Error processing cover image: {str(e)}")
                    raise
            else:
                media_id, media_url = upload_image(apis, advertiser_id, path)
                media_ids.append(media_id)
                media_urls.append(media_url)
        
        # Create Android app install campaign
        campaign_id = create_android_app_install_campaign(apis, advertiser_id)
        
        # Create ad group for Android app install
        adgroup_id = create_adgroup_for_android_app_install(apis, advertiser_id, campaign_id)
        
        # Create ad using the uploaded media
        media_info = {
            'type': media_type,
            'ids': media_ids,
            'thumbnail_id': thumbnail_id  # Include thumbnail ID for video ads
        }
        ad_id = create_ad(apis, advertiser_id, adgroup_id, media_info)
        
        print("\nSummary:")
        print(f"Android App Install Campaign ID: {campaign_id}")
        print(f"Ad Group ID: {adgroup_id}")
        print(f"Ad ID: {ad_id}")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 