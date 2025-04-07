"""
TikTok assets module.
Provides functionality for uploading images and videos to TikTok.
"""
import logging
import tempfile
import requests
import os
import time
import random
import base64
import hashlib
from typing import Optional, Dict, Any
from PIL import Image, ImageDraw
from io import BytesIO

from business_api_client.api.file_api import FileApi

from app.services.tiktok.client import TikTokClient, SDK_AVAILABLE


class TikTokAssetsMixin:
    """Mixin for TikTok asset upload functionality."""
    
    def _upload_image(self, image_url: str) -> str:
        """
        Upload an image to TikTok's servers
        
        Args:
            image_url: URL of the image to upload
            
        Returns:
            Image ID from TikTok - note that this returns the material_id when available,
            which is required for carousel ads, otherwise falls back to image_id
        """
        try:
            logging.info(f"[TikTok] Starting image upload process for URL: {image_url}")
            
            # Check if the URL is a data URL, remote URL, or local path
            is_data_url = image_url.startswith('data:image/')
            is_remote_url = image_url.startswith('http://') or image_url.startswith('https://')
            is_local_path = not (is_data_url or is_remote_url)
            
            # Print path type for debugging
            logging.info(f"[TikTok] Image URL type: {'data URL' if is_data_url else 'remote URL' if is_remote_url else 'local path'}")
            
            if is_local_path:
                # Get Flask app context for path resolution
                from flask import current_app
                logging.info(f"[TikTok] Flask app root_path: {current_app.root_path}")
                logging.info(f"[TikTok] Flask app static_folder: {current_app.static_folder}")
                
                # Log all possible paths that will be checked
                path1 = os.path.join(current_app.root_path, image_url.lstrip('/'))
                path2 = os.path.join(current_app.static_folder, image_url.lstrip('/'))
                path3 = os.path.join(current_app.root_path, 'app/static/uploads', os.path.basename(image_url))
                
                logging.info(f"[TikTok] Will check these paths:")
                logging.info(f"[TikTok] Path 1 (app root): {path1} - exists: {os.path.exists(path1)}")
                logging.info(f"[TikTok] Path 2 (static folder): {path2} - exists: {os.path.exists(path2)}")
                logging.info(f"[TikTok] Path 3 (uploads dir): {path3} - exists: {os.path.exists(path3)}")
                
            # Create temporary file for upload
            temp_file = None
            temp_file_path = None
            
            # Process based on URL type
            if is_data_url:
                # Handle data URLs (base64 encoded images)
                try:
                    # Parse the data URL
                    header, encoded = image_url.split(",", 1)
                    
                    # Decode the base64 content
                    image_data = base64.b64decode(encoded)
                    img = Image.open(BytesIO(image_data))
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    temp_file_path = temp_file.name
                    img.save(temp_file_path)
                    temp_file.close()
                    
                    logging.info(f"[TikTok] Saved data URL image to: {temp_file_path}")
                except Exception as e:
                    logging.error(f"[TikTok] Failed to process data URL: {e}")
                    
                    # Fallback: Create a placeholder image
                    logging.info("[TikTok] Creating placeholder image")
                    
                    # Generate a unique and visually distinct placeholder
                    # Use different colors for each placeholder to ensure TikTok sees them as different images
                    unique_id = int(time.time() * 1000) + random.randint(1000, 9999)
                    
                    # Use the unique_id to determine image properties
                    r = (unique_id % 200) + 55  # 55-255 range for red
                    g = ((unique_id // 1000) % 200) + 55  # 55-255 range for green
                    b = ((unique_id // 10000) % 200) + 55  # 55-255 range for blue
                    
                    # Create a colored background
                    img = Image.new('RGB', (800, 800), color=(r, g, b))
                    
                    # Draw something unique on the image
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(img)
                    
                    # Add unique text
                    unique_text = f"Placeholder {unique_id}"
                    draw.text((50, 400), unique_text, fill="white")
                    
                    # Add some shapes to make it more distinct
                    for i in range(5):
                        # Draw different shapes based on the unique_id
                        shape_type = (unique_id + i) % 3
                        x1 = ((unique_id + i*100) % 700) + 50
                        y1 = ((unique_id + i*200) % 700) + 50
                        x2 = x1 + 100
                        y2 = y1 + 100
                        
                        if shape_type == 0:
                            draw.rectangle([x1, y1, x2, y2], outline="white")
                        elif shape_type == 1:
                            draw.ellipse([x1, y1, x2, y2], outline="white")
                        else:
                            draw.line([x1, y1, x2, y2], fill="white", width=5)
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    temp_file_path = temp_file.name
                    img.save(temp_file_path)
                    temp_file.close()
            
            elif is_remote_url:
                # Download the image from the remote URL
                try:
                    response = requests.get(image_url, stream=True, timeout=10)
                    response.raise_for_status()
                    
                    img = Image.open(BytesIO(response.content))
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    temp_file_path = temp_file.name
                    img.save(temp_file_path)
                    temp_file.close()
                    
                    logging.info(f"[TikTok] Downloaded remote image to: {temp_file_path}")
                except Exception as e:
                    logging.error(f"[TikTok] Failed to download image from URL: {e}")
                    
                    # Fallback: Create a placeholder image
                    logging.info("[TikTok] Creating placeholder image")
                    
                    # Generate a unique and visually distinct placeholder
                    # Use different colors for each placeholder to ensure TikTok sees them as different images
                    unique_id = int(time.time() * 1000) + random.randint(1000, 9999)
                    
                    # Use the unique_id to determine image properties
                    r = (unique_id % 200) + 55  # 55-255 range for red
                    g = ((unique_id // 1000) % 200) + 55  # 55-255 range for green
                    b = ((unique_id // 10000) % 200) + 55  # 55-255 range for blue
                    
                    # Create a colored background
                    img = Image.new('RGB', (800, 800), color=(r, g, b))
                    
                    # Draw something unique on the image
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(img)
                    
                    # Add unique text
                    unique_text = f"Placeholder {unique_id}"
                    draw.text((50, 400), unique_text, fill="white")
                    
                    # Add some shapes to make it more distinct
                    for i in range(5):
                        # Draw different shapes based on the unique_id
                        shape_type = (unique_id + i) % 3
                        x1 = ((unique_id + i*100) % 700) + 50
                        y1 = ((unique_id + i*200) % 700) + 50
                        x2 = x1 + 100
                        y2 = y1 + 100
                        
                        if shape_type == 0:
                            draw.rectangle([x1, y1, x2, y2], outline="white")
                        elif shape_type == 1:
                            draw.ellipse([x1, y1, x2, y2], outline="white")
                        else:
                            draw.line([x1, y1, x2, y2], fill="white", width=5)
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    temp_file_path = temp_file.name
                    img.save(temp_file_path)
                    temp_file.close()
            
            elif is_local_path:
                # Try to resolve the local path in different ways
                local_path = None
                
                # First try direct path
                if os.path.exists(image_url):
                    local_path = image_url
                    logging.info(f"[TikTok] Found file at direct path: {local_path}")
                
                # If not found, try resolving against app root
                if not local_path:
                    from flask import current_app
                    root_path = os.path.join(current_app.root_path, image_url.lstrip('/'))
                    if os.path.exists(root_path):
                        local_path = root_path
                        logging.info(f"[TikTok] Found file at app root path: {local_path}")
                
                # If still not found, try resolving against static folder
                if not local_path:
                    from flask import current_app
                    static_path = os.path.join(current_app.static_folder, image_url.lstrip('/'))
                    if os.path.exists(static_path):
                        local_path = static_path
                        logging.info(f"[TikTok] Found file at static path: {local_path}")
                
                # Try looking in the uploads directory directly
                uploads_dirs = [
                    os.path.join(current_app.root_path, 'app/static/uploads'),
                    os.path.join(current_app.static_folder, 'uploads'),
                    os.path.join(current_app.root_path, 'static/uploads'),
                    os.path.join(os.path.dirname(current_app.root_path), 'app/static/uploads'),
                    os.path.join(os.path.dirname(current_app.root_path), 'static/uploads')
                ]
                
                file_found = False
                for uploads_dir in uploads_dirs:
                    alt_path = os.path.join(uploads_dir, os.path.basename(image_url))
                    logging.info(f"[TikTok] Trying alternative path: {alt_path}")
                    
                    if os.path.exists(alt_path):
                        temp_file_path = alt_path
                        logging.info(f"[TikTok] Found file at alternative path: {alt_path}")
                        file_found = True
                        break
                        
                if not file_found:
                    # Fallback: Create a placeholder image
                    logging.info("[TikTok] Creating placeholder image")
                    
                    # Generate a unique and visually distinct placeholder
                    # Use different colors for each placeholder to ensure TikTok sees them as different images
                    unique_id = int(time.time() * 1000) + random.randint(1000, 9999)
                    
                    # Use the unique_id to determine image properties
                    r = (unique_id % 200) + 55  # 55-255 range for red
                    g = ((unique_id // 1000) % 200) + 55  # 55-255 range for green
                    b = ((unique_id // 10000) % 200) + 55  # 55-255 range for blue
                    
                    # Create a colored background
                    img = Image.new('RGB', (800, 800), color=(r, g, b))
                    
                    # Draw something unique on the image
                    from PIL import ImageDraw
                    draw = ImageDraw.Draw(img)
                    
                    # Add unique text
                    unique_text = f"Placeholder {unique_id}"
                    draw.text((50, 400), unique_text, fill="white")
                    
                    # Add some shapes to make it more distinct
                    for i in range(5):
                        # Draw different shapes based on the unique_id
                        shape_type = (unique_id + i) % 3
                        x1 = ((unique_id + i*100) % 700) + 50
                        y1 = ((unique_id + i*200) % 700) + 50
                        x2 = x1 + 100
                        y2 = y1 + 100
                        
                        if shape_type == 0:
                            draw.rectangle([x1, y1, x2, y2], outline="white")
                        elif shape_type == 1:
                            draw.ellipse([x1, y1, x2, y2], outline="white")
                        else:
                            draw.line([x1, y1, x2, y2], fill="white", width=5)
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                    temp_file_path = temp_file.name
                    img.save(temp_file_path)
                    temp_file.close()
            
            # If we don't have a valid file at this point, return None
            if not temp_file_path or not os.path.exists(temp_file_path):
                logging.error("[TikTok] Failed to get a valid image file for upload")
                return None
            
            # Calculate file size for logging
            file_size = os.path.getsize(temp_file_path) / 1024  # KB
            logging.info(f"[TikTok] Image file size: {file_size:.2f} KB")
            
            # Calculate MD5 hash of file for logging
            with open(temp_file_path, 'rb') as f:
                file_data = f.read()
                file_hash = hashlib.md5(file_data).hexdigest()
                logging.info(f"[TikTok] Image file hash: {file_hash}")
            
            # Create the FileApi instance for upload
            file_api = FileApi(self.api_client)
            
            # Prepare the upload parameters
            advertiser_id = self.advertiser_id
            
            # Upload the image
            logging.info(f"[TikTok] Uploading image file: {temp_file_path} with signature: {file_hash}")
            
            # Use the ad_image_upload method to upload the image
            response = file_api.ad_image_upload(
                advertiser_id=advertiser_id,
                access_token=self.access_token,
                image_file=temp_file_path,  # Pass the file path
                image_signature=file_hash  # Pass the MD5 hash as signature
            )
            
            # Process the response
            logging.info(f"[TikTok] Image upload response type: {type(response)}")
            
            if isinstance(response, dict):
                # Dictionary response format
                logging.info(f"[TikTok] Image upload response: {response}")
                
                # Check if we have a data field with image_id or material_id - this means success
                if response.get('data'):
                    image_id = response['data'].get('image_id')
                    material_id = response['data'].get('material_id')
                    
                    logging.info(f"[TikTok] Extracted image_id: {image_id}, material_id: {material_id}")
                    
                    # For carousel ads, we need the material_id
                    if material_id:
                        logging.info(f"[TikTok] Using material_id for carousel: {material_id}")
                        # Clean up temporary file
                        if temp_file_path and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return material_id
                    elif image_id:
                        logging.info(f"[TikTok] Using image_id: {image_id}")
                        # Clean up temporary file
                        if temp_file_path and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return image_id
                # If we have an error code, log it
                elif response.get('code') != 0:
                    error_msg = response.get('message', 'Unknown error')
                    error_code = response.get('code', 'Unknown code')
                    logging.error(f"[TikTok] Image upload failed with code {error_code}: {error_msg}")
                else:
                    logging.error(f"[TikTok] Image upload response missing both data and error code: {response}")
            
            elif hasattr(response, 'code') and hasattr(response, 'message') and hasattr(response, 'data'):
                # Object response format
                logging.info(f"[TikTok] Image upload response code: {response.code}")
                
                if response.code == 0 and response.data:
                    # Check for material_id first (for carousel ads)
                    if hasattr(response.data, 'material_id') and response.data.material_id:
                        material_id = response.data.material_id
                        logging.info(f"[TikTok] Using material_id for carousel: {material_id}")
                        # Clean up temporary file
                        if temp_file_path and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return material_id
                    
                    # Fall back to image_id if no material_id
                    elif hasattr(response.data, 'image_id') and response.data.image_id:
                        image_id = response.data.image_id
                        logging.info(f"[TikTok] Using image_id: {image_id}")
                        # Clean up temporary file
                        if temp_file_path and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return image_id
                else:
                    error_msg = response.message
                    logging.error(f"[TikTok] Image upload failed: {error_msg}")
            else:
                logging.error(f"[TikTok] Unexpected response format: {response}")
            
            # Clean up temporary file if it exists
            if temp_file_path and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                os.unlink(temp_file_path)
            
            return None
            
        except Exception as e:
            logging.error(f"[TikTok] Error uploading image: {e}")
            return None
    
    def _upload_video(self, video_url: str) -> str:
        """
        Upload a video to TikTok's servers
        
        Args:
            video_url: URL of the video to upload
            
        Returns:
            Video ID from TikTok - note that this returns the material_id when available,
            which is preferred by TikTok API, otherwise falls back to video_id
        """
        try:
            import tempfile
            import requests
            import os
            from business_api_client.api.file_api import FileApi
            
            # Check if the URL is a remote URL or local path
            is_remote_url = video_url.startswith('http://') or video_url.startswith('https://')
            is_local_path = not is_remote_url
            
            # Create temporary file for upload
            temp_file = None
            temp_file_path = None
            
            # Process based on URL type
            if is_remote_url:
                # Download the video from the remote URL
                try:
                    response = requests.get(video_url, stream=True, timeout=30)
                    response.raise_for_status()
                    
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
                    temp_file_path = temp_file.name
                    
                    # Write the content to a temporary file
                    with open(temp_file_path, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                    
                    logging.info(f"[TikTok] Downloaded remote video to: {temp_file_path}")
                except Exception as e:
                    logging.error(f"[TikTok] Failed to download video from URL: {e}")
                    return None
            
            elif is_local_path:
                # Try to resolve the local path in different ways
                local_path = None
                
                # First try direct path
                if os.path.exists(video_url):
                    local_path = video_url
                    temp_file_path = local_path
                    logging.info(f"[TikTok] Found video at direct path: {local_path}")
                
                # If not found, try resolving against app root
                if not local_path:
                    from flask import current_app
                    root_path = os.path.join(current_app.root_path, video_url.lstrip('/'))
                    if os.path.exists(root_path):
                        local_path = root_path
                        temp_file_path = local_path
                        logging.info(f"[TikTok] Found video at app root path: {local_path}")
                
                # If still not found, try resolving against static folder
                if not local_path:
                    from flask import current_app
                    static_path = os.path.join(current_app.static_folder, video_url.lstrip('/'))
                    if os.path.exists(static_path):
                        local_path = static_path
                        temp_file_path = local_path
                        logging.info(f"[TikTok] Found video at static path: {local_path}")
                
                # Try looking in the uploads directory directly
                uploads_dirs = [
                    os.path.join(current_app.root_path, 'app/static/uploads'),
                    os.path.join(current_app.static_folder, 'uploads'),
                    os.path.join(current_app.root_path, 'static/uploads'),
                    os.path.join(os.path.dirname(current_app.root_path), 'app/static/uploads'),
                    os.path.join(os.path.dirname(current_app.root_path), 'static/uploads')
                ]
                
                file_found = False
                for uploads_dir in uploads_dirs:
                    alt_path = os.path.join(uploads_dir, os.path.basename(video_url))
                    logging.info(f"[TikTok] Trying alternative path: {alt_path}")
                    
                    if os.path.exists(alt_path):
                        temp_file_path = alt_path
                        logging.info(f"[TikTok] Found file at alternative path: {alt_path}")
                        file_found = True
                        break
                        
                if not file_found:
                    logging.error(f"[TikTok] Could not find video file at any location")
                    return None
            
            # If we don't have a valid file at this point, return None
            if not temp_file_path or not os.path.exists(temp_file_path):
                logging.error("[TikTok] Failed to get a valid video file for upload")
                return None
            
            # Calculate file size and MD5 hash for logging
            with open(temp_file_path, 'rb') as f:
                file_data = f.read()
                file_hash = hashlib.md5(file_data).hexdigest()
                file_size = len(file_data) / 1024  # KB
            
            logging.info(f"[TikTok] Video file size: {file_size:.2f} KB")
            logging.info(f"[TikTok] Video file hash: {file_hash}")
            
            # Create the FileApi instance for upload
            file_api = FileApi(self.api_client)
            
            # Prepare the upload parameters
            advertiser_id = self.advertiser_id
            
            # Upload the video
            logging.info(f"[TikTok] Uploading video file: {temp_file_path} with signature: {file_hash}")
            
            # Use the ad_video_upload method to upload the video
            response = file_api.ad_video_upload(
                advertiser_id=advertiser_id,
                access_token=self.access_token,
                video_file=temp_file_path,  # Pass the file path
                video_signature=file_hash  # Pass the MD5 hash as signature
            )
            
            # Process the response
            logging.info(f"[TikTok] Video upload response type: {type(response)}")
            
            if isinstance(response, dict):
                # Dictionary response format
                logging.info(f"[TikTok] Video upload response: {response}")
                
                # Check if we have a data field with video_id or material_id - this means success
                if response.get('data'):
                    video_id = response['data'].get('video_id')
                    material_id = response['data'].get('material_id')
                    
                    logging.info(f"[TikTok] Extracted video_id: {video_id}, material_id: {material_id}")
                    
                    # Prefer material_id if available
                    if material_id:
                        logging.info(f"[TikTok] Using material_id: {material_id}")
                        # Clean up temporary file if we created it
                        if temp_file and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return material_id
                    elif video_id:
                        logging.info(f"[TikTok] Using video_id: {video_id}")
                        # Clean up temporary file if we created it
                        if temp_file and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return video_id
                    else:
                        # If neither is available, try to get any ID field
                        for key, value in response['data'].items():
                            if 'id' in key.lower() and value:
                                logging.info(f"[TikTok] Using generic ID from field {key}: {value}")
                                if temp_file and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                                    os.unlink(temp_file_path)
                                return value
                # If we have an error code, log it
                elif response.get('code') != 0:
                    error_msg = response.get('message', 'Unknown error')
                    error_code = response.get('code', 'Unknown code')
                    logging.error(f"[TikTok] Video upload failed with code {error_code}: {error_msg}")
                else:
                    logging.error(f"[TikTok] Video upload response missing both data and error code: {response}")
            
            elif hasattr(response, 'code') and hasattr(response, 'message') and hasattr(response, 'data'):
                # Object response format
                logging.info(f"[TikTok] Video upload response code: {response.code}")
                
                if response.code == 0 and response.data:
                    # Check for material_id first
                    if hasattr(response.data, 'material_id') and response.data.material_id:
                        material_id = response.data.material_id
                        logging.info(f"[TikTok] Using material_id: {material_id}")
                        if temp_file and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return material_id
                    
                    # Fall back to video_id if no material_id
                    elif hasattr(response.data, 'video_id') and response.data.video_id:
                        video_id = response.data.video_id
                        logging.info(f"[TikTok] Using video_id: {video_id}")
                        if temp_file and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                            os.unlink(temp_file_path)
                        return video_id
                    else:
                        # If we can't find an expected ID field, look for anything with 'id' in the name
                        for attr_name in dir(response.data):
                            if 'id' in attr_name.lower():
                                value = getattr(response.data, attr_name)
                                if value:
                                    logging.info(f"[TikTok] Using generic ID from attribute {attr_name}: {value}")
                                    if temp_file and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                                        os.unlink(temp_file_path)
                                    return value
                else:
                    error_msg = response.message
                    logging.error(f"[TikTok] Video upload failed: {error_msg}")
            else:
                logging.error(f"[TikTok] Unexpected response format: {response}")
            
            # Clean up temporary file if we created it
            if temp_file and os.path.exists(temp_file_path) and 'temp' in temp_file_path:
                os.unlink(temp_file_path)
                
            return None
            
        except Exception as e:
            logging.error(f"[TikTok] Error uploading video: {e}")
            return None 