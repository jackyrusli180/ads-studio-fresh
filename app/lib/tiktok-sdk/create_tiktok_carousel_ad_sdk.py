"""
Create a TikTok carousel ad for a specific adgroup ID.
This script focuses only on carousel ad creation using the TikTok Business API SDK.
"""
import os
import sys
import logging
import time
import json
import hashlib
import tempfile
from PIL import Image, ImageDraw, ImageFont

# Import TikTok Business API SDK
import business_api_client
from business_api_client.rest import ApiException
from business_api_client.models.ad_create_body import AdCreateBody
from business_api_client.models.filtering_adgroup_get import FilteringAdgroupGet

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

print(business_api_client.__version__)  # If available

def get_valid_music_id(advertiser_id):
    """Get a valid music ID specifically for carousel ads.
    
    Args:
        advertiser_id: Advertiser ID
        
    Returns:
        str: A valid music ID for carousel ads, or None if none found
    """
    try:
        logging.info("Fetching valid music IDs specifically for carousel ads")
        
        # The SDK doesn't have a direct method for music, so we'll create a custom API client
        api_client = business_api_client.ApiClient()
        api_client.configuration.api_key['Access-Token'] = ACCESS_TOKEN
        
        # Query parameters for music search
        query_params = {
            "advertiser_id": advertiser_id,
            "page": 1,
            "page_size": 50,
            "music_scene": "CAROUSEL_ADS",
            "search_type": "SEARCH_BY_KEYWORD",
            "filtering": json.dumps({"keyword": "tecnology"})
        }
        
        logging.info(f"Searching for music with keyword: 'tecnology'")
        
        # Make a custom API call
        api_path = '/open_api/v1.3/file/music/get/'
        response = api_client.call_api(
            api_path, 'GET',
            path_params={},
            query_params=query_params,
            header_params={},
            body=None,
            post_params=[],
            files={},
            response_type='object',
            auth_settings=[],
            async_req=False,
            _return_http_data_only=True,
            _preload_content=True,
            _request_timeout=None,
            collection_formats={}
        )
        
        # Process the response
        if isinstance(response, dict) and response.get("code") == 0 and response.get("data"):
            if "musics" in response.get("data", {}):
                music_list = response.get("data", {}).get("musics", [])
                if music_list:
                    # Log all available music IDs
                    for i, music in enumerate(music_list):
                        music_id = music.get("music_id")
                        music_name = music.get("music_name", "Unknown")
                        logging.info(f"Available carousel music {i+1}: ID={music_id}, Name={music_name}")
                    
                    # Return the first available music ID
                    music_id = music_list[0].get("music_id")
                    logging.info(f"Selected carousel music ID: {music_id}")
                    return music_id
        
        # If no carousel-specific music found, notify
        logging.error("No valid music for carousel ads found. You need to upload a custom music with music_scene=CAROUSEL_ADS")
        return None
        
    except Exception as e:
        logging.error(f"Exception during music ID fetch: {e}")
        return None

def upload_carousel_music(advertiser_id, music_file_path):
    """Upload a custom music file specifically for carousel ads.
    
    Args:
        advertiser_id: Advertiser ID
        music_file_path: Path to the music file
        
    Returns:
        str: Music ID if successful, None otherwise
    """
    try:
        logging.info(f"Uploading custom music for carousel ads: {music_file_path}")
        
        if not os.path.exists(music_file_path):
            logging.error(f"Music file does not exist: {music_file_path}")
            return None
        
        # Calculate MD5 hash
        with open(music_file_path, 'rb') as f:
            music_signature = hashlib.md5(f.read()).hexdigest()
            logging.info(f"Music MD5 signature: {music_signature}")
        
        # Duration field in seconds as an integer
        duration = 3
        
        # Use curl command directly which works more reliably with TikTok's API
        import subprocess
        
        url = "https://business-api.tiktok.com/open_api/v1.3/file/music/upload/"
        
        logging.info(f"Uploading music using curl with advertiser_id={advertiser_id} and duration={duration}")
        
        curl_cmd = [
            "curl", "-X", "POST",
            url,
            "-H", f"Access-Token: {ACCESS_TOKEN}",
            "-F", f"advertiser_id={advertiser_id}",
            "-F", f"upload_type=UPLOAD_BY_FILE",
            "-F", f"music_signature={music_signature}",
            "-F", f"music_scene=CAROUSEL_ADS",
            "-F", f"duration={duration}",
            "-F", f"music_file=@{music_file_path}"
        ]
        
        try:
            # Execute curl command and capture output
            result = subprocess.run(curl_cmd, capture_output=True, text=True)
            
            # Log the raw output for debugging
            logging.info(f"Curl command output: {result.stdout}")
            
            if result.returncode != 0:
                logging.error(f"Curl command failed with error: {result.stderr}")
                return None
                
            # Parse the JSON response
            curl_response = json.loads(result.stdout)
            
            # Check if upload was successful
            if curl_response.get('code') == 0 and 'data' in curl_response and 'music_id' in curl_response['data']:
                music_id = curl_response['data']['music_id']
                logging.info(f"Successfully uploaded music with curl, ID: {music_id}")
                return music_id
            else:
                # Try an alternative approach with a fixed duration value in bytes
                logging.info("First attempt failed, trying with different duration format")
                
                # Modify the curl command to use a different format for duration
                fixed_curl_cmd = curl_cmd.copy()
                
                # Replace the duration parameter (at index 10)
                duration_index = None
                for i, param in enumerate(fixed_curl_cmd):
                    if param.startswith("-F") and "duration=" in fixed_curl_cmd[i+1]:
                        duration_index = i+1
                        break
                
                if duration_index:
                    fixed_curl_cmd[duration_index] = f"duration=3"
                    
                    result = subprocess.run(fixed_curl_cmd, capture_output=True, text=True)
                    logging.info(f"Second curl attempt output: {result.stdout}")
                    
                    if result.returncode == 0:
                        curl_response = json.loads(result.stdout)
                        if curl_response.get('code') == 0 and 'data' in curl_response and 'music_id' in curl_response['data']:
                            music_id = curl_response['data']['music_id']
                            logging.info(f"Successfully uploaded music with second attempt, ID: {music_id}")
                            return music_id
                
                logging.error(f"Failed to upload music after multiple attempts: {curl_response}")
                return None
                
        except json.JSONDecodeError:
            logging.error(f"Failed to parse curl response: {result.stdout}")
            return None
        except Exception as curl_err:
            logging.error(f"Curl upload failed: {curl_err}")
            return None
            
    except Exception as e:
        logging.error(f"Exception during music upload: {e}")
        return None

def create_test_images(num_images=3):
    """
    Create test images for TikTok carousel ad creation using PIL.
    
    Args:
        num_images: Number of test images to create
        
    Returns:
        List of file paths to the created images
    """
    try:
        # Create directory for test images if it doesn't exist
        os.makedirs("test_images", exist_ok=True)
        
        # Colors for the image backgrounds
        bg_colors = [(45, 125, 210), (210, 45, 60), (60, 180, 75)]
        
        # Messages to display on the images
        messages = [
            "Trade Bitcoin\nSecurely with\nOKX",
            "Crypto Trading\nMade Simple\nOKX",
            "Join OKX\nThe Future of\nCrypto"
        ]
        
        # Generate timestamp and random string for uniqueness
        timestamp = int(time.time())
        import random
        import string
        random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
        
        image_paths = []
        
        # Use TikTok's preferred dimensions (1080x1080) for better acceptance rate
        width, height = 1080, 1080
        
        for i in range(min(num_images, len(bg_colors))):
            # Create image with random identifier in filename
            image_path = f"test_images/test_image_{timestamp}_{random_str}_{i+1}.jpg"
            
            # Create a new image with the background color
            img = Image.new('RGB', (width, height), bg_colors[i])
            draw = ImageDraw.Draw(img)
            
            # Try to use a font, or fallback to default
            try:
                # Try to get a system font that should be available on most systems
                font_size = 120
                font = ImageFont.truetype("Arial", font_size)
            except IOError:
                # Fallback to default font
                font = ImageFont.load_default()
            
            # Center the text in the image
            message = messages[i]
            lines = message.split('\n')
            line_height = font_size * 1.5
            total_height = line_height * len(lines)
            y_position = (height - total_height) / 2
            
            for line in lines:
                # Try to calculate text width
                try:
                    text_width = draw.textlength(line, font=font)
                except:
                    # Fallback for older PIL versions or default font
                    text_width = font_size * len(line) * 0.6
                
                x_position = (width - text_width) / 2
                draw.text((x_position, y_position), line, fill=(255, 255, 255), font=font)
                y_position += line_height
            
            # Save the image
            img.save(image_path, quality=95)
            image_paths.append(image_path)
            logging.info(f"Created test image at: {image_path}")
        
        return image_paths
    except Exception as e:
        logging.error(f"Error creating test images: {e}")
        return []

def upload_local_image(advertiser_id, image_path):
    """
    Upload a locally stored image to TikTok using SDK.
    
    Args:
        advertiser_id: Advertiser ID
        image_path: Path to local image file
        
    Returns:
        dict: Dictionary with image_id and material_id if successful, None otherwise
    """
    try:
        logging.info(f"Uploading local image: {image_path}")
        
        # Check if file exists
        if not os.path.exists(image_path):
            logging.error(f"Image file does not exist: {image_path}")
            return None
        
        # Calculate MD5 hash
        with open(image_path, 'rb') as f:
            image_signature = hashlib.md5(f.read()).hexdigest()
        
        # Create file API instance
        file_api = business_api_client.FileApi()
        
        # Use the SDK method
        response = file_api.ad_image_upload(
            access_token=ACCESS_TOKEN,
            advertiser_id=advertiser_id,
            upload_type='UPLOAD_BY_FILE',
            image_signature=image_signature,
            image_file=image_path
        )
        
        # Convert response to dictionary if needed
        if hasattr(response, 'to_dict'):
            response_dict = response.to_dict()
        else:
            response_dict = response
        
        # Extract data from the response dictionary
        if isinstance(response_dict, dict) and 'data' in response_dict:
            data = response_dict['data']
            if isinstance(data, dict) and 'image_id' in data and 'material_id' in data:
                image_id = data['image_id']
                material_id = data['material_id']
                logging.info(f"Successfully uploaded image with ID: {image_id} and material ID: {material_id}")
                return {
                    "image_id": image_id,
                    "material_id": material_id
                }
        
        logging.error(f"Failed to extract image_id or material_id from response: {response_dict}")
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
        adgroup_id: Ad Group ID
        
    Returns:
        dict: Ad group information if successful, None otherwise
    """
    try:
        logging.info(f"Getting information for adgroup ID: {adgroup_id}")
        
        # Create adgroup API instance
        adgroup_api = business_api_client.AdgroupApi()
        
        # IMPORTANT: The API expects "adgroup_id" (singular), not "adgroup_ids" (plural)
        # We'll construct the filtering JSON string directly to match the expected format
        filtering_json = json.dumps({"adgroup_id": adgroup_id})
        
        # Call the SDK method with the correct filtering format
        response = adgroup_api.adgroup_get(
            advertiser_id=advertiser_id,
            access_token=ACCESS_TOKEN,
            filtering=filtering_json
        )
        
        # Process the response (convert to dictionary if needed)
        if hasattr(response, 'to_dict'):
            response_dict = response.to_dict()
        else:
            response_dict = response
        
        # Check for successful response and extract adgroup info
        if isinstance(response_dict, dict) and response_dict.get("data"):
            ad_groups_list = response_dict.get("data", {}).get("list", [])
            
            # Search through the list to find the matching ad group
            for ad_group in ad_groups_list:
                if str(ad_group.get("adgroup_id")) == str(adgroup_id):
                    result = {
                        "adgroup_id": ad_group.get("adgroup_id"),
                        "adgroup_name": ad_group.get("adgroup_name"),
                        "placement_type": ad_group.get("placement_type"),
                        "placements": ad_group.get("placements", []),
                        "status": ad_group.get("operation_status"),
                        "objective_type": ad_group.get("optimization_goal")
                    }
                    
                    logging.info(f"Ad group info: {json.dumps(result, indent=2)}")
                    return result
            
            # If we reach here, we didn't find the matching ad group
            logging.error(f"Adgroup ID {adgroup_id} not found in the response")
        
        logging.error(f"Failed to get ad group info: {response_dict}")
        return None
        
    except Exception as e:
        logging.error(f"Exception during ad group info fetch: {e}")
        return None

def create_carousel_ad(advertiser_id, adgroup_id, image_ids, landing_page_url, identity_id, identity_type, music_id, max_retries=3):
    """Create a TikTok carousel ad with the given images using the SDK
    
    Args:
        advertiser_id: Advertiser ID
        adgroup_id: Ad Group ID
        image_ids: List of image IDs to use in the carousel
        landing_page_url: Landing page URL
        identity_id: Identity ID to use
        identity_type: Identity type to use
        music_id: Music ID to use
        max_retries: Maximum number of retries for rate limit errors (default: 3)
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        logging.info(f"Creating carousel ad with {len(image_ids)} images")
        
        # Ensure we have at least 2 images for a carousel
        if not image_ids or len(image_ids) < 2:
            logging.error("At least 2 images are required for carousel ad creation")
            return False
            
        # Check the ad group's placement configuration
        adgroup_info = get_adgroup_info(advertiser_id, adgroup_id)
        if not adgroup_info:
            logging.error(f"Failed to get information for adgroup_id: {adgroup_id}")
            return False
            
        placement_type = adgroup_info.get('placement_type')
        placements = adgroup_info.get('placements', [])
        
        logging.info(f"Adgroup placement_type: {placement_type}, placements: {placements}")
        
        # Determine if carousel ad is supported by this placement configuration
        use_carousel = False
        
        if placement_type == "PLACEMENT_TYPE_AUTOMATIC":
            logging.info("Adgroup uses PLACEMENT_TYPE_AUTOMATIC, CAROUSEL_ADS is supported")
            use_carousel = True
        elif placement_type == "PLACEMENT_TYPE_NORMAL" and "PLACEMENT_TIKTOK" in placements:
            logging.info("Adgroup uses PLACEMENT_TYPE_NORMAL with TikTok placement, CAROUSEL_ADS is supported")
            use_carousel = True
        elif "PLACEMENT_TIKTOK" in placements:
            logging.info("Adgroup includes TikTok placement, assuming CAROUSEL_ADS is supported")
            use_carousel = True
        else:
            logging.error(f"Adgroup does not support carousel ads. Placement type: {placement_type}, Placements: {placements}")
            return False
        
        # Create Ad API instance
        ad_api = business_api_client.AdApi()
        
        # Create the creative dictionary
        timestamp = int(time.time())
        creative = {
            "ad_format": "CAROUSEL_ADS",
            "ad_name": f"TikTok Carousel Ad {timestamp}",
            "ad_text": "Check out our crypto offers!",
            "call_to_action": "SHOP_NOW",
            "image_ids": image_ids,
            "music_id": music_id,
            "identity_id": identity_id,
            "identity_type": identity_type,
            "landing_page_url": landing_page_url
        }
        
        # Create the full ad creation body
        ad_create_body = {
            "advertiser_id": advertiser_id,
            "adgroup_id": adgroup_id,
            "creatives": [creative]
        }
        
        # Log payload for debugging
        logging.info(f"Ad creation payload: {json.dumps(ad_create_body, indent=2)}")
        
        # Implement retry logic with exponential backoff
        retry_count = 0
        backoff_time = 2  # Start with 2 seconds
        
        while retry_count <= max_retries:
            try:
                # Call the SDK method
                response = ad_api.ad_create(
                    access_token=ACCESS_TOKEN,
                    body=ad_create_body
                )
                
                # Process the response - handle both object and dict formats
                if hasattr(response, 'to_dict'):
                    response_dict = response.to_dict()
                else:
                    response_dict = response
                    
                # Log the full response for debugging
                logging.info(f"Raw API response: {response_dict}")
                    
                # Check for success based on the response format
                success = False
                error_message = "Unknown error"
                error_code = None
                
                if isinstance(response_dict, dict):
                    # Check for error code for rate limiting
                    error_code = response_dict.get('code')
                    
                    # Check for code=0 (old success format)
                    if error_code == 0:
                        success = True
                    # Check for ad_ids in data (new success format)
                    elif 'data' in response_dict and 'ad_ids' in response_dict['data']:
                        ad_ids = response_dict['data']['ad_ids']
                        logging.info(f"Ad created successfully with ID: {ad_ids[0]}")
                        success = True
                    # Check for error message
                    elif 'message' in response_dict:
                        error_message = response_dict.get('message')
                        
                    # Log any errors returned in the response
                    if 'errors' in response_dict:
                        logging.error(f"Error details: {response_dict.get('errors')}")
                elif hasattr(response, 'code') and response.code == 0:
                    success = True
                elif hasattr(response, 'message'):
                    error_message = response.message
                
                # If successful, return immediately
                if success:
                    logging.info("Successfully created carousel ad!")
                    return True
                
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
                logging.error(f"Failed to create carousel ad: {error_message}")
                return False
            
            except Exception as e:
                logging.error(f"Exception during API call: {e}")
                retry_count += 1
                if retry_count <= max_retries:
                    logging.warning(f"Retrying after exception in {backoff_time} seconds... (Attempt {retry_count} of {max_retries})")
                    time.sleep(backoff_time)
                    backoff_time *= 2  # Exponential backoff
                else:
                    logging.error(f"Maximum retries ({max_retries}) exceeded after exception")
                    return False
                
    except ApiException as e:
        logging.error(f"API Exception during ad creation: {e}")
        return False
    except Exception as e:
        logging.error(f"Error creating carousel ad: {e}")
        return False
            
    return False  # Default return if we somehow exit all loops without a return

def create_blank_mp3():
    """
    Create a blank mp3 file for use in carousel ads.
    
    Returns:
        str: Path to the created mp3 file
    """
    try:
        # Create a temporary directory if it doesn't exist
        os.makedirs("temp_audio", exist_ok=True)
        
        # Create a path for the MP3 file
        timestamp = int(time.time())
        mp3_path = f"temp_audio/carousel_music_{timestamp}.mp3"
        
        # If pydub is available, use it to create a proper MP3 file
        try:
            from pydub import AudioSegment
            from pydub.generators import Sine
            
            # Generate 1 second of silence
            one_sec_silence = AudioSegment.silent(duration=1000)
            
            # Export as MP3
            one_sec_silence.export(mp3_path, format="mp3")
            logging.info(f"Created blank mp3 file at {mp3_path} using pydub")
            
        except ImportError:
            # Fallback to creating a minimal valid MP3 file directly
            # This is a very minimal valid MP3 file (essentially just the header)
            minimal_mp3 = bytes.fromhex(
                "FFFB9064000420000000000000000000000000000000000000000000000000000000000000000000"
            )
            
            with open(mp3_path, "wb") as f:
                f.write(minimal_mp3)
            
            logging.info(f"Created minimal mp3 file at {mp3_path} using fallback method")
        
        return mp3_path
        
    except Exception as e:
        logging.error(f"Failed to create blank mp3 file: {e}")
        return None

def search_music_for_carousel(advertiser_id, keyword="tecnology"):
    """Search for music suitable for carousel ads using the Music Search API.
    
    Args:
        advertiser_id: Advertiser ID
        keyword: Search keyword (default: 'tecnology')
        
    Returns:
        str: A valid music ID for carousel ads, or None if none found
    """
    try:
        logging.info(f"Searching for carousel music with keyword: '{keyword}'")
        
        # Create an API client for direct API call
        api_client = business_api_client.ApiClient()
        api_client.configuration.api_key['Access-Token'] = ACCESS_TOKEN
        
        # The TikTok SDK doesn't have a direct method for music search,
        # so we'll use the underlying API client to make the call
        
        # Set up query parameters for music search
        query_params = {
            "advertiser_id": advertiser_id,
            "keyword": keyword,
            "music_scene": "CAROUSEL_ADS",
            "page": 1,
            "page_size": 20
        }
        
        # Make a custom API call to the music search endpoint
        api_path = '/open_api/v1.3/tool/music/search/'
        
        response = api_client.call_api(
            api_path, 'GET',
            path_params={},
            query_params=query_params,
            header_params={},
            body=None,
            post_params=[],
            files={},
            response_type='object',
            auth_settings=[],
            async_req=False,
            _return_http_data_only=True,
            _preload_content=True,
            _request_timeout=None,
            collection_formats={}
        )
        
        # Log the raw response for debugging
        logging.info(f"Music search response: {json.dumps(response, indent=2)}")
        
        # Process the response
        if isinstance(response, dict) and response.get("code") == 0 and response.get("data"):
            music_list = response.get("data", {}).get("list", [])
            if music_list:
                # Log all available music IDs
                for i, music in enumerate(music_list):
                    music_id = music.get("music_id")
                    music_name = music.get("music_name", "Unknown")
                    duration = music.get("duration", "Unknown")
                    logging.info(f"Found carousel music {i+1}: ID={music_id}, Name={music_name}, Duration={duration}s")
                
                # Return the first available music ID
                music_id = music_list[0].get("music_id")
                logging.info(f"Selected carousel music ID: {music_id}")
                return music_id
        
        # If no music found or error in response
        logging.error(f"No music found with keyword '{keyword}' for carousel ads or API error")
        
        # Check if there's an error message in the response
        if isinstance(response, dict) and response.get("message"):
            logging.error(f"API Error: {response.get('message')}")
            
        return None
        
    except Exception as e:
        logging.error(f"Exception during music search: {e}")
        return None

def get_music_for_carousel(advertiser_id):
    """Get music specifically for carousel ads from TikTok's library.
    
    Args:
        advertiser_id: Advertiser ID
        
    Returns:
        str: A valid music ID for carousel ads, or None if none found
    """
    try:
        logging.info("Fetching music for carousel ads from TikTok's library")
        
        # Skip the SDK's API client and use requests directly for more control
        import requests
        
        url = "https://business-api.tiktok.com/open_api/v1.3/file/music/get/"
        
        # Set up query parameters
        params = {
            "advertiser_id": advertiser_id,
            "page": 1,
            "page_size": 50,
            "music_scene": "CAROUSEL_ADS",
            "search_type": "SEARCH_BY_KEYWORD",
            "filtering": json.dumps({"keyword": "tecnology"})
        }
        
        # Set up headers
        headers = {
            "Access-Token": ACCESS_TOKEN
        }
        
        # Make the request directly
        response = requests.get(url, params=params, headers=headers)
        
        # Log the raw response
        logging.info(f"Raw music API response: {response.text}")
        
        # Parse the JSON response
        if response.status_code == 200:
            response_json = response.json()
            
            # Check if the response contains music data
            if response_json.get("code") == 0 and "data" in response_json:
                if "musics" in response_json["data"]:
                    music_list = response_json["data"]["musics"]
                    
                    if music_list and len(music_list) > 0:
                        # Log all the music IDs found
                        for i, music in enumerate(music_list):
                            music_id = music.get("music_id")
                            music_name = music.get("music_name", "Unknown")
                            logging.info(f"Available carousel music {i+1}: ID={music_id}, Name={music_name}")
                        
                        # Return the first available music ID
                        music_id = music_list[0].get("music_id")
                        logging.info(f"Selected carousel music ID: {music_id}")
                        return music_id
        
        # Handle case where no music was found
        logging.error(f"No music found for carousel ads. Response code: {response.status_code}")
        
        # Try a fallback with a hardcoded music ID
        # This is a last resort option - you should replace with a known working ID from your account
        hardcoded_music_id = "7187452411511005186"  # Example ID - replace with one you know works
        logging.info(f"Using hardcoded music ID as fallback: {hardcoded_music_id}")
        return hardcoded_music_id
        
    except Exception as e:
        logging.error(f"Exception during music fetch: {e}")
        import traceback
        logging.error(traceback.format_exc())
        
        # Fallback to hardcoded music ID in case of exception
        hardcoded_music_id = "7187452411511005186"  # Example ID - replace with one you know works
        logging.info(f"Using hardcoded music ID as fallback after exception: {hardcoded_music_id}")
        return hardcoded_music_id

def main():
    """Main function to create a TikTok carousel ad using the SDK"""
    logging.info(f"Starting carousel ad creation for adgroup ID: {ADGROUP_ID}")
    
    # Create test images
    image_paths = create_test_images(num_images=3)
    
    if not image_paths or len(image_paths) < 2:
        logging.error("Failed to create enough test images. At least 2 images are needed for a carousel ad.")
        return False
    
    # Upload each image and collect image IDs
    image_info_list = []
    for image_path in image_paths:
        image_info = upload_local_image(ADVERTISER_ID, image_path)
        if image_info:
            image_info_list.append(image_info)
    
    if len(image_info_list) < 2:
        logging.error("Failed to upload enough images. At least 2 images are needed for a carousel ad.")
        return False
    
    # Get music using Method 1 (Get Music from TikTok's Library)
    music_id = get_music_for_carousel(ADVERTISER_ID)
    
    # If we still don't have a valid music ID, we cannot proceed
    if not music_id:
        logging.error("Could not obtain a valid music ID for carousel ads, cannot proceed")
        # Last resort - try a predefined music ID if you have one from previous successful ads
        # music_id = "YOUR_KNOWN_WORKING_MUSIC_ID"
        return False
    
    logging.info(f"Using music ID: {music_id} for carousel ad")
    
    # Extract image_ids from image_info_list for the carousel ad
    image_ids = [info["image_id"] for info in image_info_list if "image_id" in info]
    
    # Create the carousel ad
    success = create_carousel_ad(
        ADVERTISER_ID,
        ADGROUP_ID,
        image_ids,
        LANDING_PAGE_URL,
        IDENTITY_ID,
        IDENTITY_TYPE,
        music_id
    )
    
    if success:
        logging.info("Successfully created TikTok carousel ad!")
        return True
    else:
        logging.error("Failed to create TikTok carousel ad")
        return False

if __name__ == "__main__":
    main() 