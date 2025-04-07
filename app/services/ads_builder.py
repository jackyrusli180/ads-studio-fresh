"""
Campaign Builder Service

This module handles the creation and management of ad campaigns across different platforms.
"""
import os
import json
import logging
from datetime import datetime
import uuid

from app.config import project_root, get_meta_account, get_tiktok_account

class CampaignBuilder:
    def __init__(self):
        self.media_library_path = os.path.join(project_root, 'app', 'static', 'media_library.json')
    
    def get_selected_assets(self, asset_ids):
        """Get selected assets from the media library"""
        try:
            with open(self.media_library_path, 'r') as f:
                all_assets = json.load(f)
            
            # Filter for selected assets
            selected_assets = [asset for asset in all_assets if asset.get('id') in asset_ids]
            return selected_assets
        except (FileNotFoundError, json.JSONDecodeError):
            logging.error(f"Error loading media library from {self.media_library_path}")
            return []
    
    def create_meta_campaign(self, campaign_data, assets):
        """Create a campaign on Meta/Facebook Ads platform"""
        try:
            # Get account details
            account_id = campaign_data.get('meta_account_id')
            account = get_meta_account(account_id)
            
            if not account:
                return {'success': False, 'error': f'Meta account not found: {account_id}'}
            
            # Build campaign structure
            campaign = {
                'id': str(uuid.uuid4()),
                'name': campaign_data.get('campaign_name'),
                'objective': campaign_data.get('objective'),
                'status': 'PAUSED',  # Start as paused
                'platform': 'meta',
                'account_id': account_id,
                'budget_type': campaign_data.get('budget_type', 'daily'),
                'budget_amount': campaign_data.get('budget_amount'),
                'created_at': datetime.now().isoformat(),
                'assets': [asset.get('id') for asset in assets],
                'targeting': {
                    'countries': campaign_data.get('countries', []),
                    'age_min': campaign_data.get('age_min', 18),
                    'age_max': campaign_data.get('age_max', 65),
                    'genders': campaign_data.get('genders', [0]),  # 0 = all, 1 = male, 2 = female
                    'interests': campaign_data.get('interests', [])
                }
            }
            
            # In a real implementation, this would call the Meta Ads API
            # For now, we'll just return the campaign object
            return {'success': True, 'campaign': campaign}
            
        except Exception as e:
            logging.error(f"Error creating Meta campaign: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def create_tiktok_campaign(self, campaign_data, assets):
        """Create a campaign on TikTok Ads platform"""
        try:
            # Get account details
            advertiser_id = campaign_data.get('tiktok_account_id')
            account = get_tiktok_account(advertiser_id)
            
            if not account:
                return {'success': False, 'error': f'TikTok account not found: {advertiser_id}'}
            
            # Build campaign structure
            campaign = {
                'id': str(uuid.uuid4()),
                'name': campaign_data.get('campaign_name'),
                'objective': campaign_data.get('objective'),
                'status': 'PAUSED',  # Start as paused
                'platform': 'tiktok',
                'advertiser_id': advertiser_id,
                'budget_type': campaign_data.get('budget_type', 'DAILY'),
                'budget_amount': campaign_data.get('budget_amount'),
                'created_at': datetime.now().isoformat(),
                'assets': [asset.get('id') for asset in assets],
                'targeting': {
                    'countries': campaign_data.get('countries', []),
                    'age_range': campaign_data.get('age_range', ['AGE_25_34', 'AGE_35_44']),
                    'genders': campaign_data.get('genders', ['GENDER_MALE', 'GENDER_FEMALE']),
                    'interests': campaign_data.get('interests', [])
                }
            }
            
            # In a real implementation, this would call the TikTok Ads API
            # For now, we'll just return the campaign object
            return {'success': True, 'campaign': campaign}
            
        except Exception as e:
            logging.error(f"Error creating TikTok campaign: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def create_campaign(self, campaign_data, asset_ids):
        """Create a campaign on the specified platform(s)"""
        # Get selected assets
        assets = self.get_selected_assets(asset_ids)
        
        if not assets:
            return {'success': False, 'error': 'No valid assets selected'}
        
        results = {}
        
        # Create Meta campaign if selected
        if campaign_data.get('platforms', {}).get('meta'):
            meta_result = self.create_meta_campaign(campaign_data, assets)
            results['meta'] = meta_result
        
        # Create TikTok campaign if selected
        if campaign_data.get('platforms', {}).get('tiktok'):
            tiktok_result = self.create_tiktok_campaign(campaign_data, assets)
            results['tiktok'] = tiktok_result
        
        # Check if any campaigns were created successfully
        success = any(result.get('success', False) for result in results.values())
        
        return {
            'success': success,
            'results': results,
            'message': 'Campaign creation completed' if success else 'Failed to create campaigns'
        } 