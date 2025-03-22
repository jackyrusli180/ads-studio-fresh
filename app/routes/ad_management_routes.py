"""
Ad Management Routes
Handles routes for ad creation, management and campaigns
"""
from flask import Blueprint, render_template, request, jsonify
from app.services.asset_service import AssetService
import logging
from flask import url_for
import os
import io
import time
import json
import re

# Create the blueprint
ad_management_bp = Blueprint('ad_management', __name__, url_prefix='/ad-management')
asset_service = AssetService()

@ad_management_bp.route('/ads_builder')
def ads_builder():
    """Render the ads builder interface"""
    # Get selected assets from query params if available
    selected_asset_ids = request.args.getlist('assets')
    selected_assets = []
    
    if selected_asset_ids:
        for asset_id in selected_asset_ids:
            asset = asset_service.get_asset_by_id(asset_id)
            if asset:
                selected_assets.append(asset)
    
    return render_template('ad_management/builder/index.html', selected_assets=selected_assets)

@ad_management_bp.route('/automated_rules')
def automated_rules():
    """Render the automated ad rules interface"""
    return render_template('ad_management/automated_rules/automated_rules.html')

@ad_management_bp.route('/create_rule')
def create_rule():
    """Render the create rule interface"""
    return render_template('ad_management/automated_rules/create_rule.html')

@ad_management_bp.route('/create_ad', methods=['POST'])
def create_ad():
    """Create a new ad across selected platforms"""
    try:
        # Initialize variables
        created_ads = {}
        error_details = {}
        
        # Log the incoming request for debugging
        logging.info("RECEIVED CREATE AD REQUEST")
        logging.info("=" * 80)
        logging.info(f"Request method: {request.method}")
        logging.info(f"Content type: {request.content_type}")
        logging.info(f"Content length: {request.content_length}")
        
        # Check if there are uploaded files
        if request.files:
            logging.info(f"Uploaded files: {list(request.files.keys())}")
            for file_key, file_obj in request.files.items():
                logging.info(f"File '{file_key}': {file_obj.filename}, " 
                           f"content_type: {file_obj.content_type}, "
                           f"content_length: {file_obj.content_length if hasattr(file_obj, 'content_length') else 'unknown'}")
                
                # Create a copy of the file for TikTok upload
                if file_obj and file_obj.filename:
                    try:
                        # Save a copy to a persistent location for TikTok to find
                        uploads_dir = os.path.join('app', 'static', 'uploads')
                        os.makedirs(uploads_dir, exist_ok=True)
                        
                        from datetime import datetime
                        import uuid
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
                        unique_id = str(uuid.uuid4())[:8]
                        
                        # Create a unique filename with timestamp
                        filename = f"uploaded_{timestamp}_{unique_id}_{file_obj.filename}"
                        save_path = os.path.join(uploads_dir, filename)
                        
                        file_obj.save(save_path)
                        logging.info(f"Saved uploaded file to: {save_path}")
                    except Exception as e:
                        logging.error(f"Error saving uploaded file: {e}")
        
        # Log the raw form data keys for debugging
        form_data_keys = list(request.form.keys()) if request.form else []
        logging.info(f"Raw form data keys: {form_data_keys}")
        
        # Process form data
        platforms = request.form.getlist('platforms') or request.form.getlist('platforms[]')
        logging.info(f"Creating ads for platforms: {platforms}")
        
        # Parse form data to extract only the relevant information
        form_data = {}
        if request.form:
            form_data = {key: request.form.getlist(key) if len(request.form.getlist(key)) > 1 else request.form.get(key) 
                         for key in request.form.keys()}
            
        logging.info(f"Form data keys: {list(form_data.keys())}")
        
        # Extract advertiser accounts - handle both formats
        advertiser_accounts = []
        if 'advertiser_account_ids[]' in form_data:
            # Array format
            advertiser_accounts = form_data['advertiser_account_ids[]'] if isinstance(form_data['advertiser_account_ids[]'], list) else [form_data['advertiser_account_ids[]']]
        elif 'advertiser_account_id[]' in form_data:
            # Alternative array format
            advertiser_accounts = form_data['advertiser_account_id[]'] if isinstance(form_data['advertiser_account_id[]'], list) else [form_data['advertiser_account_id[]']]
        
        logging.info(f"Advertiser accounts: {advertiser_accounts}")
        
        # Get parsed form data
        ad_names = {}
        ad_headlines = {}
        ad_assets = {}
        
        # Process form data to extract ad names, headlines and assets
        logging.info("Creating ads for platforms: %s", platforms)
        
        # Log key form fields and values 
        logging.info("Form data keys: %s", list(form_data.keys()))
        
        # Check for platform-specific keys
        meta_params = [k for k in form_data.keys() if k.startswith('ad_names[meta]') or k.startswith('ad_headlines[meta]')]
        tiktok_params = [k for k in form_data.keys() if k.startswith('tiktok_ad_names') or k.startswith('tiktok_ad_headlines')]
        
        logging.info(f"Meta-specific params found: {len(meta_params)}")
        logging.info(f"TikTok-specific params found: {len(tiktok_params)}")
        
        # Log specific fields of interest
        if 'ad_names[meta]' in form_data:
            logging.info(f"Meta ad names found in form data")
        else:
            logging.info(f"WARNING: No 'ad_names[meta]' field in form data, will try to use TikTok fields")
            
        logging.info(f"Advertiser accounts: {advertiser_accounts}")
        
        # Parse ad names from form data - this comes in a structured format
        # Process structured fields for each platform
        for key in form_data.keys():
            if key.startswith('ad_names['):
                # Format: ad_names[platform][adset_id][index]
                parts = key.replace('ad_names[', '').replace(']', '').split('[')
                if len(parts) >= 3:
                    platform = parts[0]
                    adset_id = parts[1]
                    index = parts[2]
                    
                    if platform not in ad_names:
                        ad_names[platform] = {}
                    if adset_id not in ad_names[platform]:
                        ad_names[platform][adset_id] = {}
                    
                    ad_names[platform][adset_id][index] = request.form.get(key)
            
            elif key.startswith('ad_headlines['):
                # Format: ad_headlines[platform][adset_id][index]
                parts = key.replace('ad_headlines[', '').replace(']', '').split('[')
                if len(parts) >= 3:
                    platform = parts[0]
                    adset_id = parts[1]
                    index = parts[2]
                    
                    if platform not in ad_headlines:
                        ad_headlines[platform] = {}
                    if adset_id not in ad_headlines[platform]:
                        ad_headlines[platform][adset_id] = {}
                    
                    ad_headlines[platform][adset_id][index] = request.form.get(key)
            
            elif key.startswith('ad_assets['):
                # Format: ad_assets[platform][adset_id][index]
                parts = key.replace('ad_assets[', '').replace(']', '').split('[')
                if len(parts) >= 3:
                    platform = parts[0]
                    adset_id = parts[1]
                    index = parts[2]
                    
                    if platform not in ad_assets:
                        ad_assets[platform] = {}
                    if adset_id not in ad_assets[platform]:
                        ad_assets[platform][adset_id] = {}
                    
                    # Parse asset IDs from the form value (comma-separated list)
                    asset_value = request.form.get(key)
                    try:
                        # Try to parse as JSON
                        asset_ids = json.loads(asset_value)
                        logging.info(f"Successfully parsed JSON asset data: {asset_ids}")
                    except:
                        # Fallback to comma-separated string if JSON fails
                        if isinstance(asset_value, str):
                            asset_ids = [aid.strip() for aid in asset_value.split(',') if aid.strip()]
                        else:
                            asset_ids = []
                    
                    ad_assets[platform][adset_id][index] = asset_ids
        
        # Handle forms where tiktok_ad_names are used even for Meta ads
        if 'meta' not in ad_names and len(tiktok_params) > 0:
            logging.info("No Meta-specific ad names found, checking if TikTok fields are being used for Meta ads")
            
            # If no meta-specific ad names but we're supposed to create Meta ads, use TikTok values
            ad_names['meta'] = {}
            ad_headlines['meta'] = {}
            
            # Process TikTok fields to extract Meta data
            for key in form_data.keys():
                if key.startswith('tiktok_ad_names['):
                    parts = key.replace('tiktok_ad_names[', '').replace(']', '').split('[')
                    if len(parts) >= 2:
                        adset_id = parts[0]
                        index = parts[1]
                        
                        if adset_id not in ad_names['meta']:
                            ad_names['meta'][adset_id] = {}
                        
                        ad_names['meta'][adset_id][index] = request.form.get(key)
                
                elif key.startswith('tiktok_ad_headlines['):
                    parts = key.replace('tiktok_ad_headlines[', '').replace(']', '').split('[')
                    if len(parts) >= 2:
                        adset_id = parts[0]
                        index = parts[1]
                        
                        if adset_id not in ad_headlines['meta']:
                            ad_headlines['meta'][adset_id] = {}
                        
                        ad_headlines['meta'][adset_id][index] = request.form.get(key)
            
            logging.info(f"Created Meta ad names from TikTok fields: {ad_names}")
        
        # Process the ad_assets
        if 'selected_asset_ids' in form_data:
            logging.info("Processing selected_asset_ids field")
            # Parse JSON from selected_asset_ids
            asset_mapping_value = form_data.get('selected_asset_ids', '{}')
            try:
                # Handle empty value by using a default empty object
                if not asset_mapping_value or asset_mapping_value.strip() == '':
                    asset_mapping_value = '{}'
                
                asset_mapping = json.loads(asset_mapping_value)
                logging.info(f"Successfully parsed asset mapping: {asset_mapping}")
                
                # Process the asset mapping to add to ad_assets
                for platform, adsets in asset_mapping.items():
                    if platform not in ad_assets:
                        ad_assets[platform] = {}
                        
                    for adset_id, ads in adsets.items():
                        if adset_id not in ad_assets[platform]:
                            ad_assets[platform][adset_id] = {}
                            
                        for ad_index, asset_ids in ads.items():
                            ad_assets[platform][adset_id][ad_index] = asset_ids
            except Exception as e:
                logging.error(f"Error parsing selected_asset_ids: {str(e)}")
                logging.info("Using empty object for selected_asset_ids due to parsing error")
        
        logging.info(f"Parsed ad names: {ad_names}")
        logging.info(f"Parsed headlines: {ad_headlines}")
        logging.info(f"Parsed ad assets: {ad_assets}")

        # Create the ads for each platform
        created_ads = {}
        
        # Helper function to extract numeric ID from adset_ID string
        def extract_numeric_id(adset_id):
            """Extract numeric ID from adset identifier strings
            
            Examples:
              - adset_123456789_1 -> 123456789
              - 123456789 -> 123456789
            """
            if not adset_id:
                return adset_id
                
            # If it starts with 'adset_' extract the middle numeric part
            if isinstance(adset_id, str) and adset_id.startswith('adset_'):
                parts = adset_id.split('_')
                if len(parts) >= 2 and parts[1].isdigit():
                    return parts[1]
            
            # If it's already numeric, return as is
            if isinstance(adset_id, str) and adset_id.isdigit():
                return adset_id
                
            # Last resort: find any numeric substring
            if isinstance(adset_id, str):
                numeric_match = re.search(r'(\d+)', adset_id)
                if numeric_match:
                    return numeric_match.group(1)
                
            # If we can't find a numeric ID, return original (will likely fail)
            return adset_id
            
        # META ADS
        if 'meta' in platforms:
            logging.info("Processing Meta ads")
            
            # Initialize Meta service with correct advertiser ID
            meta_service = None
            meta_account_id = form_data.get('meta_account_id')
            if not meta_account_id and 'advertiser_account_id[]' in form_data:
                meta_account_id = form_data.get('advertiser_account_id[]')
                
            if not meta_account_id and 'advertiser_account_ids[]' in form_data:
                # Use the first account ID in the list
                account_ids = form_data.get('advertiser_account_ids[]')
                if isinstance(account_ids, list) and account_ids:
                    meta_account_id = account_ids[0]
                else:
                    meta_account_id = account_ids
                    
            logging.info(f"Initializing Meta service with account ID: {meta_account_id}")
            
            if meta_account_id:
                from app.services.meta_service import MetaService
                try:
                    meta_service = MetaService(ad_account_id=meta_account_id)
                    
                    # Extract Meta-specific data from the form
                    meta_campaign_id = None
                    meta_adset_id = None
                    
                    # Get Meta campaign IDs
                    if 'meta_campaign_ids[]' in form_data:
                        meta_campaign_ids = form_data.get('meta_campaign_ids[]')
                        if isinstance(meta_campaign_ids, list) and meta_campaign_ids:
                            meta_campaign_id = meta_campaign_ids[0]
                        else:
                            meta_campaign_id = meta_campaign_ids
                            
                    logging.info(f"Using Meta campaign ID: {meta_campaign_id}")
                    
                    created_ads['meta'] = []
                    
                    # Process each adset with assets
                    for adset_id, assets in ad_assets.get('meta', {}).items():
                        logging.info(f"[Meta] Processing adset ID: {adset_id}")
                        meta_adset_id = extract_numeric_id(adset_id)
                        
                        # For each ad in the adset
                        for ad_index, asset_ids in assets.items():
                            # Get ad name and headline - first try meta-specific format, then fallback to tiktok format
                            ad_name = (
                                ad_names.get('meta', {}).get(adset_id, {}).get(ad_index) or 
                                form_data.get(f'tiktok_ad_names[{adset_id}][{ad_index}]') or 
                                f"Meta Ad {int(time.time())}"
                            )
                            
                            headline = (
                                ad_headlines.get('meta', {}).get(adset_id, {}).get(ad_index) or 
                                form_data.get(f'tiktok_ad_headlines[{adset_id}][{ad_index}]') or
                                "Check out our offer"
                            )
                            
                            # Log all the values for debugging
                            logging.info(f"[Meta] Ad name from meta-specific format: {ad_names.get('meta', {}).get(adset_id, {}).get(ad_index)}")
                            logging.info(f"[Meta] Ad name from tiktok format: {form_data.get(f'tiktok_ad_names[{adset_id}][{ad_index}]')}")
                            logging.info(f"[Meta] Final ad name: {ad_name}")
                            
                            logging.info(f"[Meta] Creating ad with name: '{ad_name}', headline: '{headline}', adset: {adset_id}")
                            
                            # Get assets for the ad
                            asset_list = []
                            
                            # Process each asset ID
                            for asset_id in asset_ids:
                                logging.info(f"[Meta] Processing asset ID: {asset_id}")
                                
                                # TikTok URLs require special handling
                                if asset_id.startswith('tiktok-url-'):
                                    logging.info(f"[Meta] Processing TikTok URL asset: {asset_id}")
                                    
                                    # Directly create and add the asset without using the asset service
                                    asset_list.append({
                                        'type': 'image',
                                        'url': f'placeholder-{asset_id}',  # Use a placeholder URL
                                        'name': f'TikTok Asset {asset_id}'
                                    })
                                    continue
                                
                                # For other assets, use the asset service
                                asset_data = asset_service.get_assets_by_ids([asset_id])
                                if asset_data:
                                    asset = asset_data[0]
                                    asset_url = asset.get('url', '')
                                    if asset_url:
                                        asset_list.append({
                                            'type': asset.get('type', 'image'),
                                            'url': asset_url,
                                            'name': asset.get('name', f'Asset {asset_id}')
                                        })
                                else:
                                    logging.warning(f"[Meta] Asset {asset_id} not found in asset service")
                                    # Use a placeholder asset
                                    asset_list.append({
                                        'type': 'image',
                                        'url': 'placeholder',
                                        'name': f'Placeholder for {asset_id}'
                                    })
                            
                            # If no assets were added, use a placeholder
                            if not asset_list:
                                logging.warning(f"[Meta] No valid assets found, using placeholder")
                                asset_list.append({
                                    'type': 'image',
                                    'url': 'placeholder',
                                    'name': 'Placeholder Image'
                                })
                            
                            # Prepare ad data
                            ad_data = {
                                'name': ad_name,
                                'adset_id': meta_adset_id,  # This is already the extracted numeric ID
                                'headline': headline,
                                'assets': asset_list
                            }
                            
                            # Log the complete ad data for debugging
                            logging.info(f"[Meta] Final ad data: {ad_data}")
                            logging.info(f"[Meta] Using numeric adset ID: {meta_adset_id} (extracted from {adset_id})")
                            
                            # Create the ad
                            try:
                                logging.info(f"[Meta] Creating ad with data: {ad_data}")
                                
                                # Log the asset details for debugging
                                for i, asset in enumerate(ad_data.get('assets', [])):
                                    logging.info(f"[Meta] Asset {i+1}: {asset.get('type')} - {asset.get('url')}")
                                
                                # Create the ad with emergency fallback
                                try:
                                    ad_id = meta_service.create_ad(ad_data)
                                    if ad_id:
                                        created_ads['meta'].append(ad_id)
                                        logging.info(f"[Meta] Created ad with ID: {ad_id}")
                                    else:
                                        logging.error(f"[Meta] Error: create_ad returned None or empty value")
                                        error_details['meta'] = "Failed to create ad: No ad ID returned from Meta API"
                                except Exception as ad_error:
                                    logging.error(f"[Meta] First attempt failed: {str(ad_error)}")
                                    
                                    # Try again with only a placeholder
                                    try:
                                        logging.info("[Meta] Trying emergency fallback with placeholder")
                                        # Create a simpler ad data structure
                                        emergency_ad_data = {
                                            'name': ad_name,
                                            'adset_id': meta_adset_id,  # Numeric adset ID
                                            'headline': headline,
                                            'assets': [{
                                                'type': 'image',
                                                'url': 'placeholder',
                                                'name': 'Emergency Placeholder'
                                            }]
                                        }
                                        
                                        ad_id = meta_service.create_ad(emergency_ad_data)
                                        if ad_id:
                                            created_ads['meta'].append(ad_id)
                                            logging.info(f"[Meta] Created emergency fallback ad with ID: {ad_id}")
                                        else:
                                            raise ValueError("Emergency fallback also failed")
                                    except Exception as emergency_error:
                                        logging.error(f"[Meta] Emergency fallback also failed: {str(emergency_error)}")
                                        error_details['meta'] = f"Failed to create ad even with emergency fallback: {str(emergency_error)}"
                            except Exception as e:
                                logging.error(f"[Meta] Error creating ad: {str(e)}")
                                error_details['meta'] = f"Error creating ad: {str(e)}"
                        else:
                            logging.warning(f"[Meta] No asset data found for adset {meta_adset_id}")
                            error_details['meta'] = f"No asset data found for adset {meta_adset_id}"
                except Exception as init_error:
                    logging.error(f"Error initializing Meta service: {str(init_error)}")
                    error_details['meta'] = f"Failed to initialize Meta service: {str(init_error)}"
                    return jsonify({
                        'success': False,
                        'message': f"Failed to initialize Meta service: {str(init_error)}",
                        'error_details': error_details
                    }), 500
        
        # TIKTOK ADS
        if 'tiktok' in platforms:
            logging.info("Processing TikTok ads")
            
            # Get TikTok campaign IDs from form data
            tiktok_campaign_ids = []
            if 'tiktok_campaign_ids[]' in form_data:
                tiktok_campaign_ids = form_data['tiktok_campaign_ids[]'] if isinstance(form_data['tiktok_campaign_ids[]'], list) else [form_data['tiktok_campaign_ids[]']]
            logging.info(f"TikTok campaign IDs: {tiktok_campaign_ids}")
            
            # Get adgroup IDs from the asset structure
            tiktok_adgroups = []
            if 'tiktok' in ad_assets:
                tiktok_adgroups = list(ad_assets['tiktok'].keys())
            logging.info(f"Found adgroup IDs in asset structure: {tiktok_adgroups}")
            
            # Initialize TikTok service with advertiser ID
            tiktok_service = None
            tiktok_account_id = None
            
            # Try to get tiktok_account_id from form data in multiple possible formats
            if 'tiktok_account_id' in form_data:
                tiktok_account_id = form_data['tiktok_account_id']
                logging.info(f"[TikTok] Found tiktok_account_id in form_data: {tiktok_account_id}")
            elif 'advertiser_account_ids[]' in form_data:
                # Try to find a TikTok account in the list of advertiser account IDs
                account_ids = form_data['advertiser_account_ids[]']
                if isinstance(account_ids, list):
                    # If it's a list, find the first one that starts with a known TikTok account prefix
                    # TikTok account IDs are typically numeric and 19 digits long
                    for account_id in account_ids:
                        if account_id and len(str(account_id)) >= 19:
                            tiktok_account_id = account_id
                            logging.info(f"[TikTok] Using account ID from advertiser_account_ids[]: {tiktok_account_id}")
                            break
                elif account_ids:
                    # If it's a single value, use it
                    tiktok_account_id = account_ids
                    logging.info(f"[TikTok] Using single account ID from advertiser_account_ids[]: {tiktok_account_id}")
            
            # Log the selected TikTok account ID
            logging.info(f"[TikTok] Final selected TikTok advertiser ID: {tiktok_account_id}")
                
            if tiktok_account_id and tiktok_adgroups:
                try:
                    logging.info(f"[TikTok] Creating TikTok service with advertiser ID: {tiktok_account_id}")
                    from app.services.tiktok_service import TikTokService
                    
                    # Explicitly convert advertiser_id to string if it's not already
                    tiktok_account_id = str(tiktok_account_id).strip()
                    
                    if not tiktok_account_id:
                        raise ValueError("[TikTok] advertiser_id is empty after stripping")
                        
                    # Initialize the TikTok service with the advertiser ID
                    tiktok_service = TikTokService(tiktok_account_id)
                    
                    # Check if the service was initialized successfully
                    if not tiktok_service.is_initialized():
                        raise ValueError("[TikTok] Service failed to initialize properly")
                        
                    logging.info(f"[TikTok] Service initialized successfully with advertiser ID: {tiktok_account_id}")
                    
                    # Get asset service to load asset data
                    from app.services.asset_service import AssetService
                    asset_service = AssetService()
                    
                    created_ads['tiktok'] = []
                except Exception as e:
                    logging.error(f"[TikTok] Error initializing TikTok service: {e}")
                    return jsonify({
                        'success': False,
                        'error': f"Failed to initialize TikTok service: {str(e)}"
                    }), 500
            
            # Create TikTok ads
            try:
                logging.info("Creating TikTok ads")
                
                # Set up log capturing for error detection
                log_capture = io.StringIO()
                log_handler = logging.StreamHandler(log_capture)
                log_handler.setLevel(logging.INFO)
                tiktok_logger = logging.getLogger()
                tiktok_logger.addHandler(log_handler)
                
                # Handle different input formats
                if request.is_json:
                    # Simple JSON case - create a single ad
                    ad_data = {
                        'advertiser_id': tiktok_account_id,
                        'campaign_ids': tiktok_campaign_ids,
                        'adgroup_ids': tiktok_adgroups,
                        'ad_name': ad_names.get('tiktok', {}).get(tiktok_adgroups[0], {}).get(0, ''),
                        'headline': ad_headlines.get('tiktok', {}).get(tiktok_adgroups[0], {}).get(0, ''),
                        'assets': ad_assets['tiktok'][tiktok_adgroups[0]]  # List of asset URLs from JSON input
                    }
                    
                    logging.info(f"Creating TikTok ad with data: {ad_data}")
                    
                    # Call TikTok service to create the ad
                    ad_id = tiktok_service.create_ad(ad_data)
                    if isinstance(ad_id, dict) and 'success' in ad_id and ad_id['success'] is False:
                        # This is an error response with details
                        error_message = ad_id.get('error', 'Unknown error during ad creation')
                        created_ads['tiktok'].append({
                            'name': ad_data['ad_name'],
                            'adgroup_id': tiktok_adgroups[0],
                            'success': False,
                            'message': 'Failed to create ad',
                            'error': error_message
                        })
                        logging.error(f"Failed to create TikTok ad: {ad_data['ad_name']} - {error_message}")
                    elif ad_id:
                        created_ads['tiktok'].append({
                            'id': ad_id,
                            'name': ad_data['ad_name'],
                            'adgroup_id': tiktok_adgroups[0],
                            'success': True,
                            'message': 'Ad created successfully'
                        })
                        logging.info(f"Created TikTok ad with ID: {ad_id}")
                    else:
                        created_ads['tiktok'].append({
                            'name': ad_data['ad_name'],
                            'adgroup_id': tiktok_adgroups[0],
                            'success': False,
                            'message': 'Failed to create ad',
                            'error': 'Unknown error occurred during ad creation'
                        })
                        logging.error(f"Failed to create TikTok ad: {ad_data['ad_name']}")
                else:
                    # Handle structured form data
                    # More complex case with multiple ads
                    if isinstance(ad_assets, dict) and 'tiktok' in ad_assets:
                        # For each adgroup
                        for adgroup_id in tiktok_adgroups:
                            if adgroup_id in ad_assets['tiktok']:
                                # For each ad in the adgroup
                                for ad_index, asset_ids in ad_assets['tiktok'][adgroup_id].items():
                                    # Get ad name and headline
                                    ad_name = ad_names.get('tiktok', {}).get(adgroup_id, {}).get(ad_index, '')
                                    headline = ad_headlines.get('tiktok', {}).get(adgroup_id, {}).get(ad_index, '')
                                    
                                    # Additional logging for form data troubleshooting
                                    logging.info(f"[TikTok] Form data - ad_name fields: {[k for k in request.form.keys() if 'ad_name' in k or 'tiktok_ad_names' in k]}")
                                    logging.info(f"[TikTok] Form data - headline fields: {[k for k in request.form.keys() if 'headline' in k or 'tiktok_ad_headlines' in k]}")
                                    
                                    # Try alternative field formats if values are empty
                                    if not ad_name:
                                        # Try direct tiktok_ad_names format
                                        direct_key = f"tiktok_ad_names[{adgroup_id}][{ad_index}]"
                                        if direct_key in request.form and request.form[direct_key]:
                                            ad_name = request.form[direct_key]
                                            logging.info(f"[TikTok] Found ad_name from direct field: {direct_key} = {ad_name}")
                                    
                                    if not headline:
                                        # Try direct tiktok_ad_headlines format
                                        direct_key = f"tiktok_ad_headlines[{adgroup_id}][{ad_index}]"
                                        if direct_key in request.form and request.form[direct_key]:
                                            headline = request.form[direct_key]
                                            logging.info(f"[TikTok] Found headline from direct field: {direct_key} = {headline}")
                                    
                                    # Log ad data for debugging
                                    logging.info(f"[TikTok] Creating ad with name: '{ad_name}', headline: '{headline}', adgroup: {adgroup_id}")
                                
                                    # Loop through the assets and create the ad
                                    asset_list = []
                                    for asset_id in asset_ids:
                                        # Remove any platform-specific prefixes from asset IDs
                                        clean_asset_id = asset_id
                                        # Keep tiktok-url prefix since it's specially handled
                                        if '-' in asset_id and not asset_id.startswith('tiktok-url-'):
                                            # Extract the actual ID part after any platform prefix (e.g., "tiktok-video-123" → "123")
                                            parts = asset_id.split('-')
                                            if len(parts) > 1 and parts[-1].isdigit():
                                                clean_asset_id = parts[-1]
                                            else:
                                                clean_asset_id = asset_id
                                        
                                        logging.info(f"[TikTok] Processing asset ID: {asset_id}, cleaned to: {clean_asset_id}")
                                        
                                        asset_data = asset_service.get_assets_by_ids([clean_asset_id])
                                        if asset_data:
                                            # For each asset found, create an object with type and URL
                                            for asset in asset_data:
                                                asset_url = asset.get('url', '')
                                                asset_name = asset.get('name', f'Asset {clean_asset_id}')
                                                if asset_url:
                                                    asset_list.append({
                                                        'type': asset.get('type', 'image'),
                                                        'url': asset_url,
                                                        'name': asset_name
                                                    })
                                                    logging.info(f"[TikTok] Asset URL: {asset_url}, name: {asset_name}")
                                                else:
                                                    logging.warning(f"[TikTok] Asset {clean_asset_id} has no URL")
                                        else:
                                            # Try with the original ID as fallback
                                            asset_data = asset_service.get_assets_by_ids([asset_id])
                                            if asset_data:
                                                for asset in asset_data:
                                                    asset_url = asset.get('url', '')
                                                    asset_name = asset.get('name', f'Asset {asset_id}')
                                                    if asset_url:
                                                        asset_list.append({
                                                            'type': asset.get('type', 'image'),
                                                            'url': asset_url,
                                                            'name': asset_name
                                                        })
                                                        logging.info(f"[TikTok] Asset URL: {asset_url}, name: {asset_name}")
                                                    else:
                                                        logging.warning(f"[TikTok] Asset {clean_asset_id} has no URL")
                                            else:
                                                logging.warning(f"[TikTok] Asset {asset_id} not found in asset service")
                                    
                                    # Create the ad data
                                    ad_data = {
                                        'advertiser_id': tiktok_account_id,
                                        'campaign_ids': tiktok_campaign_ids,
                                        'adgroup_ids': [adgroup_id],
                                        'ad_name': ad_name,
                                        'headline': headline,
                                        'assets': asset_list
                                    }
                                    
                                    # Call TikTok service to create the ad
                                    ad_id = tiktok_service.create_ad(ad_data)
                                    if isinstance(ad_id, dict) and 'success' in ad_id and ad_id['success'] is False:
                                        # This is an error response with details
                                        error_message = ad_id.get('error', 'Unknown error during ad creation')
                                        
                                        # Check for video validation errors
                                        if 'error_code' in ad_id and ad_id['error_code'] == 'VIDEO_VALIDATION_FAILED':
                                            # This is a video validation error, include detailed information
                                            details = ad_id.get('error_details', {})
                                            formatted_error = f"Video validation failed: {error_message}"
                                            
                                            # Add specific details based on the error type
                                            if 'aspect_ratio' in details:
                                                ar = details.get('aspect_ratio', 0)
                                                w = details.get('width', 0)
                                                h = details.get('height', 0)
                                                formatted_error = f"TikTok requires videos with aspect ratio 9:16, 1:1, or 16:9. Your video is {w}x{h} (ratio {ar:.2f}:1)."
                                            elif 'duration' in details:
                                                duration = details.get('duration', 0)
                                                if 'min_duration' in details:
                                                    formatted_error = f"TikTok requires videos to be at least 5 seconds long. Your video is {duration:.1f} seconds."
                                                elif 'max_duration' in details:
                                                    duration_min = int(duration / 60)
                                                    duration_sec = int(duration % 60)
                                                    formatted_error = f"TikTok requires videos to be maximum 10 minutes long. Your video is {duration_min}m {duration_sec}s."
                                            elif 'min_requirements' in details:
                                                w = details.get('width', 0)
                                                h = details.get('height', 0)
                                                formatted_error = f"TikTok requires minimum video resolution of 540x960px (9:16), 640x640px (1:1), or 960x540px (16:9). Your video is {w}x{h}px."
                                            
                                            created_ads['tiktok'].append({
                                                'name': ad_name,
                                                'adgroup_id': adgroup_id,
                                                'success': False,
                                                'message': 'Video validation failed',
                                                'error': formatted_error
                                            })
                                            logging.error(f"Failed to create TikTok ad: {ad_name} - {formatted_error}")
                                        else:
                                            created_ads['tiktok'].append({
                                                'name': ad_name,
                                                'adgroup_id': adgroup_id,
                                                'success': False,
                                                'message': 'Failed to create ad',
                                                'error': error_message
                                            })
                                            logging.error(f"Failed to create TikTok ad: {ad_name} - {error_message}")
                                    elif ad_id:
                                        created_ads['tiktok'].append({
                                            'id': ad_id,
                                            'name': ad_name,
                                            'adgroup_id': adgroup_id,
                                            'success': True,
                                            'message': 'Ad created successfully'
                                        })
                                        logging.info(f"Created TikTok ad with ID: {ad_id}")
                                    else:
                                        created_ads['tiktok'].append({
                                            'name': ad_name,
                                            'adgroup_id': adgroup_id,
                                            'success': False,
                                            'message': 'Failed to create ad',
                                            'error': 'Unknown error occurred during ad creation'
                                        })
                                        logging.error(f"Failed to create TikTok ad: {ad_name}")
            
            except Exception as e:
                logging.error(f"Error creating TikTok ads: {str(e)}")
                logging.exception(e)
                
                # Check log capture for specific errors
                log_content = log_capture.getvalue()
                if "Carousel ad requires at least 2 images" in log_content:
                    error_details = {
                        'tiktok': 'Carousel ad requires at least 2 images, but only 1 provided. Please add more images to your TikTok ad.'
                    }
                elif "Image upload by URL failed" in log_content:
                    error_details = {
                        'tiktok': 'Failed to upload image by URL. Please check your image URLs.'
                    }
                else:
                    error_details = {
                        'tiktok': str(e)
                    }
            
            # Clean up the log handler
            if 'log_handler' in locals() and 'tiktok_logger' in locals():
                tiktok_logger.removeHandler(log_handler)
            
            logging.info(f"TikTok ad IDs created: {created_ads['tiktok']}")
        
        # Return success/failure and created ad IDs
        if created_ads and any(len(ads) > 0 for platform, ads in created_ads.items() if isinstance(ads, list)):
            # Extract ad IDs from the created ads
            ad_ids = []
            
            # Also ensure each ad has an ad_id property for consistent frontend rendering
            for platform, ads in created_ads.items():
                if isinstance(ads, list):
                    for ad in ads:
                        if ad.get('success') and 'id' in ad:
                            # Add the ID to our list of created ad IDs
                            ad_ids.append(ad['id'])
                            
                            # Also ensure the ad has an ad_id property (frontend consistency)
                            if 'ad_id' not in ad:
                                ad['ad_id'] = ad['id']
            
            # Log the extracted ad IDs for debugging
            logging.info(f"Extracted {len(ad_ids)} ad IDs for response: {ad_ids}")
            
            return jsonify({
                'success': True,
                'message': 'Ads created successfully',
                'ads': created_ads,
                'ad_ids': ad_ids
            })
        else:
            # Check for specific TikTok errors that were caught during processing
            error_message = 'No ads were created successfully'
            
            # Extract platform-specific error messages from logs
            if 'tiktok' in platforms:
                if not created_ads.get('tiktok') or len(created_ads.get('tiktok', [])) == 0:
                    # Check the logs for specific error messages
                    if 'log_capture' in locals():
                        log_content = log_capture.getvalue()
                        if "Carousel ad requires at least 2 images" in log_content:
                            error_details['tiktok'] = 'Carousel ad requires at least 2 images, but only 1 provided. Please add more images to your TikTok ad.'
                        elif "Image upload by URL failed" in log_content:
                            error_details['tiktok'] = 'Failed to upload image by URL. Please check your image URLs.'
            
            return jsonify({
                'success': False,
                'message': error_message,
                'error_details': error_details
            }), 500
            
    except Exception as e:
        logging.error(f"Error in create_ad: {str(e)}")
        logging.exception(e)
        return jsonify({
            'success': False,
            'message': str(e),
            'error_details': {
                'general': str(e)
            }
        }), 500

def parse_structured_key(key):
    """Parse a structured form key like 'ad_names[platform][adset_id][index]'"""
    try:
        # Remove the prefix and brackets
        key = key.replace('ad_names[', '').replace('ad_headlines[', '').replace('headlines[', '').replace('ad_assets[', '')
        key = key.replace(']', '')
        
        # Split by remaining brackets
        parts = key.split('[')
        
        if len(parts) >= 3:
            platform = parts[0]
            adset_id = parts[1]
            index = parts[2]
            return platform, adset_id, index
        else:
            logging.warning(f"Could not parse structured key: {key}")
            return None, None, None
    except Exception as e:
        logging.error(f"Error parsing structured key: {key}, error: {str(e)}")
        return None, None, None

@ad_management_bp.route('/api/tiktok/campaigns', methods=['GET'])
def get_tiktok_campaigns():
    """Get TikTok campaigns for the specified advertiser account."""
    try:
        # Get advertiser_id from request parameters
        advertiser_id = request.args.get('advertiser_id')
        
        # Log the incoming request
        logging.info(f"Fetching TikTok campaigns for advertiser_id: {advertiser_id}")
        
        # Initialize TikTok service with the specified advertiser ID
        tiktok = TikTokService(advertiser_id=advertiser_id)
        
        # Get campaigns
        campaigns = tiktok.get_campaigns()
        
        # Log what we found
        logging.info(f"Found {len(campaigns)} TikTok campaigns for advertiser_id: {advertiser_id}")
        
        return jsonify({
            'status': 'success',
            'data': campaigns,
            'count': len(campaigns)
        })
    except Exception as e:
        logging.error(f"Error fetching TikTok campaigns: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f"Failed to fetch TikTok campaigns: {str(e)}"
        }), 500 