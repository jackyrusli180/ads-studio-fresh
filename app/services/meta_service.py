"""
Meta Advertising Service
Handles interactions with the Meta Business SDK
"""
import logging
import os
import sys
from typing import Dict, List, Any, Optional, Union

# Add the Meta SDK to the Python path
meta_sdk_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'lib', 'meta-sdk'))
if meta_sdk_path not in sys.path:
    sys.path.insert(0, meta_sdk_path)

# Import from the local SDK
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.adsinsights import AdsInsights
from facebook_business.adobjects.business import Business
from facebook_business.api import FacebookAdsApi
from facebook_business.session import FacebookSession

# Import centralized configuration
from app.config import credentials

class MetaService:
    """Service for interacting with Meta Advertising APIs"""
    
    def __init__(self, app_id: Optional[str] = None, app_secret: Optional[str] = None, 
                 access_token: Optional[str] = None, ad_account_id: Optional[str] = None):
        """Initialize the Meta service with API credentials"""
        self.app_id = app_id or credentials.META_APP_ID
        self.app_secret = app_secret or credentials.META_APP_SECRET
        self.access_token = access_token or credentials.META_ACCESS_TOKEN
        self.business_id = credentials.META_BUSINESS_ID
        self.ad_account_id = ad_account_id or credentials.META_AD_ACCOUNT_ID
        
        # Initialize the API
        self.api = self.initialize_api()
    
    def initialize_api(self):
        """Initialize the Meta Business API with credentials"""
        try:
            session = FacebookSession(
                app_id=self.app_id,
                app_secret=self.app_secret,
                access_token=self.access_token
            )
            
            api = FacebookAdsApi(session)
            FacebookAdsApi.set_default_api(api)
            
            return api
        except Exception as e:
            logging.error(f"Error initializing Meta API: {str(e)}")
            raise
    
    def get_ad_account(self, account_id=None):
        """Get an ad account object"""
        account_id = account_id or self.ad_account_id
        if not account_id.startswith('act_'):
            account_id = f'act_{account_id}'
        return AdAccount(account_id)
    
    def get_ad_accounts(self):
        """Get all ad accounts accessible to the user"""
        try:
            if self.business_id:
                business = Business(fbid=self.business_id)
                accounts = business.get_owned_ad_accounts(fields=[
                    'name', 
                    'account_id', 
                    'account_status',
                    'amount_spent',
                    'balance',
                    'currency',
                    'business_name'
                ])
                return accounts
            else:
                # If no business ID, get the single ad account
                account = self.get_ad_account()
                account_data = account.api_get(fields=[
                    'name', 
                    'account_id', 
                    'account_status',
                    'amount_spent',
                    'balance',
                    'currency',
                    'business_name'
                ])
                return [account_data]
        except Exception as e:
            logging.error(f"Error fetching Meta ad accounts: {str(e)}")
            return []
    
    def get_campaigns(self, account_id=None, format_data=True):
        """
        Get campaigns for a specific ad account
        
        Args:
            account_id: Optional account ID, uses default if not provided
            format_data: If True, returns formatted dictionaries; if False, returns raw API objects
            
        Returns:
            List of campaign data
        """
        try:
            ad_account = self.get_ad_account(account_id)
            
            # Get campaigns with relevant fields
            fields = [
                'id',
                'name',
                'objective',
                'status',
                'created_time',
                'start_time',
                'stop_time',
                'daily_budget',
                'lifetime_budget',
                'budget_remaining',
                'buying_type',
                'bid_strategy'
            ]
            
            campaigns = ad_account.get_campaigns(fields=fields)
            
            # Return raw API objects if format_data is False
            if not format_data:
                return campaigns
            
            # Format campaign data
            campaign_list = []
            for campaign in campaigns:
                campaign_list.append({
                    'id': campaign['id'],
                    'name': campaign['name'],
                    'objective': campaign.get('objective'),
                    'status': campaign.get('status'),
                    'created_time': campaign.get('created_time'),
                    'start_time': campaign.get('start_time'),
                    'stop_time': campaign.get('stop_time'),
                    'daily_budget': campaign.get('daily_budget'),
                    'lifetime_budget': campaign.get('lifetime_budget'),
                    'budget_remaining': campaign.get('budget_remaining'),
                    'buying_type': campaign.get('buying_type'),
                    'bid_strategy': campaign.get('bid_strategy')
                })
                
            return campaign_list
            
        except Exception as e:
            logging.error(f"Error fetching Meta campaigns: {str(e)}")
            return []
    
    def get_adsets(self, account_id=None, campaign_id=None, format_data=True):
        """
        Fetch ad sets from the ad account, optionally filtered by campaign
        
        Args:
            account_id: Optional account ID, uses default if not provided
            campaign_id: Optional campaign ID to filter ad sets
            format_data: If True, returns formatted dictionaries; if False, returns raw API objects
            
        Returns:
            List of ad set data
        """
        try:
            ad_account = self.get_ad_account(account_id)
            
            # Prepare params
            params = {}
            if campaign_id:
                params['campaign_id'] = campaign_id
            
            # Get ad sets with relevant fields
            fields = [
                'id',
                'name',
                'campaign_id',
                'status',
                'targeting',
                'billing_event',
                'optimization_goal',
                'bid_strategy',
                'budget_remaining',
                'daily_budget',
                'lifetime_budget',
                'start_time',
                'end_time'
            ]
            
            adsets = ad_account.get_ad_sets(fields=fields, params=params)
            
            # Return raw API objects if format_data is False
            if not format_data:
                return adsets
            
            # Format ad set data
            adset_list = []
            for adset in adsets:
                # Process targeting data to make it JSON serializable
                targeting = None
                if adset.get('targeting'):
                    targeting_obj = adset.get('targeting')
                    targeting = {
                        'age_min': targeting_obj.get('age_min'),
                        'age_max': targeting_obj.get('age_max'),
                        'genders': targeting_obj.get('genders'),
                    }
                    
                    # Process geo_locations if available
                    if 'geo_locations' in targeting_obj:
                        geo = targeting_obj.get('geo_locations', {})
                        targeting['geo_locations'] = {
                            'countries': geo.get('countries', []),
                            'regions': [{'name': r.get('name', ''), 'key': r.get('key', '')} 
                                       for r in geo.get('regions', []) if isinstance(r, dict)],
                            'cities': [{'name': c.get('name', ''), 'key': c.get('key', '')} 
                                      for c in geo.get('cities', []) if isinstance(c, dict)]
                        }
                    else:
                        targeting['geo_locations'] = {'summary': 'Specified locations'}
                    
                    # Process interests if available
                    if 'flexible_spec' in targeting_obj:
                        interests_data = []
                        for flex_spec in targeting_obj.get('flexible_spec', []):
                            if 'interests' in flex_spec:
                                for interest in flex_spec.get('interests', []):
                                    if isinstance(interest, dict):
                                        interests_data.append({
                                            'id': interest.get('id'),
                                            'name': interest.get('name')
                                        })
                        targeting['interests'] = interests_data if interests_data else ['Specified interests']
                    else:
                        targeting['interests'] = ['Specified interests']
                
                adset_list.append({
                    'id': adset['id'],
                    'name': adset['name'],
                    'campaign_id': adset.get('campaign_id'),
                    'status': adset.get('status'),
                    'targeting': targeting,  # Using our serializable targeting data
                    'billing_event': adset.get('billing_event'),
                    'optimization_goal': adset.get('optimization_goal'),
                    'bid_strategy': adset.get('bid_strategy'),
                    'budget_remaining': adset.get('budget_remaining'),
                    'daily_budget': adset.get('daily_budget'),
                    'lifetime_budget': adset.get('lifetime_budget'),
                    'start_time': adset.get('start_time'),
                    'end_time': adset.get('end_time')
                })
                
            return adset_list
            
        except Exception as e:
            logging.error(f"Error fetching Meta ad sets: {str(e)}")
            return []
    
    def create_campaign(self, account_id=None, campaign_data=None):
        """
        Create a new campaign
        
        Args:
            account_id: Optional account ID, uses default if not provided
            campaign_data: Dictionary containing campaign details
            
        Returns:
            Created campaign object
        """
        try:
            account = self.get_ad_account(account_id)
            
            if not campaign_data:
                campaign_data = {}
            
            params = {
                'name': campaign_data.get('name', 'New Campaign'),
                'objective': campaign_data.get('objective', 'OUTCOME_AWARENESS'),
                'status': campaign_data.get('status', 'PAUSED'),
                'special_ad_categories': [],
            }
            
            if 'daily_budget' in campaign_data:
                params['daily_budget'] = campaign_data['daily_budget']
            elif 'lifetime_budget' in campaign_data:
                params['lifetime_budget'] = campaign_data['lifetime_budget']
            
            campaign = account.create_campaign(
                fields=[],
                params=params
            )
            
            return campaign
        except Exception as e:
            logging.error(f"Error creating Meta campaign: {str(e)}")
            raise
    
    def get_campaign_insights(self, campaign_id, format_data=True):
        """
        Get performance insights for a campaign
        
        Args:
            campaign_id: ID of the campaign to get insights for
            format_data: If True, returns formatted dictionaries; if False, returns raw API objects
            
        Returns:
            List of insight data
        """
        try:
            campaign = Campaign(campaign_id)
            fields = [
                'impressions',
                'clicks',
                'spend',
                'cpc',
                'ctr',
                'reach',
                'frequency',
                'cost_per_inline_link_click',
                'cost_per_inline_post_engagement',
                'cost_per_unique_click',
                'unique_clicks',
                'unique_ctr'
            ]
            
            insights = campaign.get_insights(fields=fields)
            
            # Return raw API objects if format_data is False
            if not format_data:
                return insights
            
            # Format insights data
            insights_list = []
            for insight in insights:
                insights_list.append({
                    'impressions': insight.get('impressions'),
                    'clicks': insight.get('clicks'),
                    'spend': insight.get('spend'),
                    'cpc': insight.get('cpc'),
                    'ctr': insight.get('ctr'),
                    'reach': insight.get('reach'),
                    'frequency': insight.get('frequency'),
                    'cost_per_inline_link_click': insight.get('cost_per_inline_link_click'),
                    'cost_per_inline_post_engagement': insight.get('cost_per_inline_post_engagement'),
                    'cost_per_unique_click': insight.get('cost_per_unique_click'),
                    'unique_clicks': insight.get('unique_clicks'),
                    'unique_ctr': insight.get('unique_ctr')
                })
                
            return insights_list
            
        except Exception as e:
            logging.error(f"Error fetching Meta campaign insights: {str(e)}")
            return []
            
    def create_ad(self, ad_data):
        """
        Create a new ad in Meta Ads
        
        Args:
            ad_data: Dictionary containing ad details including:
                - name: Ad name
                - adset_id: ID of the AdSet to place the ad in
                - creative_type: 'IMAGE' or 'VIDEO'
                - assets: List of asset objects with 'url', 'type', etc.
                
        Returns:
            String ID of the created ad
        """
        try:
            logging.info(f"Creating Meta ad with data: {ad_data}")
            
            # Get the ad account
            ad_account = self.get_ad_account()
            
            # Create a creative first
            creative_params = {
                'name': f"Creative for {ad_data.get('name', 'New Ad')}",
            }
            
            # Check if we have image or video assets
            assets = ad_data.get('assets', [])
            
            if not assets:
                raise ValueError("No assets provided for ad creation")
            
            # Filter assets by type
            image_assets = [a for a in assets if a.get('type') == 'image']
            video_assets = [a for a in assets if a.get('type') == 'video']
            
            if image_assets:
                # Use the first image asset
                image_url = image_assets[0].get('url')
                if not image_url:
                    raise ValueError("Image asset missing URL")
                
                # Create image hash if needed
                creative_params['object_story_spec'] = {
                    'page_id': self.business_id,
                    'link_data': {
                        'image_url': image_url,
                        'link': 'https://www.facebook.com',  # Default link
                        'message': ad_data.get('headline', 'Check this out!')
                    }
                }
            elif video_assets:
                # Use the first video asset
                video_url = video_assets[0].get('url')
                if not video_url:
                    raise ValueError("Video asset missing URL")
                
                # Upload video and get video ID
                video_id = self._upload_video(video_url, f"Video for {ad_data.get('name', 'New Ad')}")
                
                creative_params['object_story_spec'] = {
                    'page_id': self.business_id,
                    'video_data': {
                        'video_id': video_id,
                        'title': ad_data.get('headline', 'Check this out!'),
                        'message': ad_data.get('message', 'Check out our video!')
                    }
                }
            else:
                raise ValueError("No valid image or video assets provided")
                
            # Create the creative
            creative = ad_account.create_ad_creative(
                params=creative_params
            )
            
            logging.info(f"Created Meta creative with ID: {creative['id']}")
            
            # Now create the ad using the creative
            ad_params = {
                'name': ad_data.get('name', 'New Ad'),
                'adset_id': ad_data.get('adset_id'),
                'creative': {'creative_id': creative['id']},
                'status': 'PAUSED'  # Start as paused for safety
            }
            
            ad = ad_account.create_ad(
                params=ad_params
            )
            
            logging.info(f"Created Meta ad with ID: {ad['id']}")
            
            return ad['id']
            
        except Exception as e:
            logging.error(f"Error creating Meta ad: {str(e)}")
            raise
            
    def _upload_video(self, video_url, name):
        """
        Upload a video to Meta Ads
        
        Args:
            video_url: URL of the video to upload
            name: Name for the video
            
        Returns:
            Video ID string
        """
        try:
            import tempfile
            import requests
            import os
            from facebook_business.video_uploader import VideoUploader
            
            # Download the video to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                response = requests.get(video_url, stream=True)
                response.raise_for_status()
                
                for chunk in response.iter_content(chunk_size=8192):
                    temp_file.write(chunk)
                    
                temp_file_path = temp_file.name
            
            try:
                # Get the ad account
                ad_account = self.get_ad_account()
                
                # Upload the video
                params = {
                    'name': name
                }
                
                video = VideoUploader(
                    session=self.api,
                    page_id=self.business_id,
                    filepath=temp_file_path,
                    params=params
                ).start()
                
                # Clean up the temporary file
                os.unlink(temp_file_path)
                
                return video['id']
                
            except Exception as e:
                # Clean up in case of error
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                raise
                
        except Exception as e:
            logging.error(f"Error uploading video to Meta: {str(e)}")
            raise 