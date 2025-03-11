from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.ad import Ad
from facebook_business.api import FacebookAdsApi
import os
from facebook_business.adobjects.campaign import Campaign
from facebook_business.exceptions import FacebookRequestError
from datetime import datetime

def initialize_api():
    access_token = 'EAAMYbrqFpAsBO9UyhPMlMZCd97rrxEgDHA6YsGhusX0GBiFI0FmZAiY4ZBeVWGzv5UZA1xQ04ByRSrzkNtmUKamgZBQV8ZCUtAAQqkv8t2vWBaPx6T4Pl0sh88apHl9E1JFJ5ZC3nIcAS8CDiVpikANZATwK05CZBTZBd6XaFp6g5YuO1ZAxvcGvVq9codhA7l8wePzJzuIuPQe'
    app_id = '871288784921611'
    app_secret = '9f8a7b32623f6a6624051cef37988a75'
    
    FacebookAdsApi.init(app_id, app_secret, access_token)
    return AdAccount('act_599607976078688')

def upload_image(ad_account, image_path):
    image = AdImage(parent_id=ad_account.get_id_assured())
    image[AdImage.Field.filename] = image_path
    
    image.remote_create()
    return image

def create_ad(ad_account, adset_id, image_hash, ad_name="My Auto Created Ad"):
    print(f"Creating ad with adset_id: {adset_id}")
    creative = ad_account.create_ad_creative(
        params={
            'name': f'Creative for {ad_name}',
            'object_story_spec': {
                'page_id': '107128152374091',
                'link_data': {
                    'image_hash': image_hash,
                    'link': 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
                    'message': 'Trade Bitcoin, crypto & more with OKX - The most trusted crypto trading app',
                    'call_to_action': {
                        'type': 'INSTALL_MOBILE_APP',
                        'value': {
                            'link': 'https://play.google.com/store/apps/details?id=com.okinc.okex.gp',
                            'application': '2045001539014194'
                        }
                    }
                }
            },
            'degrees_of_freedom_spec': {
                'creative_features_spec': {
                    'standard_enhancements': {
                        'enroll_status': 'OPT_OUT'
                    }
                }
            }
        }
    )

    ad = ad_account.create_ad(
        params={
            'name': ad_name,
            'adset_id': adset_id,
            'creative': {'creative_id': creative['id']},
            'status': 'PAUSED',
        }
    )
    
    return ad

def verify_campaign_and_adset(account, campaign_id, adset_id):
    """Verify that campaign and ad set exist and are accessible"""
    try:
        # First check campaign
        campaign = Campaign(campaign_id)
        campaign.remote_read(fields=['name', 'status'])
        print(f"Campaign found: {campaign['name']} (Status: {campaign['status']})")

        # Get all ad sets in the campaign
        adsets = account.get_ad_sets(
            params={'campaign_id': campaign_id},
            fields=['id', 'name', 'status']
        )
        
        print("\nAd Sets in this campaign:")
        found_adset = False
        for adset in adsets:
            print(f"ID: {adset['id']}")
            print(f"Name: {adset['name']}")
            print(f"Status: {adset['status']}")
            print("---")
            
            if adset['id'] == adset_id:
                found_adset = True
                
        if not found_adset:
            print(f"\nWARNING: Ad Set ID {adset_id} not found in campaign {campaign_id}")
            
        return found_adset

    except FacebookRequestError as e:
        print(f"Error verifying IDs: {str(e)}")
        return False

def list_all_adsets(account):
    """List all ad sets in the account"""
    try:
        adsets = account.get_ad_sets(fields=['id', 'name', 'campaign_id', 'status'])
        print("\nAll Ad Sets in Account:")
        for adset in adsets:
            print(f"ID: {adset['id']}")
            print(f"Name: {adset['name']}")
            print(f"Campaign ID: {adset['campaign_id']}")
            print(f"Status: {adset['status']}")
            print("---")
    except FacebookRequestError as e:
        print(f"Error listing ad sets: {str(e)}")

def create_adset(ad_account, campaign_id, adset_name="Web Signup Ad Set"):
    start_time = datetime.now()

    targeting = {
        "device_platforms": ["mobile"],
        "geo_locations": {
            "countries": ["NL"],
            "location_types": ["home", "recent"]
        },
        "publisher_platforms": ["facebook", "instagram", "audience_network", "messenger"],
        "facebook_positions": [
            "feed", "right_hand_column", "marketplace", "video_feeds",
            "story", "search", "instream_video", "facebook_reels",
            "facebook_reels_overlay", "profile_feed"
        ],
        "instagram_positions": [
            "stream", "story", "explore", "explore_home", "reels",
            "profile_feed", "ig_search", "profile_reels"
        ],
        "messenger_positions": ["messenger_home", "story"],
        "audience_network_positions": ["classic", "rewarded_video"],
        "user_os": ["iOS"],
        "user_device": ["iPhone", "iPad"]
    }

    adset = ad_account.create_ad_set(
        params={
            'name': adset_name,
            'campaign_id': campaign_id,
            'billing_event': 'IMPRESSIONS',
            'optimization_goal': 'OFFSITE_CONVERSIONS',
            'daily_budget': 10000,
            'bid_strategy': 'LOWEST_COST_WITHOUT_CAP',
            'targeting': targeting,
            'start_time': start_time.strftime("%Y-%m-%d %H:%M:%S"),
            'status': 'PAUSED',
            'promoted_object': {
                'custom_event_type': 'OTHER',
                'custom_event_str': 'Signup_Info_Act_B',
                'pixel_id': '591066476363808'
            }
        }
    )
    print(f"Ad Set created successfully. ID: {adset['id']}")
    return adset

def main():
    # Initialize the API
    ad_account = initialize_api()
    
    # Image paths for 1:1 and 9:16 formats
    image_path_1_1 = '/path/to/your/1_1_image.png'
    image_path_9_16 = '/path/to/your/9_16_image.png'
    
    # Campaign ID is required
    campaign_id = '120215290345530293'
    
    # Adset ID is optional - if not provided, new adset will be created
    adset_id = None  # Set this to an actual ID if you want to use existing adset
    
    try:
        # Verify campaign exists
        campaign = Campaign(campaign_id)
        campaign.remote_read(fields=['name', 'status'])
        print(f"Campaign found: {campaign['name']} (Status: {campaign['status']})")
        
        # If no adset_id provided, create new adset
        if not adset_id:
            print("Creating new ad set...")
            adset = create_adset(ad_account, campaign_id)
            adset_id = adset['id']
        else:
            # Verify existing adset
            if not verify_campaign_and_adset(ad_account, campaign_id, adset_id):
                raise Exception("Invalid adset ID or adset not found in campaign")
        
        # Upload both images
        image_1_1 = upload_image(ad_account, image_path_1_1)
        image_9_16 = upload_image(ad_account, image_path_9_16)
        print(f"Images uploaded successfully. 1:1 Hash: {image_1_1['hash']}, 9:16 Hash: {image_9_16['hash']}")
        
        # Create ad with both image formats
        ad = create_ad(ad_account, adset_id, image_1_1['hash'], image_9_16['hash'])
        
        print("\nSummary:")
        print(f"Campaign ID: {campaign_id}")
        print(f"Ad Set ID: {adset_id}")
        print(f"Ad ID: {ad['id']}")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main()
 