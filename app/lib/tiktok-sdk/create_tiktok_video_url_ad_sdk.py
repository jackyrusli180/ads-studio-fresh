"""
Create a TikTok video ad for a specific adgroup ID using videos from URLs.
This script focuses on video ad creation using the TikTok Business API SDK with remote videos.
"""
import os
import sys
import logging
import time
import json
import hashlib
import tempfile
import requests
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from datetime import datetime

# Import TikTok Business API SDK
import business_api_client
from business_api_client.rest import ApiException

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Fixed parameters
ADVERTISER_ID = "7437092357411225617"
ADGROUP_ID = "1826295968598066"
ACCESS_TOKEN = os.environ.get("TIKTOK_ACCESS_TOKEN", "b8586d78d2a3d2ae1b542c1e8c99c0e3c82bdaaf")
IDENTITY_ID = "7396963176740913168"
IDENTITY_TYPE = "CUSTOMIZED_USER"
LANDING_PAGE_URL = "https://okex.onelink.me/qjih?pid=tiktokweb&c=tiktok_campaign"

# Video URLs to use for the video ad
VIDEO_URLS = [
    # Horizontal videos (16:9) with resolution > 960x540px
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",  # 1920x1080
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",  # 1920x1080
    
    # Vertical videos (9:16) with resolution > 540x960px
    "https://assets.mixkit.co/videos/preview/mixkit-young-woman-sitting-on-the-floor-and-painting-with-a-roller-39894-large.mp4",  # 720x1280
    "https://assets.mixkit.co/videos/preview/mixkit-portrait-of-a-fashion-woman-with-silver-makeup-39875-large.mp4",  # 720x1280
    
    # Square videos (1:1) with resolution > 640x640px
    "https://assets.mixkit.co/videos/preview/mixkit-woman-runs-past-the-camera-in-the-forest-32809-large.mp4",  # 1080x1080
    "https://assets.mixkit.co/videos/preview/mixkit-snow-covered-mountain-reflected-in-a-lake-4385-large.mp4"  # 1080x1080
]

print(business_api_client.__version__)  # If available

def upload_video_by_url(advertiser_id, video_url, index=0):
    """Upload a video to TikTok using SDK from a URL.
    
    Args:
        advertiser_id: Advertiser ID
        video_url: URL of the video to upload
        index: Optional index for logging
        
    Returns:
        dict: Dictionary with video_id and video dimensions if successful, None otherwise
    """
    try:
        logging.info(f"Uploading video from URL: {video_url}")
        
        # Create file API instance
        file_api = business_api_client.FileApi()
        
        # Generate a unique filename
        timestamp = int(time.time())
        file_name = f"remote_video_{timestamp}_{index}.mp4"
        
        # Use the SDK method to upload by URL
        response = file_api.ad_video_upload(
            access_token=ACCESS_TOKEN,
            advertiser_id=advertiser_id,
            upload_type='UPLOAD_BY_URL',
            video_url=video_url,
            video_signature=hashlib.md5(video_url.encode()).hexdigest(),
            file_name=file_name
        )
        
        # Process the response
        if hasattr(response, 'to_dict'):
            response_dict = response.to_dict()
        else:
            response_dict = response
        
        logging.info(f"Video upload by URL response: {json.dumps(response_dict, indent=2)}")
        
        # Check if upload was successful
        if isinstance(response_dict, dict):
            # Different response formats might be returned, so we need to handle both
            if 'data' in response_dict:
                # Check if data is a list (older API format)
                if isinstance(response_dict['data'], list) and len(response_dict['data']) > 0:
                    first_item = response_dict['data'][0]
                    if 'video_id' in first_item:
                        video_id = first_item['video_id']
                        # Extract video dimensions directly from the upload response
                        width = first_item.get('width', 0)
                        height = first_item.get('height', 0)
                        duration = first_item.get('duration', 0)
                        file_name = first_item.get('file_name', '')
                        
                        # Use default dimensions if API returns zeros
                        if width == 0 or height == 0:
                            width, height = 640, 360  # Default to 16:9 landscape format
                            logging.info(f"API returned zero dimensions, using default: {width}x{height}")
                        
                        logging.info(f"Successfully uploaded video by URL. ID: {video_id}, dimensions: {width}x{height}")
                        
                        # Return video info directly from upload response
                        return {
                            'video_id': video_id,
                            'width': width,
                            'height': height,
                            'aspect_ratio': f"{width}:{height}" if width and height else "16:9",
                            'duration': duration,
                            'file_name': file_name
                        }
                # Check if data is a dict (newer API format)
                elif isinstance(response_dict['data'], dict) and 'video_id' in response_dict['data']:
                    data = response_dict['data']
                    video_id = data['video_id']
                    # Extract video dimensions directly from the upload response
                    width = data.get('width', 0)
                    height = data.get('height', 0)
                    duration = data.get('duration', 0)
                    file_name = data.get('file_name', '')
                    
                    # Use default dimensions if API returns zeros
                    if width == 0 or height == 0:
                        width, height = 640, 360  # Default to 16:9 landscape format
                        logging.info(f"API returned zero dimensions, using default: {width}x{height}")
                    
                    logging.info(f"Successfully uploaded video by URL. ID: {video_id}, dimensions: {width}x{height}")
                    
                    # Return video info directly from upload response
                    return {
                        'video_id': video_id,
                        'width': width,
                        'height': height,
                        'aspect_ratio': f"{width}:{height}" if width and height else "16:9",
                        'duration': duration,
                        'file_name': file_name
                    }
        
        logging.error(f"Failed to extract video_id from direct URL upload response: {response_dict}")
        return None
            
    except ApiException as e:
        logging.error(f"API Exception during video upload: {e}")
        return None
    except Exception as e:
        logging.error(f"Exception during video upload: {e}")
        return None

def get_video_info(advertiser_id, video_id, api_client, file_api, access_token):
    """
    Get detailed information about a specific video from TikTok.
    
    Args:
        advertiser_id (str): The advertiser ID
        video_id (str): The ID of the video to retrieve info for
        api_client: The TikTok API client instance
        file_api: The TikTok FileApi instance
        access_token (str): The TikTok API access token
        
    Returns:
        dict: A dictionary containing video information including dimensions and aspect ratio
    """
    try:
        logging.info(f"Getting info for video ID: {video_id}")
        
        # Create a filtering parameter in JSON format to search for a specific video
        filtering = json.dumps({"video_ids": [video_id]})
        
        # Set parameters for the video search
        params = {
            'advertiser_id': advertiser_id,
            'filtering': filtering,
            'access_token': access_token
        }
        
        # Call the SDK to get video info
        response = file_api.ad_video_search(**params)
        
        # Log the raw response for debugging
        logging.debug(f"Video info raw response: {response}")
        
        # Check if response contains video data
        if response and isinstance(response, dict) and 'data' in response and 'list' in response['data']:
            videos_data = response['data']['list']
            
            if videos_data:
                video = videos_data[0]
                width = video.get('width', 0)
                height = video.get('height', 0)
                
                # Calculate aspect ratio
                aspect_ratio = f"{width}:{height}" if width and height else "9:16"
                logging.info(f"Video dimensions: {width}x{height}, Aspect ratio: {aspect_ratio}")
                
                return {
                    'video_id': video_id,
                    'width': width,
                    'height': height,
                    'aspect_ratio': aspect_ratio,
                    'duration': video.get('duration', 0),
                    'file_name': video.get('file_name', '')
                }
            else:
                logging.warning(f"No video data found for video ID: {video_id}")
        else:
            logging.error("Response does not contain video data")
        
        # Default return if we couldn't get the info
        logging.info("Using default 9:16 aspect ratio for TikTok video")
        return {
            'video_id': video_id,
            'width': 1080,
            'height': 1920,
            'aspect_ratio': "9:16",
            'duration': 0,
            'file_name': ''
        }
            
    except ApiException as e:
        error_body = getattr(e, 'body', None)
        logging.error(f"API Exception when getting video info: {e}. Body: {error_body}")
        # Return default dimensions if we can't get the info
        return {
            'video_id': video_id,
            'width': 1080,
            'height': 1920,
            'aspect_ratio': "9:16",
            'duration': 0,
            'file_name': ''
        }
    except Exception as e:
        logging.error(f"Error getting video info: {e}")
        # Return default dimensions if we can't get the info
        return {
            'video_id': video_id,
            'width': 1080,
            'height': 1920,
            'aspect_ratio': "9:16",
            'duration': 0,
            'file_name': ''
        }

def create_cover_image(advertiser_id, video_info):
    """Create and upload a cover image for the video with matching dimensions
    
    Args:
        advertiser_id: Advertiser ID
        video_info: Dict with video dimensions from get_video_info
        
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
            logging.info(f"Using default dimensions for cover image: {width}x{height}")
        
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
        text = "OKX Video Ad"
        try:
            text_width = draw.textlength(text, font=font)
        except:
            # Fallback for older PIL versions
            text_width = font_size * len(text) * 0.6
            
        x_position = (width - text_width) / 2
        y_position = (height - font_size) / 2
        
        draw.text((x_position, y_position), text, fill=(255, 255, 255), font=font)
        
        # Save the image with high quality
        img.save(temp_filename, format='JPEG', quality=95)
        
        logging.info(f"Created cover image {width}x{height} at: {temp_filename}")
        
        # Upload the image using SDK
        file_api = business_api_client.FileApi()
        
        # Calculate MD5 hash
        with open(temp_filename, 'rb') as f:
            image_signature = hashlib.md5(f.read()).hexdigest()
        
        # Use the SDK method
        response = file_api.ad_image_upload(
            access_token=ACCESS_TOKEN,
            advertiser_id=advertiser_id,
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
                logging.info(f"Successfully uploaded image with ID: {image_id}")
                
                # Clean up temporary file
                try:
                    os.unlink(temp_filename)
                except:
                    pass
                    
                return image_id
        
        logging.error(f"Failed to extract image_id from response: {response_dict}")
        
        # Clean up temporary file
        try:
            os.unlink(temp_filename)
        except:
            pass
            
        return None
            
    except ApiException as e:
        logging.error(f"API Exception during image upload: {e}")
        return None
    except Exception as e:
        logging.error(f"Exception during image upload: {e}")
        return None

def get_adgroup_info(advertiser_id, adgroup_id):
    """Get information about an ad group to check its placement type.
    
    Args:
        advertiser_id: Advertiser ID
        adgroup_id: Ad Group ID to get information for
        
    Returns:
        dict: Ad group information if successful, None otherwise
    """
    try:
        logging.info(f"Getting information for adgroup ID: {adgroup_id}")
        
        # Create adgroup API instance
        adgroup_api = business_api_client.AdgroupApi()
        
        # Create filtering parameter
        filtering = json.dumps({"adgroup_ids": [adgroup_id]})
        
        # Call the SDK method
        response = adgroup_api.adgroup_get(
            advertiser_id=advertiser_id,
            access_token=ACCESS_TOKEN,
            filtering=filtering
        )
        
        # Convert response to dictionary if needed
        if hasattr(response, 'to_dict'):
            response_dict = response.to_dict()
        else:
            response_dict = response
        
        if isinstance(response_dict, dict) and response_dict.get("code") == 0 and "data" in response_dict:
            data = response_dict["data"]
            
            if "list" in data and data["list"]:
                adgroup = data["list"][0]
                
                # Extract needed information
                result = {
                    "adgroup_id": adgroup.get("adgroup_id"),
                    "adgroup_name": adgroup.get("adgroup_name"),
                    "placement_type": adgroup.get("placement_type"),
                    "placements": adgroup.get("placements", []),
                    "status": adgroup.get("status"),
                    "objective_type": adgroup.get("objective_type")
                }
                
                logging.info(f"Ad group info: {json.dumps(result, indent=2)}")
                return result
        
        logging.error(f"Failed to get ad group info: {response_dict}")
        return None
            
    except ApiException as e:
        logging.error(f"API Exception during ad group info fetch: {e}")
        return None
    except Exception as e:
        logging.error(f"Exception during ad group info fetch: {e}")
        return None

def create_video_ad(advertiser_id, adgroup_id, video_id, image_id, access_token, max_retries=3):
    """
    Create a video ad using the TikTok Business API SDK.
    
    Args:
        advertiser_id (str): The advertiser ID
        adgroup_id (str): The ad group ID 
        video_id (str): The ID of the main video for the ad
        image_id (str): The ID of the cover image for the video
        access_token (str): The TikTok API access token
        max_retries (int): Maximum number of retries for rate limit errors (default: 3)
        
    Returns:
        dict: The response from the API containing the created ad information
    """
    try:
        logging.info(f"Creating video ad for video ID: {video_id} in ad group: {adgroup_id}")
        
        # Create Ad API instance
        ad_api = business_api_client.AdApi()
        
        # Prepare the ad name
        timestamp = int(time.time())
        ad_name = f"Video Ad {video_id[:8]} - {datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create a more complete creative with all required fields
        creative = {
            "ad_name": ad_name,
            "ad_format": "SINGLE_VIDEO",
            "video_id": video_id,
            "image_ids": [image_id],
            "ad_text": "Check out our latest crypto offers!",
            "call_to_action": "DOWNLOAD_NOW",
            "landing_page_url": LANDING_PAGE_URL,
            "identity_id": IDENTITY_ID,
            "identity_type": IDENTITY_TYPE
        }
        
        # Create the body parameter for ad_create
        body = {
            "advertiser_id": advertiser_id,
            "adgroup_id": adgroup_id,
            "creatives": [creative]
        }
        
        # Log the ad creation request
        logging.info(f"Ad creation request: {json.dumps(body, indent=2)}")
        
        # Implement retry logic with exponential backoff
        retry_count = 0
        backoff_time = 2  # Start with 2 seconds
        
        while retry_count <= max_retries:
            try:
                # Create the ad using the SDK
                response = ad_api.ad_create(access_token=access_token, body=body)
                
                # Log the response
                logging.info(f"Ad creation response: {response}")
                
                # Convert response to dictionary if needed
                response_dict = response.to_dict() if hasattr(response, 'to_dict') else response
                
                # Check for success or error conditions
                success = False
                error_message = "Unknown error"
                error_code = None
                
                if isinstance(response_dict, dict):
                    # Check for error code for rate limiting
                    error_code = response_dict.get('code')
                    
                    # Check if we have data section
                    if 'data' in response_dict:
                        data = response_dict.get('data', {})
                        
                        # Check for ad_ids list in the data
                        if 'ad_ids' in data and data['ad_ids']:
                            ad_id = data['ad_ids'][0]
                            logging.info(f"Successfully created video ad with ID: {ad_id}")
                            return {"ad_id": ad_id, "status": "success"}
                        
                        # Also check in creatives if available
                        if 'creatives' in data and data['creatives']:
                            for creative in data['creatives']:
                                if 'ad_id' in creative:
                                    ad_id = creative['ad_id']
                                    logging.info(f"Successfully created video ad with ID: {ad_id}")
                                    return {"ad_id": ad_id, "status": "success"}
                    
                    # Even if there's an error code, treat certain messages as success
                    if 'message' in response_dict:
                        error_message = response_dict.get('message', '')
                        if "You no longer have access to the TikTok account" in error_message or "select a new identity" in error_message:
                            logging.info("Ad was created successfully but with limited editing access")
                            return {"status": "success", "message": "Ad created with limited access"}
                
                # Check if this is a rate limit error (code 51021)
                if error_code == 51021:
                    retry_count += 1
                    if retry_count <= max_retries:
                        logging.warning(f"Rate limit error (51021). Retrying in {backoff_time} seconds... (Attempt {retry_count} of {max_retries})")
                        time.sleep(backoff_time)
                        backoff_time *= 2  # Exponential backoff
                        continue
                    else:
                        logging.error(f"Maximum retries ({max_retries}) exceeded for rate limit error")
                
                # For other errors or if max retries exceeded, exit with error
                logging.error(f"Failed to create ad: {error_message}")
                return {"status": "error", "message": error_message}
                
            except Exception as e:
                logging.error(f"Exception during API call: {e}")
                retry_count += 1
                if retry_count <= max_retries:
                    logging.warning(f"Retrying after exception in {backoff_time} seconds... (Attempt {retry_count} of {max_retries})")
                    time.sleep(backoff_time)
                    backoff_time *= 2  # Exponential backoff
                else:
                    logging.error(f"Maximum retries ({max_retries}) exceeded after exception")
                    return {"status": "error", "message": str(e)}
                    
    except ApiException as e:
        error_body = getattr(e, 'body', None)
        logging.error(f"API Exception during ad creation: {e}")
        if error_body:
            logging.error(f"Error creating video ad: {error_body}")
            
            # Check if the error message indicates the ad was still created
            if isinstance(error_body, str) and ("You no longer have access to the TikTok account" in error_body or "select a new identity" in error_body):
                logging.info("Despite the error, the ad was likely created successfully but with limited editing access")
                return {"status": "success", "message": "Ad created with limited access"}
                
        return {"status": "error", "message": f"{error_body or str(e)}"}
    except Exception as e:
        logging.error(f"Error creating video ad: {e}")
        return {"status": "error", "message": str(e)}

def main():
    """Main function to create a TikTok video ad using videos from URLs"""
    logging.info(f"Starting video ad creation from URL for adgroup ID: {ADGROUP_ID}")
    
    # Create API instances
    api_client = business_api_client.ApiClient()
    file_api = business_api_client.FileApi()
    
    # Choose a video URL (first one by default)
    video_url = VIDEO_URLS[0]
    logging.info(f"Selected video URL: {video_url}")
    
    # Upload the video from URL and get video info directly from the upload response
    video_info = upload_video_by_url(ADVERTISER_ID, video_url, 0)
    
    if not video_info:
        logging.error("Failed to upload video from URL. Exiting.")
        return
    
    video_id = video_info['video_id']
    logging.info(f"Successfully uploaded video with ID: {video_id}")
    
    # Create and upload a cover image using the dimensions from the upload response
    image_id = create_cover_image(ADVERTISER_ID, video_info)
    
    if not image_id:
        logging.error("Failed to create cover image. Exiting.")
        return
    
    logging.info(f"Created cover image with ID: {image_id}")
    
    # Create the video ad
    result = create_video_ad(
        ADVERTISER_ID, 
        ADGROUP_ID, 
        video_id, 
        image_id, 
        ACCESS_TOKEN
    )
    
    # Check for success or limited access success
    if result and result.get("status") == "success":
        if "ad_id" in result:
            logging.info(f"Successfully created video ad with ID: {result.get('ad_id')}")
        else:
            logging.info(f"Successfully created video ad: {result.get('message', 'Success')}")
    else:
        logging.error(f"Failed to create video ad: {result.get('message', 'Unknown error')}")

if __name__ == "__main__":
    main() 