from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.api import FacebookAdsApi
import os
from datetime import datetime, timedelta
import json
import meta_account_config
import uuid

def initialize_api(account_id=None):
    """Initialize the Facebook Ads API with the specified account ID"""
    access_token = 'EAAVXHEPqlZBwBOwpkDKsBZBZAGlKQsG9JQPueoPi6Um3ZAwet2vonHQHOS7ULyZABuFXZCkPOcvZCNDerbVQrOIg8hA0KC6KmLkraSiqn7iEXkWZCZAueSNLXLY8eXaujRMWC9jvSgMo9p6PkTVZB8ZAMZBSjElXoLqsUZB3mwVYQZAAqD3Tjaz0cMmRdubxjOw4qE3gfZBYHTKuZAuQ'
    app_id = '1503153793701868'
    app_secret = '7e016e3d7f40a4af606e36832e41a1cf'
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    
    # Use the provided account ID or default to the test account
    if account_id:
        return AdAccount(f'act_{account_id}')
    else:
        return AdAccount('act_599607976078688')

def create_campaign(ad_account, campaign_name="OKX AOS App Promotion"):
    campaign = ad_account.create_campaign(
        params={
            'name': campaign_name,
            'objective': 'OUTCOME_APP_PROMOTION',
            'status': 'PAUSED',
            'special_ad_categories': []
        }
    )
    print(f"Campaign created successfully. ID: {campaign['id']}")
    return campaign['id']

def create_adset(ad_account, campaign_id, adset_name="App Install Ad Set", budget=50000, country=None):
    """
    Create a Facebook ad set for app installs
    
    Args:
        ad_account: The Facebook ad account
        campaign_id: The campaign ID
        adset_name: The name of the ad set
        budget: The daily budget in cents (e.g., 50000 = $500.00)
        country: The country code for targeting (e.g., 'US')
        
    Returns:
        The ad set ID
    """
    # Set start and end dates
    start_time = datetime.now()
    end_time = start_time + timedelta(days=30)  # Run for 30 days
    
    # Get account ID from the ad_account object
    account_id = ad_account.get_id_assured().replace('act_', '')
    
    # Try to get account details from config
    try:
        account_details = meta_account_config.get_account_details(account_id)
        print(f"Found account details for account ID {account_id}: {account_details}")
        
        # Get application ID and object store URL from account config
        application_id = account_details.get('application_id_android') if account_details else '1234567890'
        object_store_url = account_details.get('object_store_url_android') if account_details else 'https://play.google.com/store/apps/details?id=com.okx.android'
    except (ImportError, AttributeError):
        account_details = None
        print(f"Could not get account details for account ID {account_id}")
        application_id = '1234567890'  # Default app ID
        object_store_url = 'https://play.google.com/store/apps/details?id=com.okx.android'  # Default store URL
    
    # Use the provided country or default to US
    countries = [country] if country else ['US']
    
    adset = ad_account.create_ad_set(
        params={
            'name': adset_name,
            'campaign_id': campaign_id,
            'billing_event': 'IMPRESSIONS',
            'optimization_goal': 'APP_INSTALLS',
            'bid_strategy': 'LOWEST_COST_WITHOUT_CAP',
            'daily_budget': budget,  # Budget in cents
            'targeting': {
                'geo_locations': {
                    'countries': countries,
                    'location_types': ['home', 'recent']
                },
                'publisher_platforms': ['facebook', 'instagram', 'audience_network'],
                'facebook_positions': ['feed', 'instant_article', 'marketplace', 'video_feeds'],
                'instagram_positions': ['stream', 'explore'],
                'device_platforms': ['mobile'],
                'user_os': ['android']
            },
            'status': 'PAUSED',
            'promoted_object': {
                'application_id': application_id,
                'object_store_url': object_store_url
            }
        }
    )
    print(f"Ad Set created successfully. ID: {adset['id']}")
    return adset['id']

def upload_image(ad_account, image_path):
    image = AdImage(parent_id=ad_account.get_id_assured())
    image[AdImage.Field.filename] = image_path
    image.remote_create()
    # After remote_create(), the image object should have the hash attribute
    print(f"Image uploaded successfully. Hash: {image.get('hash')}")
    return image.get('hash')

def create_ad(ad_account, adset_id, image_hash, ad_name="Android App Install Ad"):
    """
    Create a Facebook ad for app installs using Flexible Ad Format
    
    Args:
        ad_account: The Facebook ad account
        adset_id: The ad set ID
        image_hash: The image hash or a list of image hashes
        ad_name: The name of the ad
        
    Returns:
        The ad ID
    """
    # Get account ID from the ad_account object
    account_id = ad_account.get_id_assured().replace('act_', '')
    
    # Try to get account details from config
    try:
        account_details = meta_account_config.get_account_details(account_id)
        print(f"Found account details for account ID {account_id}: {account_details}")
        
        # Get application ID and object store URL from account config
        application_id = account_details.get('application_id_android') if account_details else '1234567890'
        object_store_url = account_details.get('object_store_url_android') if account_details else 'https://play.google.com/store/apps/details?id=com.okx.android'
    except (ImportError, AttributeError):
        account_details = None
        print(f"Could not get account details for account ID {account_id}")
        application_id = '1234567890'  # Default app ID
        object_store_url = 'https://play.google.com/store/apps/details?id=com.okx.android'  # Default store URL
    
    print(f"Creating ad with adset_id: {adset_id}")
    
    # Convert single image hash to list if needed
    image_hashes = image_hash if isinstance(image_hash, list) else [image_hash]
    
    # Generate a unique group UUID for the asset group
    group_uuid = str(uuid.uuid4())
    
    # First, create a basic creative with the first image
    base_creative = ad_account.create_ad_creative(
        params={
            'name': f'Base Creative for {ad_name}',
            'object_story_spec': {
                'page_id': '107128152374091',
                'link_data': {
                    'image_hash': image_hashes[0],  # Use the first image for the base creative
                    'link': object_store_url,
                    'message': 'Download the OKX app - The most trusted crypto trading platform',
                    'call_to_action': {
                        'type': 'INSTALL_MOBILE_APP',
                        'value': {
                            'link': object_store_url,
                            'application': application_id
                        }
                    }
                }
            }
        }
    )
    
    # Get the creative ID safely
    base_creative_id = base_creative.get('id') if hasattr(base_creative, 'get') else base_creative['id']
    print(f"Base creative created successfully. ID: {base_creative_id}")

    # Create the ad with the base creative
    ad = ad_account.create_ad(
        params={
            'name': ad_name,
            'adset_id': adset_id,
            'creative': {'creative_id': base_creative_id},
            'status': 'PAUSED'
        }
    )
    
    # Get the ad ID safely
    ad_id = ad.get('id') if hasattr(ad, 'get') else ad['id']
    print(f"Ad created successfully. ID: {ad_id}")
    
    # Now update the ad with the creative asset groups spec
    # This is the key step for enabling Flexible Ad Format
    ad_update_params = {
        'creative_asset_groups_spec': {
            'groups': [
                {
                    'group_uuid': group_uuid,
                    'images': [{'hash': img_hash} for img_hash in image_hashes],
                    'texts': [
                        {
                            'text': 'Download the OKX app - The most trusted crypto trading platform',
                            'text_type': 'primary_text'
                        }
                    ],
                    'call_to_action': {
                        'type': 'INSTALL_MOBILE_APP',
                        'value': {
                            'link': object_store_url,
                            'application': application_id
                        }
                    }
                }
            ]
        }
    }
    
    # Log the update parameters for debugging
    print(f"Updating ad with parameters: {json.dumps(ad_update_params, indent=2)}")
    
    # Update the ad with the creative asset groups spec
    try:
        ad_obj = Ad(ad_id)
        update_result = ad_obj.api_update(fields=[], params=ad_update_params)
        print(f"Ad updated with creative asset groups spec. ID: {ad_id}")
        print(f"Update result: {update_result}")
    except Exception as e:
        print(f"Error updating ad with creative asset groups spec: {str(e)}")
        # Continue anyway, as the ad was created successfully
    
    return ad_id

def main(account_id=None):
    # Initialize the API
    ad_account = initialize_api(account_id)
    
    try:
        # Create campaign
        campaign_id = create_campaign(ad_account)
        print(f"Campaign created with ID: {campaign_id}")
        
        # Create ad set
        adset_id = create_adset(ad_account, campaign_id)
        print(f"Ad Set created with ID: {adset_id}")
        
        # Upload image
        image_path = "/Users/jackyrusli/Downloads/sample.jpeg"  # Replace with actual path
        image_hash = upload_image(ad_account, image_path)
        print(f"Image uploaded with hash: {image_hash}")
        
        # Create ad
        ad_id = create_ad(ad_account, adset_id, image_hash)
        print(f"Ad created with ID: {ad_id}")
        
        return {
            'success': True,
            'campaign_id': campaign_id,
            'adset_id': adset_id,
            'ad_id': ad_id
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    main() 