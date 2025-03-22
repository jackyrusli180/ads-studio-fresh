"""
Asset Service
Handles operations related to media assets (images, videos)
"""
import os
import json
from datetime import datetime
import uuid
import logging
from PIL import Image, ImageDraw, ImageFont

# Define the project root
project_root = os.getcwd()  # Get the current working directory

class AssetService:
    """Service for managing media assets including images and videos"""
    
    def __init__(self):
        """Initialize the asset service"""
        self.assets_file = os.path.join(project_root, 'app', 'data', 'assets.json')
        self.uploads_dir = os.path.join(project_root, 'app', 'static', 'uploads')
        self._ensure_dirs_exist()
        
    def _ensure_dirs_exist(self):
        """Ensure necessary directories exist"""
        if not os.path.exists(self.uploads_dir):
            os.makedirs(self.uploads_dir)
            
    def _load_assets(self):
        """Load assets from the JSON file"""
        # Ensure parent directory exists
        assets_dir = os.path.dirname(self.assets_file)
        if not os.path.exists(assets_dir):
            os.makedirs(assets_dir, exist_ok=True)
        
        if not os.path.exists(self.assets_file):
            # Create empty assets file if it doesn't exist
            with open(self.assets_file, 'w') as f:
                json.dump([], f)
            return []
        
        try:
            with open(self.assets_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            # Handle corrupted or missing file
            return []
    
    def _save_assets(self, assets):
        """Save assets to the JSON file"""
        # Ensure parent directory exists
        assets_dir = os.path.dirname(self.assets_file)
        if not os.path.exists(assets_dir):
            os.makedirs(assets_dir, exist_ok=True)
        
        with open(self.assets_file, 'w') as f:
            json.dump(assets, f)
    
    def get_all_assets(self, asset_type=None):
        """
        Get all assets, optionally filtered by type
        
        Args:
            asset_type: Optional filter for asset type ('image' or 'video')
            
        Returns:
            List of asset objects
        """
        assets = self._load_assets()
        
        if asset_type:
            assets = [asset for asset in assets if asset.get('type') == asset_type]
            
        return assets
    
    def get_asset_by_id(self, asset_id):
        """
        Get an asset by its ID
        
        Args:
            asset_id: The ID of the asset to retrieve
            
        Returns:
            Asset object or None if not found
        """
        assets = self._load_assets()
        
        for asset in assets:
            if asset.get('id') == asset_id:
                return asset
                
        return None
    
    def get_assets_by_ids(self, asset_ids):
        """
        Get multiple assets by their IDs
        
        Args:
            asset_ids: List of asset IDs to retrieve
            
        Returns:
            List of asset objects that match the provided IDs
        """
        logging.info(f"[AssetService] Looking for assets with IDs: {asset_ids}")
        
        if not asset_ids:
            logging.warning("[AssetService] No asset IDs provided")
            return []
            
        assets = self._load_assets()
        logging.info(f"[AssetService] Loaded {len(assets)} total assets from database")
        
        found_assets = []
        not_found = []
        
        # Handle client-side temporary IDs (like "asset-1")
        for asset_id in asset_ids:
            # Handle TikTok URL assets (like "tiktok-url-1")
            if asset_id.startswith('tiktok-url-'):
                logging.info(f"[AssetService] Processing TikTok URL asset: {asset_id}")
                
                # Define the list of TikTok image URLs (same as in asset_routes.py)
                tiktok_image_urls = [
                    "https://static-01.daraz.lk/p/79cc06e0fb28d7114d23fe4488df2f5f.png",
                    "https://static-01.daraz.lk/p/7d1d09c42675d09950cf6f2bf7d58ccc.png",
                    "https://static-01.daraz.lk/p/f4aee08894eacd05d63a6eedeae8ccc3.png",
                    "https://static-01.daraz.lk/p/7d1d09c42675d09950cf6f2bf7d58ccc.png",
                    "https://static-01.daraz.lk/p/bd8ca56a598f2a1a2a6ebd1d8913567e.png"
                ]
                
                # Extract the index from the asset ID
                try:
                    idx = int(asset_id.split('-')[-1])
                    if 0 <= idx < len(tiktok_image_urls):
                        url = tiktok_image_urls[idx]
                        filename = url.split('/')[-1]
                        
                        # Create a mock asset for the TikTok URL
                        mock_asset = {
                            'id': asset_id,
                            'name': filename,
                            'file_path': url,
                            'url': url,
                            'type': 'image',
                            'metadata': {
                                'mime_type': 'image/png',
                                'is_remote_url': True
                            }
                        }
                        found_assets.append(mock_asset)
                        logging.info(f"[AssetService] Created mock asset for TikTok URL: {url}")
                    else:
                        logging.warning(f"[AssetService] TikTok URL index out of range: {idx}")
                        not_found.append(asset_id)
                except (ValueError, IndexError) as e:
                    logging.error(f"[AssetService] Error parsing TikTok URL asset ID: {e}")
                    not_found.append(asset_id)
                
                continue
            
            # Handle TikTok video assets
            if asset_id.startswith('tiktok-video-'):
                logging.info(f"[AssetService] Processing TikTok video asset: {asset_id}")
                
                # Define the list of TikTok video URLs (same as in asset_routes.py)
                tiktok_video_urls = [
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
                ]
                
                # Extract the index from the asset ID
                try:
                    idx = int(asset_id.split('-')[-1])
                    if 0 <= idx < len(tiktok_video_urls):
                        url = tiktok_video_urls[idx]
                        filename = url.split('/')[-1]
                        
                        # Create a mock asset for the TikTok video URL
                        mock_asset = {
                            'id': asset_id,
                            'name': filename,
                            'file_path': url,
                            'url': url,
                            'type': 'video',
                            'metadata': {
                                'mime_type': 'video/mp4',
                                'is_remote_url': True
                            }
                        }
                        found_assets.append(mock_asset)
                        logging.info(f"[AssetService] Created mock asset for TikTok video URL: {url}")
                    else:
                        logging.warning(f"[AssetService] TikTok video URL index out of range: {idx}")
                        not_found.append(asset_id)
                except (ValueError, IndexError) as e:
                    logging.error(f"[AssetService] Error parsing TikTok video URL asset ID: {e}")
                    not_found.append(asset_id)
                
                continue
            
            # For client-side temporary IDs, we'll create a mock asset
            if asset_id.startswith('asset-'):
                logging.info(f"[AssetService] Creating temporary asset for client-side ID: {asset_id}")
                
                # Check if this asset might already be in the client-side drop zones
                # This can happen from drag-and-drop operations
                try:
                    from flask import request
                    if request and request.form:
                        # Look through all asset data in form
                        for key in request.form.keys():
                            if key.startswith('ad_assets['):
                                asset_data = request.form.get(key, '')
                                if asset_id in asset_data:
                                    # Found this asset in the form data
                                    logging.info(f"[AssetService] Found asset {asset_id} in form data")
                                    
                                    # Try to find more details about this asset in other form fields
                                    for form_key in request.form.keys():
                                        if 'asset_data' in form_key.lower() and asset_id in request.form.get(form_key, ''):
                                            logging.info(f"[AssetService] Found asset data for {asset_id} in form field {form_key}")
                                            # Try to parse as JSON
                                            try:
                                                import json
                                                asset_json = json.loads(request.form.get(form_key))
                                                if isinstance(asset_json, list):
                                                    for item in asset_json:
                                                        if item.get('id') == asset_id:
                                                            logging.info(f"[AssetService] Using client-side data for asset {asset_id}")
                                                            mock_asset = {
                                                                'id': asset_id,
                                                                'name': item.get('name', f"Temporary Asset {asset_id}"),
                                                                'type': item.get('type', 'image'),
                                                                'url': item.get('url', f"/static/uploads/temp_{asset_id}.jpg")
                                                            }
                                                            found_assets.append(mock_asset)
                                                            continue
                                            except Exception as e:
                                                logging.error(f"[AssetService] Error parsing JSON data for asset {asset_id}: {e}")
                except Exception as e:
                    logging.error(f"[AssetService] Error checking form data for asset {asset_id}: {e}")
                
                # Extract the numeric part to use for mock data
                num = asset_id.split('-')[1] if len(asset_id.split('-')) > 1 else '1'
                
                # Create a mock asset with this ID (if we haven't already from form data)
                if not any(a.get('id') == asset_id for a in found_assets):
                    # Find the real asset URL from the uploads directory if possible
                    import os
                    
                    # Try to get the uploads directory through Flask if in a Flask app context
                    uploads_dir = None
                    asset_url = None
                    
                    try:
                        from flask import current_app
                        # Check if we're in a Flask application context
                        if current_app:
                            uploads_dir = os.path.join(current_app.static_folder, 'uploads')
                    except (ImportError, RuntimeError):
                        # Handle the case where we're not in a Flask app context
                        logging.warning("[AssetService] Not in a Flask application context, using fallback path")
                        # Use a fallback path relative to the current working directory
                        uploads_dir = os.path.join('app', 'static', 'uploads')
                    
                    # Use the asset ID to find the file
                    asset_path = None
                    
                    # Try to find a matching file
                    if uploads_dir and os.path.exists(uploads_dir):
                        for filename in os.listdir(uploads_dir):
                            if asset_id in filename:
                                asset_path = os.path.join(uploads_dir, filename)
                                asset_url = f"/static/uploads/{filename}"
                                logging.info(f"[AssetService] Found physical file for asset {asset_id}: {asset_url}")
                                break
                    
                    # For temporary assets, generate a default placeholder image when not found
                    if not asset_url:
                        try:
                            # Create the uploads directory if it doesn't exist
                            if not os.path.exists(uploads_dir):
                                os.makedirs(uploads_dir, exist_ok=True)
                                logging.info(f"[AssetService] Created uploads directory: {uploads_dir}")
                                
                            # Look for actual user-selected files in common upload locations
                            project_root = os.getcwd()  # Define project_root here
                            upload_locations = [
                                os.path.join(project_root, 'uploads'),
                                os.path.join(project_root, 'tmp'),
                                os.path.join(project_root, 'app', 'static', 'uploads'),
                                os.path.join(project_root, 'app', 'static', 'tmp'),
                                '/tmp',
                                os.path.join(os.path.expanduser('~'), 'tmp'),
                            ]
                            
                            # Try to find any file with an ID or number in the filename
                            user_file = None
                            for location in upload_locations:
                                if os.path.exists(location):
                                    logging.info(f"[AssetService] Checking upload location: {location}")
                                    for filename in os.listdir(location):
                                        # Check if this appears to be a user-uploaded file
                                        if (asset_id in filename or 
                                            (num and num in filename) or 
                                            (f"asset_{num}" in filename.lower())):
                                            user_file_path = os.path.join(location, filename)
                                            logging.info(f"[AssetService] Found potential user file: {user_file_path}")
                                            if os.path.isfile(user_file_path):
                                                user_file = user_file_path
                                                break
                                    if user_file:
                                        break
                            
                            # If we found a user file, copy it to our uploads directory
                            if user_file:
                                import shutil
                                # Create a unique filename with timestamp and UUID to avoid duplication
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                                unique_id = str(uuid.uuid4())[:8]
                                file_ext = os.path.splitext(user_file)[1] or '.jpg'
                                new_filename = f"user_asset_{num}_{timestamp}_{unique_id}{file_ext}"
                                asset_path = os.path.join(uploads_dir, new_filename)
                                
                                # Copy the file
                                shutil.copy2(user_file, asset_path)
                                asset_url = f"/static/uploads/{new_filename}"
                                logging.info(f"[AssetService] Copied user file to: {asset_path}")
                                
                            # If no user file found, generate a placeholder image
                            else:
                                # Generate a placeholder image file with unique timestamp
                                # We already imported these at the top level, don't import again
                                import uuid as _uuid  # Use different name to avoid shadowing
                                
                                # Create a unique filename with timestamp and UUID to avoid duplication
                                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                                unique_id = str(_uuid.uuid4())[:8]
                                filename = f"temp_asset_{num}_{timestamp}_{unique_id}.jpg"
                                asset_path = os.path.join(uploads_dir, filename)
                                asset_url = f"/static/uploads/{filename}"
                                
                                # Create a colored placeholder image
                                img = Image.new('RGB', (600, 600), color=(73, 109, 137))
                                draw = ImageDraw.Draw(img)
                                draw.text((10, 10), f"Asset {num}", fill=(255, 255, 0))
                                img.save(asset_path)
                                
                                logging.info(f"[AssetService] Created placeholder image for asset {asset_id}: {asset_path}")
                        except Exception as e:
                            logging.error(f"[AssetService] Error creating placeholder image: {e}")
                            # Use default URL even if creation failed
                            asset_url = f"/static/uploads/temp_asset_{num}.jpg"
                    
                    mock_asset = {
                        'id': asset_id,
                        'name': f"Temporary Asset {num}",
                        'type': 'image',  # Default to image
                        'url': asset_url or f"/static/uploads/temp_asset_{num}.jpg"
                    }
                    
                    found_assets.append(mock_asset)
                continue
            
            # Look for regular assets in the database
            asset_found = False
            for asset in assets:
                # Check if asset is a dictionary before using get()
                if isinstance(asset, dict) and asset.get('id') == asset_id:
                    found_assets.append(asset)
                    asset_found = True
                    break
                # Handle case where asset might be a string or other type
                elif hasattr(asset, 'id') and asset.id == asset_id:
                    found_assets.append(asset)
                    asset_found = True
                    break
                    
            if not asset_found:
                not_found.append(asset_id)
        
        if not_found:
            logging.warning(f"[AssetService] Could not find these assets: {not_found}")
            
        logging.info(f"[AssetService] Found {len(found_assets)} assets: {found_assets}")
                
        return found_assets
    
    def add_asset(self, name, file_path, asset_type, metadata=None):
        """
        Add a new asset to the library
        
        Args:
            name: Asset name
            file_path: Path to the asset file
            asset_type: Type of asset ('image' or 'video')
            metadata: Optional metadata about the asset
            
        Returns:
            The newly created asset
        """
        assets = self._load_assets()
        
        # Create new asset object
        new_asset = {
            'id': str(uuid.uuid4()),
            'name': name,
            'file_path': file_path,
            'type': asset_type,
            'created_at': datetime.now().isoformat(),
            'metadata': metadata or {}
        }
        
        assets.append(new_asset)
        self._save_assets(assets)
        
        return new_asset
    
    def update_asset(self, asset_id, updates):
        """
        Update an existing asset
        
        Args:
            asset_id: ID of the asset to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated asset or None if not found
        """
        assets = self._load_assets()
        
        for i, asset in enumerate(assets):
            if asset.get('id') == asset_id:
                # Don't allow changing certain fields
                if 'id' in updates:
                    del updates['id']
                if 'created_at' in updates:
                    del updates['created_at']
                
                # Update the asset
                assets[i].update(updates)
                self._save_assets(assets)
                return assets[i]
                
        return None
    
    def delete_asset(self, asset_id):
        """
        Delete an asset by ID
        
        Args:
            asset_id: ID of the asset to delete
            
        Returns:
            Boolean indicating success
        """
        assets = self._load_assets()
        
        for i, asset in enumerate(assets):
            if asset.get('id') == asset_id:
                # Get file path to delete the file
                file_path = asset.get('file_path', '')
                if file_path and os.path.exists(file_path):
                    try:
                        os.remove(file_path)
                    except OSError:
                        # Log but continue if file deletion fails
                        pass
                
                # Remove from assets list
                assets.pop(i)
                self._save_assets(assets)
                return True
                
        return False
    
    def create_placeholder_image(self, asset_id, size=(800, 800), color=(73, 109, 137)):
        """
        Create a placeholder image for a temporary asset.
        
        Args:
            asset_id: The ID of the asset to create a placeholder for
            size: Tuple of (width, height) for the image size
            color: Tuple of (r, g, b) for the background color
            
        Returns:
            Path to the created placeholder image
        """
        try:
            from PIL import Image, ImageDraw, ImageFont
            import uuid
            from datetime import datetime
            
            # Create a unique filename with timestamp and UUID to prevent duplicates
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            unique_id = str(uuid.uuid4())[:8]
            filename = f"placeholder_{asset_id}_{timestamp}_{unique_id}.jpg"
            
            # Full path to the placeholder image
            placeholder_path = os.path.join(self.uploads_dir, filename)
            
            # Create the image
            img = Image.new('RGB', size, color=color)
            draw = ImageDraw.Draw(img)
            
            # Add text to the image
            draw.text((10, 10), f"Placeholder for {asset_id}", fill=(255, 255, 0))
            draw.text((10, 30), f"Created: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", fill=(255, 255, 0))
            
            # Save the image
            img.save(placeholder_path)
            
            logging.info(f"[AssetService] Created placeholder image at {placeholder_path}")
            return placeholder_path
        except Exception as e:
            logging.error(f"[AssetService] Error creating placeholder image: {e}")
            return None 