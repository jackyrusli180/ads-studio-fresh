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