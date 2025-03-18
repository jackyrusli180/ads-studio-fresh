"""
Ad Management Routes
Handles routes for ad creation, management and campaigns
"""
from flask import Blueprint, render_template, request, jsonify
from app.services.asset_service import AssetService
import logging
from flask import url_for

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
    """API endpoint to create new ads using the selected assets"""
    try:
        # Enhanced logging at the beginning of the request
        logging.info("=" * 80)
        logging.info("RECEIVED CREATE AD REQUEST")
        logging.info("=" * 80)
        
        # Log request method, content type, and content length
        logging.info(f"Request method: {request.method}")
        logging.info(f"Content type: {request.content_type}")
        logging.info(f"Content length: {request.content_length}")
        
        # Handle both form data and JSON data formats
        is_json = request.is_json
        data = request.json if is_json else request.form
        
        # Log raw form data first
        logging.info(f"Raw form data keys: {list(request.form.keys())}")
        if request.files:
            logging.info(f"Request includes {len(request.files)} file(s)")
            for file_name in request.files:
                logging.info(f"  - File: {file_name}")
        
        # Extract form data
        platforms = data.getlist('platforms[]') if not is_json else data.get('platforms', [])
        
        # Log the incoming data for debugging
        logging.info(f"Creating ads for platforms: {platforms}")
        logging.info(f"Form data keys: {list(data.keys())}")
        
        # More detailed data logging
        advertiser_accounts = data.getlist('advertiser_account_ids[]') if not is_json else data.get('advertiser_account_ids', [])
        logging.info(f"Advertiser accounts: {advertiser_accounts}")
        
        # Log each platform-specific data
        for platform in platforms:
            campaign_ids = data.getlist(f'{platform}_campaign_ids[]') if not is_json else data.get(f'{platform}_campaign_ids', [])
            adset_ids = data.getlist(f'{platform}_adset_ids[]') if not is_json else data.get(f'{platform}_adset_ids', [])
            logging.info(f"{platform.upper()} - Account ID: {data.get(f'{platform}_account_id')}")
            logging.info(f"{platform.upper()} - Campaign IDs: {campaign_ids}")
            logging.info(f"{platform.upper()} - Adset IDs: {adset_ids}")
        
        # Process ad_names, headlines, and ad_assets data
        ad_names = {}
        headlines = {}
        ad_assets = {}
        
        # Extract structured data for ad names, headlines, and assets
        for key in data.keys():
            if key.startswith('ad_names['):
                platform, adset_id, index = parse_structured_key(key)
                if platform not in ad_names:
                    ad_names[platform] = {}
                if adset_id not in ad_names[platform]:
                    ad_names[platform][adset_id] = {}
                ad_names[platform][adset_id][index] = data.get(key)
            
            elif key.startswith('ad_headlines['):
                platform, adset_id, index = parse_structured_key(key)
                if platform not in headlines:
                    headlines[platform] = {}
                if adset_id not in headlines[platform]:
                    headlines[platform][adset_id] = {}
                headlines[platform][adset_id][index] = data.get(key)
            
            elif key.startswith('headlines['):  # Support legacy format
                platform, adset_id, index = parse_structured_key(key)
                if platform not in headlines:
                    headlines[platform] = {}
                if adset_id not in headlines[platform]:
                    headlines[platform][adset_id] = {}
                headlines[platform][adset_id][index] = data.get(key)
            
            elif key.startswith('ad_assets['):
                platform, adset_id, index = parse_structured_key(key)
                if platform not in ad_assets:
                    ad_assets[platform] = {}
                if adset_id not in ad_assets[platform]:
                    ad_assets[platform][adset_id] = {}
                
                # Split comma-separated asset IDs into a list
                assets_value = data.get(key, '')
                ad_assets[platform][adset_id][index] = assets_value.split(',') if assets_value else []
        
        logging.info(f"Parsed ad names: {ad_names}")
        logging.info(f"Parsed headlines: {headlines}")
        logging.info(f"Parsed ad assets: {ad_assets}")
        
        response = {
            'success': False,
            'message': 'No ads were created',
            'ad_ids': {}
        }
        
        # Process for each platform
        if 'meta' in platforms:
            try:
                # Extract Meta-specific parameters
                meta_account_id = data.get('meta_account_id')
                meta_campaign_ids = data.getlist('meta_campaign_ids[]') if not is_json else data.get('meta_campaign_ids', [])
                meta_adset_ids = data.getlist('meta_adset_ids[]') if not is_json else data.get('meta_adset_ids', [])
                
                logging.info(f"Creating Meta ads with account: {meta_account_id}, campaigns: {meta_campaign_ids}, adsets: {meta_adset_ids}")
                
                # Initialize Meta service with the account ID
                from app.services.meta_service import MetaService
                meta_service = MetaService(ad_account_id=meta_account_id)
                
                # Create ads for each adset using the structured data
                meta_ad_ids = []
                
                if 'meta' in ad_names and 'meta' in ad_assets:
                    for adset_id in meta_adset_ids:
                        if not adset_id:
                            continue
                        
                        # Check if we have ad data for this adset
                        if adset_id in ad_names.get('meta', {}) and adset_id in ad_assets.get('meta', {}):
                            adset_ad_names = ad_names['meta'][adset_id]
                            adset_headlines = headlines.get('meta', {}).get(adset_id, {})
                            adset_assets = ad_assets['meta'][adset_id]
                            
                            # Create each ad in this adset
                            for ad_index in adset_ad_names:
                                ad_name = adset_ad_names[ad_index]
                                headline = adset_headlines.get(ad_index, '')
                                asset_ids = adset_assets.get(ad_index, [])
                                
                                if not asset_ids:
                                    logging.warning(f"No assets found for ad {ad_name} in adset {adset_id}")
                                    continue
                                
                                logging.info(f"Creating Meta ad '{ad_name}' with headline '{headline}' and assets: {asset_ids}")
                                
                                # Get asset details
                                assets = asset_service.get_assets_by_ids(asset_ids)
                                
                                # Prepare ad data
                                ad_data = {
                                    'name': ad_name,
                                    'headline': headline,
                                    'adset_id': adset_id,
                                    'creative_type': 'IMAGE' if any(a.get('type') == 'image' for a in assets) else 'VIDEO',
                                    'assets': assets
                                }
                                
                                # Create the ad and track success
                                try:
                                    ad_id = meta_service.create_ad(ad_data)
                                    meta_ad_ids.append(ad_id)
                                    logging.info(f"Successfully created Meta ad with ID: {ad_id}")
                                except Exception as e:
                                    logging.error(f"Error creating Meta ad '{ad_name}' for adset {adset_id}: {str(e)}")
                        else:
                            logging.warning(f"No ad data found for Meta adset {adset_id}")
                else:
                    # Fallback to original method if structured data is not available
                    logging.info("Using fallback method for Meta ads creation")
                    
                    # Get the selected assets
                    asset_ids = data.get('selected_asset_ids', '')
                    asset_ids = asset_ids.split(',') if isinstance(asset_ids, str) else asset_ids
                    logging.info(f"Selected assets (fallback): {asset_ids}")
                    
                    # Get asset details
                    assets = asset_service.get_assets_by_ids(asset_ids) if asset_ids else []
                    
                    for adset_id in meta_adset_ids:
                        if not adset_id:
                            continue
                        
                        # Prepare ad data
                        ad_data = {
                            'name': f"Ad for AdSet {adset_id}",
                            'adset_id': adset_id,
                            'creative_type': 'IMAGE' if any(a.get('type') == 'image' for a in assets) else 'VIDEO',
                            'assets': assets
                        }
                        
                        # Create the ad and track success
                        try:
                            ad_id = meta_service.create_ad(ad_data)
                            meta_ad_ids.append(ad_id)
                            logging.info(f"Successfully created Meta ad with ID: {ad_id}")
                        except Exception as e:
                            logging.error(f"Error creating Meta ad for adset {adset_id}: {str(e)}")
                
                if meta_ad_ids:
                    response['ad_ids']['meta'] = meta_ad_ids
                    response['success'] = True
                    response['message'] = 'Ads created successfully'
            
            except Exception as e:
                logging.error(f"Error processing Meta platform: {str(e)}")
        
        if 'tiktok' in platforms:
            try:
                # Extract TikTok-specific parameters
                tiktok_account_id = data.get('tiktok_account_id')
                tiktok_campaign_ids = data.getlist('tiktok_campaign_ids[]') if not is_json else data.get('tiktok_campaign_ids', [])
                
                # Try to get adset_ids first, then fallback to adgroup_ids if needed
                tiktok_adset_ids = data.getlist('tiktok_adset_ids[]') if not is_json else data.get('tiktok_adset_ids', [])
                
                # If no adset_ids found, check for adgroup_ids
                if not tiktok_adset_ids:
                    tiktok_adset_ids = data.getlist('tiktok_adgroup_ids[]') if not is_json else data.get('tiktok_adgroup_ids', [])
                
                # If still empty but we have drop zones with assets, extract adset IDs from there
                if not tiktok_adset_ids and 'tiktok' in ad_assets:
                    tiktok_adset_ids = list(ad_assets['tiktok'].keys())
                
                logging.info(f"Creating TikTok ads with account: {tiktok_account_id}, campaigns: {tiktok_campaign_ids}, adgroups: {tiktok_adset_ids}")
                
                # If still no account ID, try to get from advertiser_account_ids
                if not tiktok_account_id:
                    advertiser_accounts = data.getlist('advertiser_account_ids[]') if not is_json else data.get('advertiser_account_ids', [])
                    if advertiser_accounts:
                        tiktok_account_id = advertiser_accounts[0]
                        logging.info(f"Using first advertiser account as TikTok account ID: {tiktok_account_id}")
                
                # Initialize TikTok service with the advertiser ID
                from app.services.tiktok_service import TikTokService
                tiktok_service = TikTokService(advertiser_id=tiktok_account_id)
                
                # Create ads for each adgroup (adset) using the structured data
                tiktok_ad_ids = []
                
                if 'tiktok' in ad_names and 'tiktok' in ad_assets:
                    for adgroup_id in tiktok_adset_ids:
                        if not adgroup_id:
                            continue
                        
                        # Check if we have ad data for this adgroup
                        if adgroup_id in ad_names.get('tiktok', {}) and adgroup_id in ad_assets.get('tiktok', {}):
                            adgroup_ad_names = ad_names['tiktok'][adgroup_id]
                            adgroup_headlines = headlines.get('tiktok', {}).get(adgroup_id, {})
                            adgroup_assets = ad_assets['tiktok'][adgroup_id]
                            
                            # Create each ad in this adgroup
                            for ad_index in adgroup_ad_names:
                                ad_name = adgroup_ad_names[ad_index]
                                headline = adgroup_headlines.get(ad_index, '')
                                asset_ids = adgroup_assets.get(ad_index, [])
                                
                                if not asset_ids:
                                    logging.warning(f"No assets found for ad {ad_name} in adgroup {adgroup_id}")
                                    continue
                                
                                logging.info(f"Creating TikTok ad '{ad_name}' with headline '{headline}' and assets: {asset_ids}")
                                
                                # Get asset details
                                assets = asset_service.get_assets_by_ids(asset_ids)
                                logging.info(f"Retrieved {len(assets)} assets from asset service: {assets}")
                                
                                # Prepare ad data
                                ad_data = {
                                    'name': ad_name,
                                    'headline': headline,
                                    'adgroup_id': adgroup_id,
                                    'assets': assets
                                }
                                
                                # Create the ad and track success
                                try:
                                    ad_id = tiktok_service.create_ad(ad_data)
                                    tiktok_ad_ids.append(ad_id)
                                    logging.info(f"Successfully created TikTok ad with ID: {ad_id}")
                                except Exception as e:
                                    logging.error(f"Error creating TikTok ad '{ad_name}' for adgroup {adgroup_id}: {str(e)}")
                                    logging.exception(e)  # Log the full traceback for better debugging
                        else:
                            logging.warning(f"No ad data found for TikTok adgroup {adgroup_id}")
                else:
                    # Fallback to original method if structured data is not available
                    logging.info("Using fallback method for TikTok ads creation")
                    
                    # Get the selected assets
                    asset_ids = data.get('selected_asset_ids', '')
                    asset_ids = asset_ids.split(',') if isinstance(asset_ids, str) else asset_ids
                    logging.info(f"Selected assets (fallback): {asset_ids}")
                    
                    # Get asset details
                    assets = asset_service.get_assets_by_ids(asset_ids) if asset_ids else []
                    
                    for adgroup_id in tiktok_adset_ids:
                        if not adgroup_id:
                            continue
                        
                        # Prepare ad data
                        ad_data = {
                            'name': f"Ad for AdGroup {adgroup_id}",
                            'adgroup_id': adgroup_id,
                            'creative_type': 'IMAGE' if any(a.get('type') == 'image' for a in assets) else 'VIDEO',
                            'assets': assets
                        }
                        
                        # Create the ad and track success
                        try:
                            ad_id = tiktok_service.create_ad(ad_data)
                            tiktok_ad_ids.append(ad_id)
                            logging.info(f"Successfully created TikTok ad with ID: {ad_id}")
                        except Exception as e:
                            logging.error(f"Error creating TikTok ad for adgroup {adgroup_id}: {str(e)}")
                
                if tiktok_ad_ids:
                    response['ad_ids']['tiktok'] = tiktok_ad_ids
                    response['success'] = True
                    response['message'] = 'Ads created successfully'
            
            except Exception as e:
                logging.error(f"Error processing TikTok platform: {str(e)}")
        
        # If at least one platform was successful, return success response
        if response['success']:
            logging.info(f"Ad creation successful: {response}")
            response['redirect'] = url_for('ad_management.ads_builder')
            return jsonify(response)
        else:
            logging.error("No ads were created successfully")
            return jsonify({'success': False, 'error': 'No ads were created successfully'}), 500
            
    except Exception as e:
        logging.error(f"Error in create_ad route: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

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