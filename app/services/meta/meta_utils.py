"""
Utility functions for Meta Advertising Service
"""
import logging
import os
import tempfile
import time
import requests
from urllib.parse import urlparse
import traceback

def download_image_from_url(url):
    """Download an image from URL to a temporary file
    
    Args:
        url: URL of the image to download
        
    Returns:
        str: Path to downloaded file or None if download failed
    """
    try:
        logging.info(f"Downloading image from URL: {url}")
        
        # Parse filename from URL
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename or '.' not in filename:
            # Create a temporary filename with .jpg extension
            filename = f"meta_image_{int(time.time())}.jpg"
            
        # Create a temporary file
        temp_path = os.path.join('/tmp', filename)
        logging.info(f"Will save image to: {temp_path}")
        
        # Download the image
        response = requests.get(url, timeout=30)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        with open(temp_path, 'wb') as f:
            f.write(response.content)
            
        # Verify file exists and has content
        if os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            logging.info(f"Successfully downloaded image to: {temp_path}")
            return temp_path
        else:
            logging.error(f"Failed to download image to {temp_path}")
            return None
            
    except Exception as e:
        logging.error(f"Error downloading image from URL: {str(e)}")
        return None

def download_video_from_url(url):
    """Download a video from URL to a temporary file
    
    Args:
        url: URL of the video to download
        
    Returns:
        str: Path to downloaded file or None if download failed
    """
    try:
        logging.info(f"Downloading video from URL: {url}")
        
        # Parse filename from URL
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        if not filename or '.' not in filename:
            # Create a temporary filename with MP4 extension
            filename = f"meta_video_{int(time.time())}.mp4"
            
        # Create a temporary file
        temp_path = os.path.join('/tmp', filename)
        logging.info(f"Will save video to: {temp_path}")
        
        # Download the video
        try:
            # Set a timeout to avoid hanging indefinitely 
            logging.info(f"Starting request to URL: {url}")
            response = requests.get(url, stream=True, timeout=60)  # Longer timeout for videos
            
            # Check response status
            logging.info(f"Response status code: {response.status_code}")
            response.raise_for_status()  # Raise exception for HTTP errors
            
            # Log content type
            content_type = response.headers.get('content-type', 'unknown')
            logging.info(f"Response content type: {content_type}")
            
            # Download the file
            logging.info(f"Writing response to file: {temp_path}")
            with open(temp_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            # Verify file exists and has content
            if os.path.exists(temp_path):
                file_size = os.path.getsize(temp_path)
                logging.info(f"File downloaded successfully. Size: {file_size} bytes")
                if file_size == 0:
                    logging.error(f"Downloaded file is empty: {temp_path}")
                    return None
            else:
                logging.error(f"Failed to create file: {temp_path}")
                return None
                
            logging.info(f"Successfully downloaded video to: {temp_path}")
            return temp_path
            
        except requests.exceptions.RequestException as req_error:
            logging.error(f"Request error downloading video: {str(req_error)}")
            logging.error(f"Request error type: {type(req_error).__name__}")
            return None
            
    except Exception as e:
        logging.error(f"Unexpected error downloading video from URL: {str(e)}")
        logging.error(f"Error type: {type(e).__name__}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return None

def create_fallback_image():
    """Create a simple fallback image for emergencies
    
    Returns:
        str: Path to the created image
    """
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        logging.error("PIL library is not available for creating fallback image")
        # Create a simple text file as fallback
        temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        with open(temp_file.name, 'w') as f:
            f.write("Fallback image - PIL not available")
        return temp_file.name
        
    # Create a blank image with white background
    img = Image.new('RGB', (1200, 628), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Add text to the image
    text = "OKX"
    
    # Use default font
    try:
        # Try to get a default system font
        font = ImageFont.truetype("Arial", 72)
    except:
        # Fallback to default
        font = ImageFont.load_default()
    
    # Calculate text position to center it
    text_width, text_height = draw.textsize(text, font=font) if hasattr(draw, 'textsize') else (300, 100)
    position = ((1200 - text_width) // 2, (628 - text_height) // 2)
    
    # Draw text on the image
    draw.text(position, text, fill=(0, 0, 0), font=font)
    
    # Save the image to a temporary file
    temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
    img.save(temp_file.name)
    
    logging.info(f"Created fallback image at: {temp_file.name}")
    return temp_file.name 