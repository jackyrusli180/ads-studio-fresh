import logging
import json
import re
import traceback
from flask import request, jsonify
from app.services.meta_service import MetaService

# Find where TikTok assets are mapped to Meta assets and add validation
def _map_tiktok_asset_to_meta(asset_id):
    """Map TikTok asset ID to Meta-compatible asset URL"""
    # Get asset from the database if available
    # For now, return placeholder URL with validation
    if asset_id.startswith('tiktok-url-'):
        # This is a placeholder asset, use a fallback image URL
        logging.info(f"Converting TikTok placeholder asset {asset_id} to fallback image")
        return {
            'type': 'image',
            'use_fallback': True,  # Signal to use fallback instead of trying to download
            'name': f'TikTok Asset {asset_id}'
        }
    elif asset_id.startswith('http://') or asset_id.startswith('https://'):
        # This is a valid URL, use it directly
        return {
            'type': 'image',
            'url': asset_id,
            'name': f'Asset from URL'
        }
    else:
        # For any other format, return as fallback
        logging.info(f"Using fallback for unknown asset format: {asset_id}")
        return {
            'type': 'image',
            'use_fallback': True,
            'name': f'Asset {asset_id}'
        }

# In the part where you create the ad data, modify to handle fallback
def process_meta_ads(form_data, advertiser_accounts):
    # ... existing code ...
    
    # When processing assets
    processed_assets = []
    for asset_id in asset_ids:
        if asset_id.startswith('tiktok-'):
            asset_data = _map_tiktok_asset_to_meta(asset_id)
            processed_assets.append(asset_data)
        else:
            # Handle other types of assets
            processed_assets.append({
                'type': 'image',
                'url': asset_id,
                'name': f'Asset {asset_id}'
            })
            
    # ... rest of the code ...

@bp.route('/create_ad', methods=['POST'])
def create_ad():
    """Create an ad in the selected platforms"""
    try:
        logging.info("RECEIVED CREATE AD REQUEST")
        logging.info("=" * 80)
        
        # Log request details
        logging.info(f"Request method: {request.method}")
        logging.info(f"Content type: {request.content_type}")
        logging.info(f"Content length: {request.content_length}")
        
        # Get form data
        form_data = request.form
        logging.info(f"Raw form data keys: {list(form_data.keys())}")
        
        # Process platforms from form data
        platforms = form_data.getlist('platforms[]') or form_data.getlist('platforms')
        logging.info(f"Creating ads for platforms: {platforms}")
        
        # Log all form data for debugging
        logging.info(f"Form data keys: {list(form_data.keys())}")
        
        # Get the advertiser accounts
        advertiser_accounts = form_data.getlist('advertiser_account_ids[]') or form_data.getlist('advertiser_account_id[]')
        logging.info(f"Advertiser accounts: {advertiser_accounts}")
        
        # Process platforms again (handle different formats)
        platforms = form_data.getlist('platforms[]') or form_data.getlist('platforms')
        logging.info(f"Creating ads for platforms: {platforms}")
        
        # Log all form data for debugging
        logging.info(f"Form data keys: {list(form_data.keys())}")
        
        # Count Meta and TikTok specific parameters
        meta_params = sum(1 for key in form_data.keys() if key.startswith('ad_names[meta]') or key.startswith('meta_'))
        tiktok_params = sum(1 for key in form_data.keys() if key.startswith('tiktok_'))
        logging.info(f"Meta-specific params found: {meta_params}")
        logging.info(f"TikTok-specific params found: {tiktok_params}")
        
        # If there are no Meta-specific fields but TikTok ones exist, warn about using TikTok fields
        if meta_params == 0 and tiktok_params > 0:
            logging.info("WARNING: No 'ad_names[meta]' field in form data, will try to use TikTok fields")
        
        # Get the advertiser accounts (try multiple field names)
        advertiser_accounts = form_data.getlist('advertiser_account_ids[]') or form_data.getlist('advertiser_account_id[]')
        logging.info(f"Advertiser accounts: {advertiser_accounts}")
        
        # Process selected assets
        selected_assets_field = form_data.get('selected_asset_ids', '{}')
        logging.info(f"Processing selected_asset_ids field")
        try:
            asset_mapping = json.loads(selected_assets_field)
            logging.info(f"Successfully parsed asset mapping: {asset_mapping}")
        except json.JSONDecodeError:
            logging.warning(f"Error parsing selected_asset_ids JSON: {selected_assets_field}")
            asset_mapping = {}
        
        # Parse ad names, headlines and assets from form data
        ad_names = {}
        ad_headlines = {}
        ad_assets = {}
        
        # Extract data from form structure like ad_names[platform][adset_id][variant_index]
        for key in form_data.keys():
            if key.startswith('ad_names['):
                # Extract platform, adset_id, and variant_index
                match = re.match(r'ad_names\[([^\]]+)\]\[([^\]]+)\]\[([^\]]+)\]', key)
                if match:
                    platform, adset_id, variant_index = match.groups()
                    
                    # Initialize the platform in the dictionaries if not present
                    if platform not in ad_names:
                        ad_names[platform] = {}
                    if platform not in ad_headlines:
                        ad_headlines[platform] = {}
                    if platform not in ad_assets:
                        ad_assets[platform] = {}
                    
                    # Initialize the adset_id in the dictionaries if not present
                    if adset_id not in ad_names[platform]:
                        ad_names[platform][adset_id] = {}
                    if adset_id not in ad_headlines[platform]:
                        ad_headlines[platform][adset_id] = {}
                    if adset_id not in ad_assets[platform]:
                        ad_assets[platform][adset_id] = {}
                    
                    # Store the ad name
                    ad_names[platform][adset_id][variant_index] = form_data[key]
                    
                    # Try to find the corresponding headline
                    headline_key = f'ad_headlines[{platform}][{adset_id}][{variant_index}]'
                    if headline_key in form_data:
                        ad_headlines[platform][adset_id][variant_index] = form_data[headline_key]
                    
                    # Try to find the corresponding assets
                    assets_key = f'ad_assets[{platform}][{adset_id}][{variant_index}]'
                    if assets_key in form_data:
                        # If multiple assets are selected, the form will have an assets array
                        assets_value = form_data.getlist(assets_key)
                        ad_assets[platform][adset_id][variant_index] = assets_value
            
            # Special handling for TikTok fields when using as Meta fields
            elif key.startswith('tiktok_ad_names[') and 'meta' not in ad_names and 'meta' in platforms:
                # Extract adset_id and variant_index
                match = re.match(r'tiktok_ad_names\[([^\]]+)\]\[([^\]]+)\]', key)
                if match:
                    adset_id, variant_index = match.groups()
                    
                    # Initialize Meta in the dictionaries if not present
                    if 'meta' not in ad_names:
                        ad_names['meta'] = {}
                    if 'meta' not in ad_headlines:
                        ad_headlines['meta'] = {}
                    if 'meta' not in ad_assets:
                        ad_assets['meta'] = {}
                    
                    # Initialize the adset_id in the dictionaries if not present
                    if adset_id not in ad_names['meta']:
                        ad_names['meta'][adset_id] = {}
                    if adset_id not in ad_headlines['meta']:
                        ad_headlines['meta'][adset_id] = {}
                    if adset_id not in ad_assets['meta']:
                        ad_assets['meta'][adset_id] = {}
                    
                    # Store the ad name from the TikTok field for Meta
                    ad_names['meta'][adset_id][variant_index] = form_data[key]
                    
                    # Try to find the corresponding headline
                    headline_key = f'tiktok_ad_headlines[{adset_id}][{variant_index}]'
                    if headline_key in form_data:
                        ad_headlines['meta'][adset_id][variant_index] = form_data[headline_key]
                    
                    # For assets, use selected_asset_ids if available, or TikTok assets if mapped
                    # Use tiktok-url-X as a placeholder for TikTok assets, the Meta service will handle
                    # these by generating a fallback image
                    asset_id = f"tiktok-url-{variant_index}"
                    ad_assets['meta'][adset_id][variant_index] = [asset_id]
        
        logging.info(f"Parsed ad names: {ad_names}")
        logging.info(f"Parsed headlines: {ad_headlines}")
        logging.info(f"Parsed ad assets: {ad_assets}")
        
        results = {}
        
        # Process ads for each platform
        if 'meta' in platforms:
            logging.info("Processing Meta ads")
            # Check if we have meta ads to process
            if 'meta' in ad_names:
                # Get Meta account ID from form data
                meta_account_id = form_data.get('meta_account_id', advertiser_accounts[0] if advertiser_accounts else None)
                
                # Initialize Meta service
                logging.info(f"Initializing Meta service with account ID: {meta_account_id}")
                meta_service = MetaService(ad_account_id=meta_account_id)
                
                # Get Meta campaign IDs
                meta_campaign_ids = form_data.getlist('meta_campaign_ids[]')
                if meta_campaign_ids:
                    logging.info(f"Using Meta campaign ID: {meta_campaign_ids[0]}")
                
                meta_ad_ids = []
                
                # Process each adset and variant
                for adset_id in ad_names['meta'].keys():
                    logging.info(f"[Meta] Processing adset ID: {adset_id}")
                    
                    for variant_index in ad_names['meta'][adset_id].keys():
                        # Check if we have a Meta-specific ad name
                        meta_ad_name = ad_names['meta'][adset_id].get(variant_index)
                        tiktok_ad_name = form_data.get(f'tiktok_ad_names[{adset_id}][{variant_index}]')
                        
                        logging.info(f"[Meta] Ad name from meta-specific format: {meta_ad_name}")
                        logging.info(f"[Meta] Ad name from tiktok format: {[tiktok_ad_name, form_data.get(f'tiktok_ad_names[{adset_id}][{variant_index}]', '')]}")
                        
                        # Use Meta name if available, otherwise fall back to TikTok name
                        final_ad_name = meta_ad_name or tiktok_ad_name or f"Ad {variant_index} for AdSet {adset_id}"
                        logging.info(f"[Meta] Final ad name: {final_ad_name}")
                        
                        # Get headline
                        headline = ad_headlines.get('meta', {}).get(adset_id, {}).get(variant_index) or \
                                  form_data.get(f'tiktok_ad_headlines[{adset_id}][{variant_index}]', 'Download our app')
                        
                        logging.info(f"[Meta] Creating ad with name: '{final_ad_name}', headline: '{headline}', adset: {adset_id}")
                        
                        # Get assets
                        asset_ids = ad_assets.get('meta', {}).get(adset_id, {}).get(variant_index, [])
                        if not asset_ids:
                            # Try to get asset ID from the TikTok form field naming convention
                            logging.info(f"[Meta] No Meta assets found for {adset_id}, using TikTok asset placeholder")
                            asset_ids = [f"tiktok-url-{variant_index}"]
                        
                        # Build a list of processed assets with proper handling for TikTok URLs
                        processed_assets = []
                        for asset_id in asset_ids:
                            logging.info(f"[Meta] Processing asset ID: {asset_id}")
                            if isinstance(asset_id, str) and asset_id.startswith('tiktok-'):
                                logging.info(f"[Meta] Processing TikTok URL asset: {asset_id}")
                                asset = _map_tiktok_asset_to_meta(asset_id)
                                processed_assets.append(asset)
                            else:
                                # Use the asset ID as a URL if it looks like a URL
                                if isinstance(asset_id, str) and (asset_id.startswith('http://') or asset_id.startswith('https://')):
                                    processed_assets.append({
                                        'type': 'image',
                                        'url': asset_id,
                                        'name': f'Asset from URL'
                                    })
                                else:
                                    # Use fallback for any other asset format
                                    processed_assets.append({
                                        'type': 'image',
                                        'use_fallback': True,
                                        'name': f'Fallback for {asset_id}'
                                    })
                        
                        # Build the final ad data
                        ad_data = {
                            'name': final_ad_name,
                            'adset_id': adset_id,
                            'headline': headline,
                            'assets': processed_assets
                        }
                        
                        logging.info(f"[Meta] Final ad data: {ad_data}")
                        
                        # Create the ad
                        logging.info(f"[Meta] Creating ad with data: {ad_data}")
                        for i, asset in enumerate(ad_data['assets']):
                            logging.info(f"[Meta] Asset {i+1}: {asset.get('type')} - {asset.get('url', asset.get('name', 'unnamed'))}")
                        
                        try:
                            result = meta_service.create_ad(ad_data)
                            logging.info(f"[Meta] Created ad with ID: {result}")
                            
                            if result.get('success') and result.get('ad_id'):
                                meta_ad_ids.append(result['ad_id'])
                        except Exception as e:
                            logging.error(f"[Meta] Error creating ad: {e}")
                
                results['meta'] = meta_ad_ids
            else:
                logging.warning("[Meta] No asset data found for adset {adset_id}")
        
        # Similar processing for TikTok would go here
        
        # Extract all ad IDs for response
        ad_ids = []
        for platform, platform_ids in results.items():
            ad_ids.extend(platform_ids)
        
        logging.info(f"Extracted {len(ad_ids)} ad IDs for response: {ad_ids}")
        
        return jsonify({
            'success': True,
            'ad_ids': ad_ids,
            'message': f"Successfully created {len(ad_ids)} ads"
        })
        
    except Exception as e:
        logging.error(f"Error creating ads: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500 