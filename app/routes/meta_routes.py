"""
Meta Advertising Routes
Handles routes for Meta (Facebook/Instagram) advertising operations
"""
from flask import Blueprint, jsonify, request, render_template, redirect, url_for, flash
from app.services.meta_service import MetaService
import logging

# Regular routes for web pages
meta_bp = Blueprint('meta', __name__, url_prefix='/meta')
# API routes for JSON data
meta_api_bp = Blueprint('meta_api', __name__, url_prefix='/api/meta')
meta_service = MetaService()

@meta_bp.route('/accounts')
def get_accounts():
    """Get all Meta ad accounts"""
    try:
        accounts = meta_service.get_ad_accounts()
        return render_template('ad_management/meta/accounts.html', accounts=accounts)
    except Exception as e:
        flash(f"Error fetching Meta accounts: {str(e)}", 'error')
        return redirect(url_for('ad_management.ads_builder'))

@meta_bp.route('/campaigns/<account_id>')
def get_campaigns(account_id):
    """Get campaigns for a specific ad account"""
    try:
        campaigns = meta_service.get_campaigns(account_id)
        return render_template('ad_management/meta/campaigns.html', 
                              campaigns=campaigns, 
                              account_id=account_id)
    except Exception as e:
        flash(f"Error fetching Meta campaigns: {str(e)}", 'error')
        return redirect(url_for('meta.get_accounts'))

@meta_bp.route('/adsets/<account_id>')
def get_adsets(account_id):
    """Get all ad sets for an account"""
    campaign_id = request.args.get('campaign_id')
    try:
        adsets = meta_service.get_adsets(account_id, campaign_id)
        return render_template('ad_management/meta/adsets.html',
                              adsets=adsets,
                              account_id=account_id,
                              campaign_id=campaign_id)
    except Exception as e:
        flash(f"Error fetching Meta ad sets: {str(e)}", 'error')
        return redirect(url_for('meta.get_campaigns', account_id=account_id))

@meta_bp.route('/campaign/create/<account_id>', methods=['GET', 'POST'])
def create_campaign(account_id):
    """Create a new Meta campaign"""
    if request.method == 'POST':
        try:
            campaign_data = {
                'name': request.form.get('name'),
                'objective': request.form.get('objective'),
                'status': request.form.get('status', 'PAUSED'),
            }
            
            # Handle budget (either daily or lifetime)
            if request.form.get('budget_type') == 'daily':
                campaign_data['daily_budget'] = int(float(request.form.get('budget_amount', 0)) * 100)
            else:
                campaign_data['lifetime_budget'] = int(float(request.form.get('budget_amount', 0)) * 100)
            
            campaign = meta_service.create_campaign(account_id, campaign_data)
            flash(f"Campaign '{campaign_data['name']}' created successfully!", 'success')
            return redirect(url_for('meta.get_campaigns', account_id=account_id))
        except Exception as e:
            flash(f"Error creating campaign: {str(e)}", 'error')
            return render_template('ad_management/meta/create_campaign.html', account_id=account_id)
    
    return render_template('ad_management/meta/create_campaign.html', account_id=account_id)

@meta_bp.route('/campaign/insights/<campaign_id>')
def campaign_insights(campaign_id):
    """Get insights for a specific campaign"""
    try:
        insights = meta_service.get_campaign_insights(campaign_id)
        return render_template('ad_management/meta/insights.html', insights=insights, campaign_id=campaign_id)
    except Exception as e:
        flash(f"Error fetching campaign insights: {str(e)}", 'error')
        return redirect(url_for('meta.get_accounts'))

@meta_bp.route('/dashboard')
def dashboard():
    """Meta advertising dashboard with overview of accounts and campaigns"""
    try:
        accounts = meta_service.get_ad_accounts()
        
        # If there's only one account, get its campaigns
        campaigns = []
        if len(accounts) == 1:
            account_id = accounts[0].get('account_id', '')
            campaigns = meta_service.get_campaigns(account_id)
        
        return render_template('ad_management/meta/dashboard.html', 
                              accounts=accounts,
                              campaigns=campaigns)
    except Exception as e:
        flash(f"Error loading Meta dashboard: {str(e)}", 'error')
        return redirect(url_for('ad_management.ads_builder'))

@meta_api_bp.route('/accounts', methods=['GET'])
def api_get_accounts():
    """API endpoint to get all Meta advertiser accounts."""
    try:
        from app.config.meta_config import get_all_meta_accounts
        accounts = get_all_meta_accounts()
        return jsonify({'accounts': accounts})
    except Exception as e:
        logging.error(f"Error fetching Meta accounts: {str(e)}")
        return jsonify({'error': str(e)}), 500 

@meta_api_bp.route('/campaigns', methods=['GET'])
def api_get_campaigns():
    """API endpoint to get campaigns for a specific ad account"""
    account_id = request.args.get('account_id')
    if not account_id:
        return jsonify({'error': 'Account ID is required'}), 400
    
    try:
        campaigns = meta_service.get_campaigns(account_id=account_id)
        return jsonify({'campaigns': campaigns})
    except Exception as e:
        logging.error(f"Error fetching Meta campaigns: {str(e)}")
        return jsonify({'error': str(e)}), 500

@meta_api_bp.route('/adsets', methods=['GET'])
def api_get_adsets():
    """API endpoint to get adsets for a specific campaign."""
    account_id = request.args.get('account_id')
    campaign_id = request.args.get('campaign_id')
    
    if not account_id:
        return jsonify({'error': 'Account ID is required'}), 400
    
    if not campaign_id:
        return jsonify({'error': 'Campaign ID is required'}), 400
    
    try:
        adsets = meta_service.get_adsets(account_id=account_id, campaign_id=campaign_id)
        return jsonify({'adsets': adsets})
    except Exception as e:
        logging.error(f"Error fetching Meta adsets: {str(e)}")
        return jsonify({'error': str(e)}), 500 