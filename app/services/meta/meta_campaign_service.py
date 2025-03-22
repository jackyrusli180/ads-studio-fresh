"""
Meta Campaign Service
Handles management of Meta campaigns and ad sets
"""
import logging
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.business import Business
from facebook_business.adobjects.adsinsights import AdsInsights

class MetaCampaignService:
    """Service for managing Meta campaigns and ad sets"""
    
    def __init__(self, api, ad_account_id, business_id=None):
        """Initialize the campaign service
        
        Args:
            api: Initialized FacebookAdsApi instance
            ad_account_id: Meta ad account ID
            business_id: Optional Meta business ID
        """
        self.api = api
        self.ad_account_id = ad_account_id
        self.business_id = business_id
    
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
    
    def create_adset(self, account_id=None, adset_data=None):
        """
        Create a new ad set in a campaign
        
        Args:
            account_id: Optional account ID, uses default if not provided
            adset_data: Dictionary containing ad set details including:
                - name: Ad set name
                - campaign_id: ID of the campaign this ad set belongs to
                - optimization_goal: Optimization goal (e.g., 'REACH', 'LINK_CLICKS')
                - billing_event: Billing event (e.g., 'IMPRESSIONS', 'LINK_CLICKS')
                - bid_amount: Bid amount in cents
                - targeting: Targeting specification dictionary
                - start_time: Start time for the ad set
                - end_time: Optional end time for the ad set
                
        Returns:
            Created ad set object
        """
        try:
            account = self.get_ad_account(account_id)
            
            if not adset_data:
                raise ValueError("Ad set data is required")
            
            if 'campaign_id' not in adset_data:
                raise ValueError("Campaign ID is required to create an ad set")
            
            # Normalize and validate campaign ID
            campaign_id = str(adset_data['campaign_id']).strip()
            if not campaign_id:
                raise ValueError("Campaign ID cannot be empty")
                
            # Check if campaign exists to provide better error messages
            try:
                # Try to get the campaign to validate its existence
                Campaign(campaign_id).api_get(fields=['id', 'name'])
                logging.info(f"Successfully validated campaign ID: {campaign_id}")
            except Exception as e:
                logging.error(f"Invalid campaign ID ({campaign_id}): {str(e)}")
                raise ValueError(f"Invalid or inaccessible campaign ID: {campaign_id}. Error: {str(e)}")
            
            # Build the basic parameters
            params = {
                'name': adset_data.get('name', 'New Ad Set'),
                'campaign_id': campaign_id,
                'optimization_goal': adset_data.get('optimization_goal', 'REACH'),
                'billing_event': adset_data.get('billing_event', 'IMPRESSIONS'),
                'bid_amount': adset_data.get('bid_amount', 1000),  # Default 10 USD in cents
                'status': adset_data.get('status', 'PAUSED'),
            }
            
            # Add budget parameters
            if 'daily_budget' in adset_data:
                params['daily_budget'] = adset_data['daily_budget']
            elif 'lifetime_budget' in adset_data:
                params['lifetime_budget'] = adset_data['lifetime_budget']
            else:
                # Default budget (in cents)
                params['daily_budget'] = 1000  # $10.00
            
            # Add targeting parameters if provided
            if 'targeting' in adset_data:
                params['targeting'] = adset_data['targeting']
            else:
                # Default targeting (adults in US)
                params['targeting'] = {
                    'age_min': 18,
                    'age_max': 65,
                    'geo_locations': {
                        'countries': ['US'],
                    }
                }
            
            # Add time parameters
            if 'start_time' in adset_data:
                params['start_time'] = adset_data['start_time']
            
            if 'end_time' in adset_data:
                params['end_time'] = adset_data['end_time']
            
            # Create the ad set
            adset = account.create_ad_set(
                fields=[],
                params=params
            )
            
            return adset
        except Exception as e:
            logging.error(f"Error creating Meta ad set: {str(e)}")
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