from flask import Blueprint, jsonify, request
from app.services.tiktok_service import TikTokService
from app.config.tiktok_config import get_all_tiktok_accounts
import logging

tiktok_bp = Blueprint('tiktok', __name__, url_prefix='/api/tiktok')

@tiktok_bp.route('/accounts', methods=['GET'])
def get_accounts():
    """API endpoint to get all TikTok advertiser accounts."""
    try:
        accounts = get_all_tiktok_accounts()
        return jsonify({'accounts': accounts})
    except Exception as e:
        logging.error(f"Error fetching TikTok accounts: {str(e)}")
        return jsonify({'error': str(e)}), 500

@tiktok_bp.route('/campaigns', methods=['GET'])
def api_get_campaigns():
    """API endpoint to get campaigns for a specific advertiser account."""
    advertiser_id = request.args.get('advertiser_id')
    
    if not advertiser_id:
        return jsonify({'error': 'Advertiser ID is required'}), 400
    
    try:
        tiktok_service = TikTokService(advertiser_id=advertiser_id)
        campaigns = tiktok_service.get_campaigns()
        return jsonify({'campaigns': campaigns})
    except Exception as e:
        logging.error(f"Error fetching TikTok campaigns: {str(e)}")
        return jsonify({'error': str(e)}), 500

@tiktok_bp.route('/adgroups', methods=['GET'])
def api_get_adgroups():
    """API endpoint to get adgroups for a specific campaign."""
    advertiser_id = request.args.get('advertiser_id')
    campaign_id = request.args.get('campaign_id')
    
    if not advertiser_id:
        return jsonify({'error': 'Advertiser ID is required'}), 400
    
    try:
        tiktok_service = TikTokService(advertiser_id=advertiser_id)
        adgroups = tiktok_service.get_adgroups(campaign_id=campaign_id)
        return jsonify({'adgroups': adgroups})
    except Exception as e:
        logging.error(f"Error fetching TikTok adgroups: {str(e)}")
        return jsonify({'error': str(e)}), 500 