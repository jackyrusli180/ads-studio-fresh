"""
Asset Service
Handles operations related to media assets (images, videos)
"""
import os
import json
from datetime import datetime
import uuid

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
        if not asset_ids:
            return []
            
        assets = self._load_assets()
        found_assets = []
        
        for asset in assets:
            if asset.get('id') in asset_ids:
                found_assets.append(asset)
                
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