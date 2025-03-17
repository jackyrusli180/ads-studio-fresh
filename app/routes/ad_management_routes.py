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
        # Handle both form data and JSON data formats
        is_json = request.is_json
        data = request.json if is_json else request.form
        
        # Extract form data
        platforms = data.getlist('platforms[]') if not is_json else data.get('platforms', [])
        
        # Log the incoming data for debugging
        logging.info(f"Creating ads for platforms: {platforms}")
        
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
                
                # Get the selected assets
                asset_ids = data.get('selected_asset_ids', '')
                asset_ids = asset_ids.split(',') if isinstance(asset_ids, str) else asset_ids
                
                logging.info(f"Creating Meta ads with account: {meta_account_id}, campaigns: {meta_campaign_ids}, adsets: {meta_adset_ids}")
                logging.info(f"Selected assets: {asset_ids}")
                
                # Initialize Meta service with the account ID
                from app.services.meta_service import MetaService
                meta_service = MetaService(ad_account_id=meta_account_id)
                
                # Get asset details - Use the asset_service instance instead of importing directly
                assets = asset_service.get_assets_by_ids(asset_ids) if asset_ids else []
                
                # Create ads for each adset
                meta_ad_ids = []
                
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
                tiktok_adset_ids = data.getlist('tiktok_adset_ids[]') if not is_json else data.get('tiktok_adset_ids', [])
                
                # Get the selected assets
                asset_ids = data.get('selected_asset_ids', '')
                asset_ids = asset_ids.split(',') if isinstance(asset_ids, str) else asset_ids
                
                logging.info(f"Creating TikTok ads with account: {tiktok_account_id}, campaigns: {tiktok_campaign_ids}, adgroups: {tiktok_adset_ids}")
                logging.info(f"Selected assets: {asset_ids}")
                
                # Initialize TikTok service with the advertiser ID
                from app.services.tiktok_service import TikTokService
                tiktok_service = TikTokService(advertiser_id=tiktok_account_id)
                
                # Get asset details - Use the asset_service instance instead of importing directly
                assets = asset_service.get_assets_by_ids(asset_ids) if asset_ids else []
                
                # Create ads for each adgroup (adset)
                tiktok_ad_ids = []
                
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