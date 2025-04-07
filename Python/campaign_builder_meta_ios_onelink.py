from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.advideo import AdVideo
import os
import ffmpeg
from datetime import datetime, timedelta


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


def create_campaign(ad_account, campaign_name="OKX iOS Onelink Campaign"):
    campaign = ad_account.create_campaign(
        params={
            "name": campaign_name,
            "objective": "OUTCOME_SALES",  # Sales objective
            "status": "PAUSED",
            "special_ad_categories": [],
            "buying_type": "AUCTION",
        }
    )

    # Get the campaign ID safely
    campaign_id = campaign.get("id") if hasattr(campaign, "get") else campaign["id"]
    print(f"Campaign created successfully. ID: {campaign_id}")
    return campaign_id


def create_adset(ad_account, campaign_id, adset_name="Web Signup Ad Set", budget=10000, country=None):
    """
    Create an ad set for web signup campaign

    Args:
        ad_account: The Facebook Ad Account object
        campaign_id: The ID of the campaign to create the ad set in
        adset_name: The name of the ad set
        budget: The daily budget in cents (default: 10000)
        country: The country code to target (default: None, which targets worldwide)

    Returns:
        The ID of the created ad set
    """
    # Set start and end dates
    start_time = datetime.now()
    
    # Default targeting is worldwide
    targeting = {
        'geo_locations': {
            'countries': ['US']  # Default to US if no country specified
        },
        'age_min': 18,
        'age_max': 65,
        'user_os': ['iOS']
    }
    
    # If country is specified, target only that country
    if country:
        targeting['geo_locations'] = {
            'countries': [country]
        }

    # Define targeting
    targeting = {
        "geo_locations": {
            "countries": [country] if country else ["US"],  # Use specified country or default to US
            "location_types": ["home", "recent"],
        },
        "age_min": 18,
        "age_max": 65,
        "facebook_positions": [
            "feed",
            "right_hand_column",
            "marketplace",
            "video_feeds",
            "story",
            "search",
            "instream_video",
            "facebook_reels",
            "facebook_reels_overlay",
            "profile_feed",
        ],
        "instagram_positions": [
            "stream",
            "story",
            "explore",
            "explore_home",
            "reels",
            "profile_feed",
            "ig_search",
            "profile_reels",
        ],
        "messenger_positions": ["messenger_home", "story"],
        "audience_network_positions": ["classic", "rewarded_video"],
        "user_os": ["iOS"],  # Only iOS
        "user_device": ["iPhone", "iPad"],
        "excluded_custom_audiences": [
            {"id": "120215780341490066"},
            {"id": "120213876644850293"},
        ],  # Exclude specified custom audience IDs
    }

    adset = ad_account.create_ad_set(
        params={
            "name": adset_name,
            "campaign_id": campaign_id,
            "billing_event": "IMPRESSIONS",
            "optimization_goal": "OFFSITE_CONVERSIONS",
            "daily_budget": budget,  # Use the budget parameter
            "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
            "targeting": targeting,
            "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "PAUSED",
            "promoted_object": {
                "custom_event_type": "OTHER",  # Changed to OTHER for custom event
                "custom_event_str": "Signup_Info_Act_B",  # Added custom event name
                "pixel_id": "591066476363808",  # Your Conversion API dataset ID
            },
        }
    )

    # Get the adset ID safely
    adset_id = adset.get("id") if hasattr(adset, "get") else adset["id"]
    print(f"Ad Set created successfully. ID: {adset_id}")
    return adset_id


def generate_video_thumbnail(video_path):
    """Generate a thumbnail from video using FFMPEG"""
    thumbnail_path = video_path.rsplit(".", 1)[0] + "_thumb.jpg"

    try:
        # Take screenshot from first frame
        (
            ffmpeg.input(video_path)
            .filter("scale", 1200, -1)  # Scale width to 1200px, maintain aspect ratio
            .output(thumbnail_path, vframes=1)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        return thumbnail_path
    except ffmpeg.Error as e:
        print("Error generating thumbnail:", e.stderr.decode())
        return None


def upload_media(ad_account, media_path):
    """Upload either an image or video based on file extension"""
    file_extension = media_path.lower().split(".")[-1]

    if file_extension in ["jpg", "jpeg", "png"]:
        # Upload image
        image = AdImage(parent_id=ad_account.get_id_assured())
        image[AdImage.Field.filename] = media_path
        image.remote_create()
        # After remote_create(), the image object should have the hash attribute
        print(f"Image uploaded successfully. Hash: {image.get('hash')}")
        return {"hash": image.get("hash"), "type": "image"}

    elif file_extension in ["mp4", "mov"]:
        # Upload video
        video = ad_account.create_ad_video(
            params={
                "filename": media_path,
            }
        )
        video_id = video.get("id") if hasattr(video, "get") else video["id"]
        print(f"Video uploaded successfully. ID: {video_id}")
        return {"hash": video_id, "type": "video", "path": media_path}  # Added path

    else:
        raise ValueError(f"Unsupported file type: {file_extension}")


def create_ad(
    ad_account, adset_id, media_info, ad_name="Web Signup Ad", custom_link_url=None
):
    """
    Create a Facebook ad for web signup using Flexible Ad Format

    Args:
        ad_account: The Facebook ad account
        adset_id: The ad set ID
        media_info: The media info dictionary or a list of media info dictionaries
        ad_name: The name of the ad
        custom_link_url: Optional custom landing page URL

    Returns:
        The ad ID
    """
    # Get account ID from the ad_account object
    account_id = ad_account.get_id_assured().replace("act_", "")

    # Try to get account details from config
    try:
        import meta_account_config

        account_details = meta_account_config.get_account_details(account_id)
        print(f"Found account details for account ID {account_id}: {account_details}")
    except (ImportError, AttributeError):
        account_details = None
        print(f"Could not get account details for account ID {account_id}")

    # Use custom link URL if provided, otherwise use from account config or default
    if custom_link_url:
        full_url = custom_link_url
        print(f"Using custom link URL: {full_url}")
    elif account_details and account_details.get("link_url"):
        full_url = account_details.get("link_url")
        print(f"Using link URL from account config: {full_url}")
    else:
        # Default URL if not found in config
        base_url = "https://okex.onelink.me/qjih/7tx4urtd"
        tracking_params = "pid=metaweb_int&af_ad_id={{ad.id}}&af_adset_id={{adset.id}}&af_c_id={{campaign.id}}&c={{campaign.name}}&af_ad={{ad.name}}&af_adset={{adset.name}}&af_sub4={{fbclid}}"
        full_url = f"{base_url}?{tracking_params}"
        print(f"Using default link URL: {full_url}")

    # Convert single media_info to list if needed
    media_infos = media_info if isinstance(media_info, list) else [media_info]

    # Generate a unique group UUID for the asset group
    import uuid

    group_uuid = str(uuid.uuid4())

    # Prepare the first media for the base creative
    first_media = media_infos[0]

    # Create object_story_spec based on the first media type
    object_story_spec = {"page_id": "107128152374091"}

    if first_media["type"] == "image":
        # For images, use link_data
        object_story_spec["link_data"] = {
            "image_hash": first_media["hash"],
            "link": full_url,
            "message": 'Trade crypto with OKX - The most trusted crypto trading platform. Winner of the "Most Reliable Tech" award by TradingView.',
            "call_to_action": {"type": "SIGN_UP", "value": {"link": full_url}},
        }
    elif first_media["type"] == "video":
        # For videos, generate a thumbnail and use video_data
        thumbnail_path = None
        if "path" in first_media:
            thumbnail_path = generate_video_thumbnail(first_media["path"])

        if thumbnail_path:
            # Upload thumbnail to Facebook
            thumbnail = AdImage(parent_id=ad_account.get_id_assured())
            thumbnail[AdImage.Field.filename] = thumbnail_path
            thumbnail.remote_create()

            # Clean up the temporary thumbnail file
            os.remove(thumbnail_path)

            # Use the uploaded thumbnail's hash
            object_story_spec["video_data"] = {
                "video_id": first_media["hash"],
                "image_hash": thumbnail.get("hash"),
                "title": "Trade crypto with OKX",  # Added title
                "message": 'Trade crypto with OKX - The most trusted crypto trading platform. Winner of the "Most Reliable Tech" award by TradingView.',
                "link_description": "Trade crypto with OKX - The most trusted crypto trading platform.",
                "call_to_action": {"type": "SIGN_UP", "value": {"link": full_url}},
            }

    # Create the base creative
    base_creative = ad_account.create_ad_creative(
        params={
            "name": f"Base Creative for {ad_name}",
            "object_story_spec": object_story_spec
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

    # Prepare the creative asset groups spec
    # This is the key step for enabling Flexible Ad Format
    images = []
    videos = []

    for m_info in media_infos:
        if m_info["type"] == "image":
            images.append({"hash": m_info["hash"]})
        elif m_info["type"] == "video":
            videos.append({"video_id": m_info["hash"]})

    # Only update with creative_asset_groups_spec if we have multiple media items
    if len(media_infos) > 1 or len(images) > 1 or len(videos) > 1:
        ad_update_params = {
            "creative_asset_groups_spec": {
                "groups": [
                    {
                        "group_uuid": group_uuid,
                        "texts": [
                            {
                                "text": 'Trade crypto with OKX - The most trusted crypto trading platform. Winner of the "Most Reliable Tech" award by TradingView.',
                                "text_type": "primary_text",
                            }
                        ],
                        "call_to_action": {
                            "type": "SIGN_UP",
                            "value": {"link": full_url},
                        },
                    }
                ]
            }
        }

        # Add images if we have any
        if images:
            ad_update_params["creative_asset_groups_spec"]["groups"][0][
                "images"
            ] = images

        # Add videos if we have any
        if videos:
            ad_update_params["creative_asset_groups_spec"]["groups"][0][
                "videos"
            ] = videos

        # Log the update parameters for debugging
        import json

        print(f"Updating ad with parameters: {json.dumps(ad_update_params, indent=2)}")

        # Update the ad with the creative asset groups spec
        try:
            from facebook_business.adobjects.ad import Ad

            ad_obj = Ad(ad_id)
            update_result = ad_obj.api_update(fields=[], params=ad_update_params)
            print(f"Ad updated with creative asset groups spec. ID: {ad_id}")
            print(f"Update result: {update_result}")
        except Exception as e:
            print(f"Error updating ad with creative asset groups spec: {str(e)}")
            # Continue anyway, as the ad was created successfully
    else:
        print(
            f"Not updating with creative_asset_groups_spec as we only have one media item"
        )

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
        media_info = upload_media(ad_account, image_path)
        print(
            f"{media_info['type'].capitalize()} uploaded successfully. Hash/ID: {media_info['hash']}"
        )

        # Create ad
        ad_id = create_ad(ad_account, adset_id, media_info)
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
