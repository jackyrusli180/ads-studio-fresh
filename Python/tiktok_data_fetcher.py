import business_api_client
from business_api_client.rest import ApiException
import logging

def initialize_api():
    """Initialize TikTok Ads API"""
    access_token = 'b8586d78d2a3d2ae1b542c1e8c99c0e3c82bdaaf'
    advertiser_id = '7463377308125036561'
    
    # Initialize the API configuration
    configuration = business_api_client.Configuration()
    configuration.access_token = access_token
    configuration.host = "https://business-api.tiktok.com"
    
    # Create API client
    api_client = business_api_client.ApiClient(configuration)
    
    return api_client, advertiser_id

def get_campaigns():
    """Fetch all campaigns from the advertiser account"""
    try:
        api_client, advertiser_id = initialize_api()
        
        # Create campaign API instance
        api_instance = business_api_client.CampaignCreationApi(api_client)
        
        # Get campaigns
        response = api_instance.campaign_get(
            advertiser_id=advertiser_id,
            fields=[
                "campaign_id",
                "campaign_name",
                "objective_type",
                "budget",
                "budget_mode",
                "status",
                "operation_status",
                "create_time",
                "modify_time"
            ]
        )
        
        if response.get('code') == 0 and response.get('data'):
            campaign_list = []
            for campaign in response['data'].get('list', []):
                campaign_list.append({
                    'id': campaign.get('campaign_id'),
                    'name': campaign.get('campaign_name'),
                    'objective': campaign.get('objective_type'),
                    'budget': campaign.get('budget'),
                    'budget_mode': campaign.get('budget_mode'),
                    'status': campaign.get('status'),
                    'operation_status': campaign.get('operation_status'),
                    'create_time': campaign.get('create_time'),
                    'modify_time': campaign.get('modify_time')
                })
            return campaign_list
        return []
        
    except Exception as e:
        logging.error(f"Error fetching TikTok campaigns: {str(e)}")
        return []

def get_adgroups(campaign_id):
    """Fetch all ad groups (ad sets) for a specific campaign"""
    try:
        api_client, advertiser_id = initialize_api()
        
        # Create ad group API instance
        api_instance = business_api_client.AdgroupApi(api_client)
        
        # Get ad groups
        response = api_instance.adgroup_get(
            advertiser_id=advertiser_id,
            campaign_ids=[campaign_id],
            fields=[
                "adgroup_id",
                "adgroup_name",
                "campaign_id",
                "status",
                "operation_status",
                "optimization_goal",
                "budget",
                "budget_mode",
                "schedule_type",
                "schedule_start_time",
                "schedule_end_time",
                "billing_event",
                "bid_type",
                "bid",
                "create_time",
                "modify_time"
            ]
        )
        
        if response.get('code') == 0 and response.get('data'):
            adgroup_list = []
            for adgroup in response['data'].get('list', []):
                adgroup_list.append({
                    'id': adgroup.get('adgroup_id'),
                    'name': adgroup.get('adgroup_name'),
                    'campaign_id': adgroup.get('campaign_id'),
                    'status': adgroup.get('status'),
                    'operation_status': adgroup.get('operation_status'),
                    'optimization_goal': adgroup.get('optimization_goal'),
                    'budget': adgroup.get('budget'),
                    'budget_mode': adgroup.get('budget_mode'),
                    'schedule_type': adgroup.get('schedule_type'),
                    'schedule_start_time': adgroup.get('schedule_start_time'),
                    'schedule_end_time': adgroup.get('schedule_end_time'),
                    'billing_event': adgroup.get('billing_event'),
                    'bid_type': adgroup.get('bid_type'),
                    'bid': adgroup.get('bid'),
                    'create_time': adgroup.get('create_time'),
                    'modify_time': adgroup.get('modify_time')
                })
            return adgroup_list
        return []
        
    except Exception as e:
        logging.error(f"Error fetching TikTok ad groups: {str(e)}")
        return [] 