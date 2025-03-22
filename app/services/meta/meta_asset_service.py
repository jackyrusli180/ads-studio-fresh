"""
Meta Asset Service
Handles management of Meta ad assets including images and videos
"""
import logging
import os
import re
from facebook_business.adobjects.adimage import AdImage
from facebook_business.video_uploader import VideoUploader

from app.services.meta.meta_utils import download_image_from_url, download_video_from_url, create_fallback_image

class MetaAssetService:
    """Service for managing Meta ad assets (images and videos)"""
    
    def __init__(self, api, ad_account_id):
        """Initialize the asset service
        
        Args:
            api: Initialized FacebookAdsApi instance
            ad_account_id: Meta ad account ID
        """
        self.api = api
        self.ad_account_id = ad_account_id
    
    def process_assets(self, ad_data):
        """Process ad assets and return processed data
        
        Args:
            ad_data: Dictionary containing ad data and assets
            
        Returns:
            dict: Processed asset data
        """
        try:
            assets = ad_data.get('assets', [])
            if not assets:
                logging.warning("No assets provided for ad creation, using fallback image")
                # Create a fallback image
                image_hash = self.create_and_upload_fallback_image()
                return {'image_hash': image_hash}
            
            # Process image assets
            image_assets = [a for a in assets if a.get('type') == 'image']
            video_assets = [a for a in assets if a.get('type') == 'video']
            
            # Log all image assets for debugging
            logging.info(f"Image assets: {image_assets}")
            
            if image_assets:
                # Use the first image asset
                image_asset = image_assets[0]
                
                # Check if we already have an image hash (from previous creation)
                if 'image_hash' in image_asset and image_asset['image_hash']:
                    image_hash = image_asset['image_hash']
                    logging.info(f"Using provided image hash: {image_hash}")
                # Check if this is a fallback flag
                elif 'use_fallback' in image_asset and image_asset['use_fallback']:
                    logging.info(f"Using fallback image as specified by asset: {image_asset.get('name', 'unnamed')}")
                    image_hash = self.create_and_upload_fallback_image()
                    logging.info(f"Created and uploaded fallback image with hash: {image_hash}")
                else:
                    # Need to upload the image
                    image_url = image_asset.get('url')
                    if not image_url:
                        logging.warning("Image asset missing URL, using fallback image")
                        image_hash = self.create_and_upload_fallback_image()
                    else:
                        # Fix for TikTok URL placeholders
                        if image_url.startswith(('tiktok-url-', 'placeholder-tiktok-url-')):
                            logging.warning(f"Detected TikTok placeholder URL: {image_url}, using real TikTok image URLs")
                            
                            # Check if there are real TikTok URLs in other assets
                            real_tiktok_url = None
                            for asset in assets:
                                asset_url = asset.get('url', '')
                                # Look for real TikTok image URLs (starting with http)
                                if asset_url and asset_url.startswith(('http://', 'https://')) and 'tiktok' in asset_url.lower():
                                    real_tiktok_url = asset_url
                                    logging.info(f"Found real TikTok URL to use: {real_tiktok_url}")
                                    break
                            
                            if real_tiktok_url:
                                image_url = real_tiktok_url
                            else:
                                logging.warning(f"Could not find real TikTok URL, using fallback image")
                                image_hash = self.create_and_upload_fallback_image()
                                return {'image_hash': image_hash}
                        
                        # Check if URL is valid
                        if not (image_url.startswith('http://') or image_url.startswith('https://')):
                            logging.warning(f"Invalid image URL format: {image_url}, using fallback")
                            image_hash = self.create_and_upload_fallback_image()
                        else:
                            # Upload the image with valid URL
                            image_hash = self.upload_image(image_url)
                            logging.info(f"Uploaded image with hash: {image_hash}")
                    
                return {'image_hash': image_hash}
            
            elif video_assets:
                # Use the first video asset
                video_url = video_assets[0].get('url')
                if not video_url:
                    logging.warning("Video asset missing URL, using fallback image")
                    image_hash = self.create_and_upload_fallback_image()
                    return {'image_hash': image_hash}
                
                # Fix for TikTok URL placeholders
                if video_url.startswith(('tiktok-url-', 'placeholder-tiktok-url-')):
                    logging.warning(f"Detected TikTok placeholder URL for video: {video_url}, using fallback image")
                    image_hash = self.create_and_upload_fallback_image()
                    return {'image_hash': image_hash}
                
                # Check if URL is valid
                if not (video_url.startswith('http://') or video_url.startswith('https://')):
                    logging.warning(f"Invalid video URL format: {video_url}, using fallback image")
                    image_hash = self.create_and_upload_fallback_image()
                    return {'image_hash': image_hash}
                
                # Upload video and get video ID
                video_id = self.upload_video(video_url, f"Video for {ad_data.get('name', 'New Ad')}")
                
                # Create video asset data
                video_asset_data = {
                    'type': 'video',
                    'video_id': video_id,
                    'title': ad_data.get('headline', 'Check this out!'),
                    'message': ad_data.get('message', 'Check out our video!'),
                    'call_to_action': {
                        'type': 'DOWNLOAD',
                        'value': {
                            'link': ad_data.get('link_url', 'https://www.facebook.com'),
                            'object_store_urls': {
                                'android': ad_data.get('object_store_url_android', ''),
                                'iphone': ad_data.get('object_store_url_ios', ''),
                                'ipad': ad_data.get('object_store_url_ios', '')
                            }
                        }
                    }
                }
                
                return video_asset_data
            
            else:
                logging.warning("No valid image or video assets provided, using fallback image")
                # Create a fallback image
                image_hash = self.create_and_upload_fallback_image()
                
                return {'image_hash': image_hash}
            
        except Exception as e:
            logging.error(f"Error processing assets: {str(e)}")
            logging.warning("Using fallback image due to asset processing error")
            try:
                # Try to create fallback image even in case of error
                image_hash = self.create_and_upload_fallback_image()
                return {'image_hash': image_hash}
            except Exception as fallback_error:
                logging.error(f"Error creating fallback image: {fallback_error}")
                raise

    def upload_image(self, image_url):
        """Upload an image from URL to Meta Ad Account and get the image hash
        
        Args:
            image_url: URL of the image to upload
            
        Returns:
            str: Image hash if successful
        """
        try:
            logging.info(f"Downloading image from URL: {image_url}")
            
            # Download the image
            temp_file_path = download_image_from_url(image_url)
            if not temp_file_path:
                raise ValueError(f"Failed to download image from {image_url}")
                
            logging.info(f"Successfully downloaded image to: {temp_file_path}")
            
            # Upload the image to Meta
            image = AdImage(parent_id=f'act_{self.ad_account_id}')
            image[AdImage.Field.filename] = temp_file_path
            image.remote_create()
            
            # Get the image hash
            image_hash = image[AdImage.Field.hash]
            logging.info(f"Uploaded image with hash: {image_hash}")
            
            # Clean up the temporary file
            try:
                os.unlink(temp_file_path)
                logging.info(f"Removed temporary image file: {temp_file_path}")
            except Exception as cleanup_error:
                logging.warning(f"Error cleaning up temporary file: {cleanup_error}")
            
            return image_hash
            
        except Exception as e:
            logging.error(f"Error uploading image: {str(e)}")
            raise

    def upload_video(self, video_url, name, page_id=None):
        """Upload a video from URL to Meta Ad Account and get the video ID
        
        Args:
            video_url: URL of the video to upload
            name: Name to give the video in Meta
            page_id: Optional page ID to associate with the video
            
        Returns:
            str: Video ID if successful
        """
        try:
            logging.info(f"Downloading video from URL: {video_url}")
            
            # Download the video using the helper method
            temp_file_path = download_video_from_url(video_url)
            if not temp_file_path:
                raise ValueError(f"Failed to download video from {video_url}")
                
            logging.info(f"Successfully downloaded video to: {temp_file_path}")
            
            try:
                # Upload the video
                params = {
                    'name': name
                }
                
                logging.info(f"Starting Meta video upload for file: {temp_file_path}")
                
                # Use page_id or ad_account_id as the parent
                parent_id = page_id if page_id else f"act_{self.ad_account_id}"
                
                video = VideoUploader(
                    session=self.api,
                    page_id=parent_id,
                    filepath=temp_file_path,
                    params=params
                ).start()
                
                video_id = video['id']
                logging.info(f"Successfully uploaded video to Meta, received video ID: {video_id}")
                
                # Clean up the temporary file
                try:
                    os.unlink(temp_file_path)
                    logging.info(f"Removed temporary video file: {temp_file_path}")
                except Exception as cleanup_error:
                    logging.warning(f"Error cleaning up temporary file: {cleanup_error}")
                
                return video_id
                
            except Exception as upload_error:
                # Clean up in case of error
                if os.path.exists(temp_file_path):
                    try:
                        os.unlink(temp_file_path)
                        logging.info(f"Removed temporary video file after error: {temp_file_path}")
                    except Exception:
                        pass
                
                logging.error(f"Error uploading video to Meta: {str(upload_error)}")
                raise ValueError(f"Failed to upload video to Meta: {str(upload_error)}")
                
        except Exception as e:
            logging.error(f"Error in upload_video method: {str(e)}")
            raise ValueError(f"Video upload process failed: {str(e)}")

    def create_and_upload_fallback_image(self):
        """Create a fallback image and upload it to Meta
        
        Returns:
            str: Image hash of the fallback image
        """
        fallback_path = create_fallback_image()
        
        # Upload the fallback image
        image = AdImage(parent_id=f'act_{self.ad_account_id}')
        image[AdImage.Field.filename] = fallback_path
        image.remote_create()
        
        image_hash = image[AdImage.Field.hash]
        logging.info(f"Uploaded fallback image with hash: {image_hash}")
        
        return image_hash 