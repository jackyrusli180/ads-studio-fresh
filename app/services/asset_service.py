"""
Asset Service
Handles operations related to media assets (images, videos)
"""
import os
import json
from datetime import datetime
import uuid
import logging

class AssetService:
    """Service for managing media assets including images and videos"""
    
    def __init__(self):
        """Initialize the asset service"""
        self.assets_file = os.path.join('app', 'static', 'media_library.json')
        self.uploads_dir = os.path.join('app', 'static', 'uploads')
        self._ensure_dirs_exist()
        
    def _ensure_dirs_exist(self):
        """Ensure necessary directories exist"""
        if not os.path.exists(self.uploads_dir):
            os.makedirs(self.uploads_dir)
            
    def _load_assets(self):
        """Load assets from the JSON file"""
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
                    from flask import current_app
                    
                    # Use the asset ID to find the file
                    uploads_dir = os.path.join(current_app.static_folder, 'uploads')
                    asset_path = None
                    asset_url = None
                    
                    # Try to find a matching file
                    if os.path.exists(uploads_dir):
                        for filename in os.listdir(uploads_dir):
                            if asset_id in filename:
                                asset_path = os.path.join(uploads_dir, filename)
                                asset_url = f"/static/uploads/{filename}"
                                logging.info(f"[AssetService] Found physical file for asset {asset_id}: {asset_url}")
                                break
                    
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
                if asset.get('id') == asset_id:
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