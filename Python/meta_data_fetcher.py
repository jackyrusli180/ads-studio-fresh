from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.api import FacebookAdsApi
import logging

def initialize_api():
    """Initialize Meta/Facebook Ads API"""
    access_token = 'EAAMYbrqFpAsBO9UyhPMlMZCd97rrxEgDHA6YsGhusX0GBiFI0FmZAiY4ZBeVWGzv5UZA1xQ04ByRSrzkNtmUKamgZBQV8ZCUtAAQqkv8t2vWBaPx6T4Pl0sh88apHl9E1JFJ5ZC3nIcAS8CDiVpikANZATwK05CZBTZBd6XaFp6g5YuO1ZAxvcGvVq9codhA7l8wePzJzuIuPQe'
    app_id = '871288784921611'
    app_secret = '9f8a7b32623f6a6624051cef37988a75'
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    return AdAccount('act_599607976078688')

def get_campaigns():
    """Fetch all campaigns from the ad account"""
    try:
        ad_account = initialize_api()
        
        # Get campaigns with relevant fields
        campaigns = ad_account.get_campaigns(fields=[
            'id',
            'name',
            'objective',
            'status',
            'created_time',
            'start_time',
            'stop_time',
            'daily_budget',
            'lifetime_budget'
        ])
        
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
                'lifetime_budget': campaign.get('lifetime_budget')
            })
            
        return campaign_list
        
    except Exception as e:
        logging.error(f"Error fetching Meta campaigns: {str(e)}")
        return []

def get_adsets(campaign_id):
    """Fetch all ad sets for a specific campaign"""
    try:
        ad_account = initialize_api()
        
        # Get ad sets with relevant fields
        adsets = ad_account.get_ad_sets(fields=[
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
        ], params={
            'campaign_id': campaign_id
        })
        
        # Format ad set data
        adset_list = []
        for adset in adsets:
            adset_list.append({
                'id': adset['id'],
                'name': adset['name'],
                'campaign_id': adset.get('campaign_id'),
                'status': adset.get('status'),
                'targeting': adset.get('targeting'),
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