"""
API Routes for the Ads Builder application
"""
from flask import Blueprint, jsonify, request, current_app
from app.services.meta_service import MetaService
from app.services.tiktok_service import TikTokService
from app.config.meta_config import get_all_meta_accounts, get_meta_account_details
from app.config.tiktok_config import get_all_tiktok_accounts, get_tiktok_account_details
from app.services.ads_builder import CampaignBuilder

api_bp = Blueprint('api', __name__, url_prefix='/api')

# Initialize services
meta_service = MetaService()
tiktok_service = TikTokService()
campaign_builder = CampaignBuilder()

# Multi-platform accounts endpoint
@api_bp.route('/accounts', methods=['GET'])
def get_platform_accounts():
    """Get accounts for specific platforms
    
    Query parameters:
        platforms: Comma-separated list of platforms (meta, tiktok)
    """
    try:
        platforms_param = request.args.get('platforms', '')
        platforms = [p.strip() for p in platforms_param.split(',')] if platforms_param else []
        
        response = {}
        
        if 'meta' in platforms:
            meta_accounts = get_all_meta_accounts()
            response['meta'] = meta_accounts
            current_app.logger.info(f"Returning {len(meta_accounts)} Meta accounts")
            
        if 'tiktok' in platforms:
            tiktok_accounts = get_all_tiktok_accounts()
            response['tiktok'] = tiktok_accounts
            current_app.logger.info(f"Returning {len(tiktok_accounts)} TikTok accounts")
            
        # If a single platform was requested, just return the accounts directly
        if len(platforms) == 1 and platforms[0] in response:
            current_app.logger.info(f"Single platform: returning {len(response[platforms[0]])} accounts")
            return jsonify(response[platforms[0]])
            
        current_app.logger.info(f"Multiple platforms: returning {sum(len(accounts) for accounts in response.values())} accounts")
        return jsonify(response)
    except Exception as e:
        current_app.logger.error(f"Error fetching accounts: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Meta API routes
@api_bp.route('/meta/accounts', methods=['GET'])
def get_meta_accounts():
    """Get all Meta advertiser accounts"""
    try:
        accounts = get_all_meta_accounts()
        return jsonify(accounts)
    except Exception as e:
        current_app.logger.error(f"Error fetching Meta accounts: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/meta/campaigns', methods=['GET'])
def get_meta_campaigns():
    """Get campaigns for a Meta account"""
    try:
        account_id = request.args.get('account_id')
        if not account_id:
            return jsonify({"error": "account_id is required"}), 400
            
        # Initialize service with the selected account
        meta_service.ad_account_id = account_id
        
        # Get campaigns
        campaigns = meta_service.get_campaigns(account_id=account_id)
        return jsonify(campaigns)
    except Exception as e:
        current_app.logger.error(f"Error fetching Meta campaigns: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/meta/adsets', methods=['GET'])
def get_meta_adsets():
    """Get adsets for a Meta campaign"""
    try:
        account_id = request.args.get('account_id')
        campaign_id = request.args.get('campaign_id')
        
        if not account_id:
            return jsonify({"error": "account_id is required"}), 400
        if not campaign_id:
            return jsonify({"error": "campaign_id is required"}), 400
            
        # Initialize service with the selected account
        meta_service.ad_account_id = account_id
        
        # Get adsets
        adsets = meta_service.get_adsets(account_id=account_id, campaign_id=campaign_id)
        return jsonify(adsets)
    except Exception as e:
        current_app.logger.error(f"Error fetching Meta adsets: {str(e)}")
        return jsonify({"error": str(e)}), 500

# TikTok API routes
@api_bp.route('/tiktok/accounts', methods=['GET'])
def get_tiktok_accounts():
    """Get all TikTok advertiser accounts"""
    try:
        accounts = get_all_tiktok_accounts()
        return jsonify(accounts)
    except Exception as e:
        current_app.logger.error(f"Error fetching TikTok accounts: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/tiktok/campaigns', methods=['GET'])
def get_tiktok_campaigns():
    """Get campaigns for a TikTok account"""
    try:
        advertiser_id = request.args.get('advertiser_id')
        if not advertiser_id:
            current_app.logger.warning("advertiser_id parameter is required")
            return jsonify({"error": "advertiser_id is required"}), 400
            
        current_app.logger.info(f"Fetching TikTok campaigns for advertiser_id: {advertiser_id}")
            
        # Initialize service with the selected account
        tiktok_service.advertiser_id = advertiser_id
        
        # Get campaigns
        campaigns = tiktok_service.get_campaigns()
        current_app.logger.info(f"Found {len(campaigns)} TikTok campaigns")
        
        # Return campaigns in the expected format
        return jsonify({"campaigns": campaigns})
    except Exception as e:
        current_app.logger.error(f"Error fetching TikTok campaigns: {str(e)}")
        return jsonify({"error": str(e)}), 500

@api_bp.route('/tiktok/adsets', methods=['GET'])
def get_tiktok_adsets():
    """Get adsets (ad groups) for a TikTok campaign"""
    try:
        advertiser_id = request.args.get('advertiser_id')
        campaign_id = request.args.get('campaign_id')
        
        if not advertiser_id:
            current_app.logger.warning("advertiser_id parameter is required")
            return jsonify({"error": "advertiser_id is required"}), 400
        if not campaign_id:
            current_app.logger.warning("campaign_id parameter is required")
            return jsonify({"error": "campaign_id is required"}), 400
            
        current_app.logger.info(f"Fetching TikTok adsets for advertiser_id: {advertiser_id}, campaign_id: {campaign_id}")
            
        # Initialize service with the selected account
        tiktok_service.advertiser_id = advertiser_id
        
        # Get adsets (ad groups in TikTok terminology)
        adsets = tiktok_service.get_adgroups(campaign_id=campaign_id)
        current_app.logger.info(f"Found {len(adsets)} TikTok adsets")
        
        # Return adsets in the expected format
        return jsonify({"adsets": adsets})
    except Exception as e:
        current_app.logger.error(f"Error fetching TikTok adsets: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Asset library routes
@api_bp.route('/assets/library', methods=['GET'])
def get_asset_library():
    """Get assets from the media library"""
    try:
        # This would typically fetch from a database or file storage
        # For now, we'll return some sample assets
        assets = [
            {
                "id": "asset1",
                "name": "Sample Image 1",
                "type": "image",
                "url": "/static/media/sample-image-1.jpg"
            },
            {
                "id": "asset2",
                "name": "Sample Video 1",
                "type": "video",
                "url": "/static/media/sample-video-1.mp4"
            },
            {
                "id": "asset3",
                "name": "Sample Image 2",
                "type": "image",
                "url": "/static/media/sample-image-2.jpg"
            }
        ]
        return jsonify(assets)
    except Exception as e:
        current_app.logger.error(f"Error fetching asset library: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Ad creation route
@api_bp.route('/ads/create', methods=['POST'])
def create_ads():
    """Create ads for selected adsets"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Process ad creation
        # This would typically call platform-specific APIs to create the ads
        # For now, we'll just return success
        return jsonify({
            "success": True,
            "message": "Ads created successfully",
            "data": {
                "created_ads": len(data.get('ads', []))
            }
        })
    except Exception as e:
        current_app.logger.error(f"Error creating ads: {str(e)}")
        return jsonify({"error": str(e)}), 500 