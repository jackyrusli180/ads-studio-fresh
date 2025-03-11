from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.api import FacebookAdsApi
import os
from datetime import datetime, timedelta
import uuid
import json


def initialize_api(account_id=None):
    """Initialize the Facebook Ads API with the specified account ID"""
    access_token = "EAAVXHEPqlZBwBOwpkDKsBZBZAGlKQsG9JQPueoPi6Um3ZAwet2vonHQHOS7ULyZABuFXZCkPOcvZCNDerbVQrOIg8hA0KC6KmLkraSiqn7iEXkWZCZAueSNLXLY8eXaujRMWC9jvSgMo9p6PkTVZB8ZAMZBSjElXoLqsUZB3mwVYQZAAqD3Tjaz0cMmRdubxjOw4qE3gfZBYHTKuZAuQ"
    app_id = "1503153793701868"
    app_secret = "7e016e3d7f40a4af606e36832e41a1cf"

    FacebookAdsApi.init(app_id, app_secret, access_token)

    # Use the provided account ID or default to the test account
    if account_id:
        return AdAccount(f"act_{account_id}")
    else:
        return AdAccount("act_599607976078688")


def create_campaign(ad_account, campaign_name="OKX iOS SKAN App Promotion"):
    campaign = ad_account.create_campaign(
        params={
            "name": campaign_name,
            "objective": "OUTCOME_APP_PROMOTION",
            "status": "PAUSED",
            "special_ad_categories": [],
            "buying_type": "AUCTION",
            "special_ad_category_eligibility": {},
            "is_skadnetwork_attribution": True,
            "promoted_object": {
                "application_id": "2045001539014194",
                "object_store_url": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
            },
            "campaign_attribution": "SKADNETWORK",
        }
    )
    print(f"Campaign created successfully. ID: {campaign['id']}")
    return campaign["id"]


def create_adset(ad_account, campaign_id, name=None, budget=50000, country=None):
    """
    Create an adset for iOS14 app install campaign
    
    Args:
        ad_account: The Ad Account object
        campaign_id: ID of the campaign to create adset in
        name: Name of the adset (optional)
        budget: Daily budget in cents (default: 500 USD)
        country: Country code for targeting (e.g., 'US', 'TR')
    
    Returns:
        str: ID of the created adset
    """
    if not name:
        name = f"Ad Set {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

    # Use provided country or default to US
    target_country = country if country else 'US'
        
    targeting = {
        'geo_locations': {
            'countries': [target_country],
            'location_types': ['home', 'recent']
        },
        'user_os': ['iOS'],
        'age_min': 18,
        'age_max': 65,
    }

    # Minimum campaign duration for cost bidding must be 3 days
    start_time = datetime.now()
    end_time = start_time + timedelta(days=30)

    adset = ad_account.create_ad_set(
        params={
            "name": name,
            "campaign_id": campaign_id,
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "OFFSITE_CONVERSIONS",
            "daily_budget": budget,
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
            "targeting": targeting,
            "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "PAUSED",
            "promoted_object": {
                "application_id": "2045001539014194",
                "object_store_url": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
                "custom_event_type": "COMPLETE_REGISTRATION",
            },
        }
    )
    print(f"Ad Set created successfully. ID: {adset['id']}")
    return adset["id"]


def upload_image(ad_account, image_path):
    image = AdImage(parent_id=ad_account.get_id_assured())
    image[AdImage.Field.filename] = image_path
    image.remote_create()
    # After remote_create(), the image object should have the hash attribute
    print(f"Image uploaded successfully. Hash: {image.get('hash')}")
    return image.get("hash")


def create_ad(ad_account, adset_id, image_hash, ad_name="iOS App Install Ad"):
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
    # Convert single image hash to list if needed
    image_hashes = image_hash if isinstance(image_hash, list) else [image_hash]

    # Generate a unique group UUID for the asset group
    group_uuid = str(uuid.uuid4())

    # First, create a basic creative with the first image
    base_creative = ad_account.create_ad_creative(
        params={
            "name": f"Base Creative for {ad_name}",
            "object_story_spec": {
                "page_id": "107128152374091",  # Facebook Page ID
                "link_data": {
                    "image_hash": image_hashes[0],
                    "link": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
                    "message": 'Trade Bitcoin, crypto & more with OKX - The most trusted crypto trading app. Winner of the "Most Reliable Tech" award by TradingView.',
                    "call_to_action": {
                        "type": "INSTALL_MOBILE_APP",
                        "value": {
                            "link": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
                            "application": "2045001539014194",
                        },
                    },
                },
            }
        }
    )

    # Get the creative ID safely
    base_creative_id = (
        base_creative.get("id")
        if hasattr(base_creative, "get")
        else base_creative["id"]
    )
    print(f"Base creative created successfully. ID: {base_creative_id}")

    # Create the ad with the base creative
    ad = ad_account.create_ad(
        params={
            "name": ad_name,
            "adset_id": adset_id,
            "creative": {"creative_id": base_creative_id},
            "status": "PAUSED",
        }
    )

    # Get the ad ID safely
    ad_id = ad.get("id") if hasattr(ad, "get") else ad["id"]
    print(f"Ad created successfully. ID: {ad_id}")

    # Now update the ad with the creative asset groups spec
    # This is the key step for enabling Flexible Ad Format
    ad_update_params = {
        "creative_asset_groups_spec": {
            "groups": [
                {
                    "group_uuid": group_uuid,
                    "images": [{"hash": img_hash} for img_hash in image_hashes],
                    "texts": [
                        {
                            "text": 'Trade Bitcoin, crypto & more with OKX - The most trusted crypto trading app. Winner of the "Most Reliable Tech" award by TradingView.',
                            "text_type": "primary_text",
                        }
                    ],
                    "call_to_action": {
                        "type": "INSTALL_MOBILE_APP",
                        "value": {
                            "link": "https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470",
                            "application": "2045001539014194",
                        },
                    },
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
        image_path = "path/to/your/image.jpg"  # Replace with actual path
        image_hash = upload_image(ad_account, image_path)
        print(f"Image uploaded with hash: {image_hash}")

        # Create ad
        ad_id = create_ad(ad_account, adset_id, image_hash)
        print(f"Ad created with ID: {ad_id}")

        return {
            "success": True,
            "campaign_id": campaign_id,
            "adset_id": adset_id,
            "ad_id": ad_id,
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    main()
