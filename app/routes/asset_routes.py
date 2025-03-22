"""
Asset management routes for the application.
Contains routes for asset library, approval flow, etc.
"""
from flask import render_template, request, jsonify, Blueprint
import os
import json
from datetime import datetime, timezone
import uuid

from app.config import UPLOAD_FOLDER, project_root

asset_bp = Blueprint('asset', __name__)

@asset_bp.route('/asset-manager/library')
def asset_library():
    """Render the asset library page."""
    return render_template('asset_manager/library.html')

@asset_bp.route('/asset-manager/approval-flow')
def approval_flow():
    """Render the approval flow page."""
    # Load assets from the JSON file
    assets_file = os.path.join(project_root, 'Python', 'static', 'media_library.json')
    
    try:
        with open(assets_file, 'r') as f:
            assets = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        assets = []
    
    # Count assets by status
    pending_count = sum(1 for asset in assets if asset.get('status') == 'pending')
    approved_count = sum(1 for asset in assets if asset.get('status') == 'approved')
    rejected_count = sum(1 for asset in assets if asset.get('status') == 'rejected')
    
    return render_template(
        'asset_manager/approval_flow.html',
        assets=assets,
        pending_count=pending_count,
        approved_count=approved_count,
        rejected_count=rejected_count
    )

@asset_bp.route('/asset-manager/my-approvals')
def my_approvals():
    """Render the my approvals page."""
    # Load assets from the JSON file
    assets_file = os.path.join(project_root, 'Python', 'static', 'media_library.json')
    
    try:
        with open(assets_file, 'r') as f:
            all_assets = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        all_assets = []
    
    # Filter for rejected assets
    rejected_assets = [asset for asset in all_assets if asset.get('status') == 'rejected']
    
    return render_template('asset_manager/my_approvals.html', rejected_assets=rejected_assets)

@asset_bp.route('/api/assets')
def get_assets():
    """API endpoint to get all assets."""
    # Check if we're in Ads Builder mode (Step 3)
    is_ads_builder = request.args.get('source') == 'adsbuilder'
    
    if is_ads_builder:
        # For Ads Builder Step 3, return TikTok carousel URLs as assets
        # These are the URLs from create_tiktok_carousel_url_ad_sdk.py
        tiktok_image_urls = [
            "https://static-01.daraz.lk/p/79cc06e0fb28d7114d23fe4488df2f5f.png",
            "https://static-01.daraz.lk/p/7d1d09c42675d09950cf6f2bf7d58ccc.png",
            "https://static-01.daraz.lk/p/f4aee08894eacd05d63a6eedeae8ccc3.png",
            "https://static-01.daraz.lk/p/7d1d09c42675d09950cf6f2bf7d58ccc.png",
            "https://static-01.daraz.lk/p/bd8ca56a598f2a1a2a6ebd1d8913567e.png"
        ]
        
        # Sample video URLs - only include the 5 that match AssetService
        tiktok_video_urls = [
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4"
        ]
        
        # Create asset objects for each URL
        tiktok_assets = []
        for idx, url in enumerate(tiktok_image_urls):
            # Extract filename from URL for the asset name
            filename = url.split('/')[-1]
            
            # Create an asset object
            asset = {
                "id": f"tiktok-url-{idx}",
                "name": filename,
                "file_path": url,  # Use the URL directly as the file path
                "thumbnail": url,  # Use the same URL for thumbnail
                "type": "image",
                "status": "approved",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "tags": ["tiktok", "url"],
                "metadata": {
                    "mime_type": "image/png",
                    "is_remote_url": True  # Flag to indicate this is a remote URL
                }
            }
            tiktok_assets.append(asset)
        
        # Add video assets to the list
        for idx, url in enumerate(tiktok_video_urls):
            # Extract filename from URL for the asset name
            filename = url.split('/')[-1]
            
            # Create a video asset object
            asset = {
                "id": f"tiktok-video-{idx}",
                "name": filename,
                "file_path": url,  # Use the URL directly as the file path
                "thumbnail": url,  # Use the same URL for thumbnail
                "type": "video",
                "status": "approved",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "tags": ["tiktok", "video"],
                "metadata": {
                    "mime_type": "video/mp4",
                    "is_remote_url": True  # Flag to indicate this is a remote URL
                }
            }
            tiktok_assets.append(asset)
        
        return jsonify({'success': True, 'assets': tiktok_assets})
    
    # If not in Ads Builder mode, use the regular asset library
    # Load assets from the JSON file
    assets_file = os.path.join(project_root, 'Python', 'static', 'media_library.json')
    
    try:
        with open(assets_file, 'r') as f:
            assets = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        assets = []
    
    # Apply filters if provided
    status_filter = request.args.get('status')
    type_filter = request.args.get('type')
    search_query = request.args.get('search', '').lower()
    
    if status_filter and status_filter != 'all':
        assets = [asset for asset in assets if asset.get('status') == status_filter]
    
    if type_filter and type_filter != 'all':
        assets = [asset for asset in assets if asset.get('type') == type_filter]
    
    if search_query:
        assets = [asset for asset in assets if search_query in asset.get('name', '').lower()]
    
    return jsonify({'success': True, 'assets': assets}) 