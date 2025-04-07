"""
Ad uploader for creating ads in existing adsets (Operation Type 1).
This module handles the creation of ads in existing adsets for both Meta and TikTok platforms.
"""

import logging
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.adobjects.campaign import Campaign
from facebook_business.api import FacebookAdsApi
from facebook_business.exceptions import FacebookRequestError
import os
import uuid
import json
import meta_account_config
import tiktok_account_config
import business_api_client
from business_api_client import AdAcoApi, FileApi

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Meta API Functions


def initialize_meta_api(account_id):
    """
    Initialize the Facebook Ads API with the specified account ID

    Args:
        account_id: The Meta ad account ID

    Returns:
        The initialized AdAccount object
    """
    logger.info(f"Initializing Meta API for account ID: {account_id}")

    # Get credentials from meta_account_config if possible
    try:
        access_token = 'EAAVXHEPqlZBwBOwpkDKsBZBZAGlKQsG9JQPueoPi6Um3ZAwet2vonHQHOS7ULyZABuFXZCkPOcvZCNDerbVQrOIg8hA0KC6KmLkraSiqn7iEXkWZCZAueSNLXLY8eXaujRMWC9jvSgMo9p6PkTVZB8ZAMZBSjElXoLqsUZB3mwVYQZAAqD3Tjaz0cMmRdubxjOw4qE3gfZBYHTKuZAuQ'
        app_id = '1503153793701868'
        app_secret = '7e016e3d7f40a4af606e36832e41a1cf'

        FacebookAdsApi.init(app_id, app_secret, access_token)
        return AdAccount(f'act_{account_id}')
    except Exception as e:
        logger.error(f"Error initializing Meta API: {str(e)}")
        raise


def upload_image_to_meta(ad_account, image_path):
    """
    Upload an image to Meta Ads

    Args:
        ad_account: The Meta ad account
        image_path: Path to the image file (can be a URL path like /static/uploads/image.jpg)

    Returns:
        The image hash
    """
    logger.info(f"Uploading image to Meta: {image_path}")

    try:
        # Convert URL path to filesystem path if needed
        if image_path.startswith('/static/'):
            # Get the project root directory (assuming this file is in the
            # Python directory)
            project_root = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__)))
            # Replace /static/ with the actual static folder path
            filesystem_path = os.path.join(
                project_root, image_path.lstrip('/'))
            logger.info(
                f"Converted URL path to filesystem path: {filesystem_path}")
        else:
            filesystem_path = image_path

        # Check if file exists
        if not os.path.exists(filesystem_path):
            raise FileNotFoundError(
                f"Image file not found: {filesystem_path} (from {image_path})")

        # Upload the image
        image = AdImage(parent_id=ad_account.get_id_assured())
        image[AdImage.Field.filename] = filesystem_path
        image.remote_create()

        logger.info(f"Image uploaded to Meta. Hash: {image.get('hash')}")
        return image.get('hash')
    except Exception as e:
        logger.error(f"Error uploading image to Meta: {str(e)}")
        raise


def create_ad_in_meta_adset(ad_account, adset_id, image_hashes, ad_name):
    """
    Create a new ad in an existing Meta adset

    Args:
        ad_account: The Meta ad account
        adset_id: The ID of the existing adset
        image_hashes: List of image hashes
        ad_name: Name for the new ad

    Returns:
        Dictionary with success status and ad ID
    """
    logger.info(f"Creating Meta ad '{ad_name}' in adset {adset_id}")

    try:
        # Get adset details to determine the campaign objective
        adset = AdSet(adset_id)
        adset.remote_read(fields=['campaign_id', 'promoted_object'])

        # Get campaign details to determine the objective
        campaign = Campaign(adset['campaign_id'])
        campaign.remote_read(fields=['objective'])

        # Determine if this is an app install campaign vs. a conversion
        # campaign
        is_app_install = False
        app_id = None
        store_url = None
        pixel_id = None
        custom_event = None

        if 'promoted_object' in adset:
            if 'application_id' in adset['promoted_object']:
                is_app_install = True
                app_id = adset['promoted_object']['application_id']
                store_url = adset['promoted_object'].get(
                    'object_store_url', '')
            elif 'pixel_id' in adset['promoted_object']:
                is_app_install = False
                pixel_id = adset['promoted_object']['pixel_id']
                custom_event = adset['promoted_object'].get(
                    'custom_event_type')
                custom_event_str = adset['promoted_object'].get(
                    'custom_event_str')

        # Get account ID
        account_id = ad_account.get_id_assured().replace('act_', '')

        # Get the first image hash for the base creative
        first_image_hash = image_hashes[0] if isinstance(
            image_hashes, list) else image_hashes

        # Create the creative based on campaign type
        creative_params = {
            'name': f'Creative for {ad_name}',
            'object_story_spec': {
                'page_id': '107128152374091',  # Facebook Page ID
                'link_data': {
                    'image_hash': first_image_hash,
                    'message': 'Trade Bitcoin, crypto & more with OKX - The most trusted crypto trading app.',
                }
            }
        }

        # Add link and call to action based on campaign type
        if is_app_install:
            # App install campaign
            creative_params['object_story_spec']['link_data']['link'] = store_url
            creative_params['object_story_spec']['link_data']['call_to_action'] = {
                'type': 'INSTALL_MOBILE_APP', 'value': {
                    'link': store_url, 'application': app_id}}
        else:
            # Conversion campaign
            landing_page = 'https://okex.onelink.me/qjih/7tx4urtd'
            creative_params['object_story_spec']['link_data']['link'] = landing_page
            creative_params['object_story_spec']['link_data']['call_to_action'] = {
                'type': 'SIGN_UP', 'value': {'link': landing_page}}

        # Create the base creative
        creative = ad_account.create_ad_creative(params=creative_params)

        # Create the ad with the base creative
        ad = ad_account.create_ad(
            params={
                'name': ad_name,
                'adset_id': adset_id,
                'creative': {'creative_id': creative['id']},
                'status': 'PAUSED',
            }
        )

        # If we have multiple images, update with creative asset groups
        if isinstance(image_hashes, list) and len(image_hashes) > 1:
            # Generate a unique group UUID for the asset group
            group_uuid = str(uuid.uuid4())

            # Prepare creative assets update
            ad_update_params = {
                'creative_asset_groups_spec': {
                    'groups': [
                        {
                            'group_uuid': group_uuid,
                            'images': [{'hash': img_hash} for img_hash in image_hashes],
                            'texts': [
                                {
                                    'text': 'Trade Bitcoin, crypto & more with OKX - The most trusted crypto trading app.',
                                    'text_type': 'primary_text'
                                }
                            ]
                        }
                    ]
                }
            }

            # Add call to action to the asset group
            if is_app_install:
                ad_update_params['creative_asset_groups_spec']['groups'][0]['call_to_action'] = {
                    'type': 'INSTALL_MOBILE_APP',
                    'value': {
                        'link': store_url,
                        'application': app_id
                    }
                }
            else:
                landing_page = 'https://okex.onelink.me/qjih/7tx4urtd'
                ad_update_params['creative_asset_groups_spec']['groups'][0]['call_to_action'] = {
                    'type': 'SIGN_UP', 'value': {'link': landing_page}}

            # Update the ad with creative assets
            ad_obj = Ad(ad['id'])
            update_result = ad_obj.api_update(
                fields=[], params=ad_update_params)
            logger.info(
                f"Ad updated with multiple images. Update result: {update_result}")

        logger.info(f"Meta ad created successfully. ID: {ad['id']}")
        return {
            'success': True,
            'ad_id': ad['id'],
            'ad_name': ad_name
        }
    except Exception as e:
        logger.error(f"Error creating Meta ad: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

# TikTok API Functions


def initialize_tiktok_api():
    """
    Initialize the TikTok Ads API

    Returns:
        Dictionary of TikTok API clients
    """
    logger.info("Initializing TikTok API")

    try:
        # Get credentials from tiktok_account_config if possible
        access_token = 'b8586d78d2a3d2ae1b542c1e8c99c0e3c82bdaaf'  # Long-term access token

        # Initialize the API configuration
        configuration = business_api_client.Configuration()
        configuration.access_token = access_token
        configuration.host = "https://business-api.tiktok.com"

        # Create API client
        api_client = business_api_client.ApiClient(configuration)

        # Initialize specific API instances
        apis = {
            'ad_api': AdAcoApi(api_client),
            'file_api': FileApi(api_client)
        }

        return apis
    except Exception as e:
        logger.error(f"Error initializing TikTok API: {str(e)}")
        raise


def upload_image_to_tiktok(apis, advertiser_id, image_path):
    """
    Upload an image to TikTok Ads

    Args:
        apis: The TikTok API clients
        advertiser_id: The TikTok advertiser ID
        image_path: Path to the image file (can be a URL path like /static/uploads/image.jpg)

    Returns:
        Dictionary with image ID and image URL
    """
    logger.info(
        f"Uploading image to TikTok for advertiser {advertiser_id}: {image_path}")

    try:
        # Convert URL path to filesystem path if needed
        if image_path.startswith('/static/'):
            # Get the project root directory (assuming this file is in the
            # Python directory)
            project_root = os.path.dirname(
                os.path.dirname(os.path.abspath(__file__)))
            # Replace /static/ with the actual static folder path
            filesystem_path = os.path.join(
                project_root, image_path.lstrip('/'))
            logger.info(
                f"Converted URL path to filesystem path: {filesystem_path}")
        else:
            filesystem_path = image_path

        # Check if file exists
        if not os.path.exists(filesystem_path):
            error_msg = f"Image file not found: {filesystem_path} (from {image_path})"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)

        # Get file info for debugging
        file_size = os.path.getsize(filesystem_path)
        logger.info(
            f"File size: {file_size} bytes ({
                file_size / 1024:.2f} KB)")

        # Read image file as binary data
        with open(filesystem_path, 'rb') as file:
            image_data = file.read()

        # Calculate MD5 hash
        import hashlib
        from datetime import datetime
        image_signature = hashlib.md5(image_data).hexdigest()

        # Add timestamp to filename to avoid duplicates
        original_filename = os.path.basename(filesystem_path)
        file_base, file_ext = os.path.splitext(original_filename)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_filename = f"{file_base}_{timestamp}{file_ext}"

        logger.info(
            f"Using unique filename: {unique_filename}, signature: {image_signature}")

        # API endpoint and headers
        url = "https://business-api.tiktok.com/open_api/v1.3/file/image/ad/upload/"
        headers = {
            "Access-Token": apis['file_api'].api_client.configuration.access_token}

        # Prepare multipart form-data
        import requests
        files = {
            "image_file": (
                unique_filename,
                image_data,
                'application/octet-stream')}
        data = {
            "advertiser_id": str(advertiser_id),
            "upload_type": "UPLOAD_BY_FILE",
            "image_signature": image_signature,
            "file_name": unique_filename
        }

        # Make request
        response = requests.post(url, headers=headers, data=data, files=files)
        response_data = response.json()

        logger.info(f"TikTok image upload response: {response_data}")

        if response_data.get('code') == 0:
            image_id = response_data['data']['image_id']
            image_url = response_data['data']['image_url']

            logger.info(
                f"Image uploaded to TikTok successfully. ID: {image_id}, URL: {image_url}")
            return {
                'id': image_id,
                'url': image_url
            }
        else:
            error_msg = response_data.get('message', 'Unknown error')
            error_code = response_data.get('code', 'Unknown code')
            raise Exception(
                f"TikTok API error: Code {error_code}, Message: {error_msg}")
    except FileNotFoundError as e:
        logger.error(f"File not found error: {str(e)}")
        raise  # Re-raise to be caught and handled by caller
    except Exception as e:
        logger.error(f"Error uploading image to TikTok: {str(e)}")
        raise


def create_ad_in_tiktok_adset(
        apis,
        advertiser_id,
        adset_id,
        image_infos,
        ad_name):
    """
    Create a new ad in an existing TikTok adset (ad group)

    Args:
        apis: The TikTok API clients
        advertiser_id: The TikTok advertiser ID
        adset_id: The ID of the existing adset
        image_infos: List of image info dictionaries
        ad_name: Name for the new ad

    Returns:
        Dictionary with success status and ad ID
    """
    logger.info(f"Creating TikTok ad '{ad_name}' in adset {adset_id}")

    try:
        # Get account details from config for identity_id
        account_details = tiktok_account_config.get_account_details(
            advertiser_id)
        identity_id = account_details.get(
            'identity_id') if account_details else '7396963176740913168'  # Default as fallback

        # Log the identity_id being used
        logger.info(
            f"Using identity_id: {identity_id} for advertiser: {advertiser_id}")

        # Prepare image IDs
        image_ids = [img_info['id'] for img_info in image_infos]

        # Always use CAROUSEL_ADS for images per user requirement
        ad_format = 'CAROUSEL_ADS'
        logger.info(
            f"Using ad format: {ad_format} for {
                len(image_ids)} images")

        # Prepare API endpoint and headers
        url = "https://business-api.tiktok.com/open_api/v1.3/ad/create/"
        headers = {
            'Access-Token': apis['file_api'].api_client.configuration.access_token,
            'Content-Type': 'application/json'}

        # Prepare creative object
        creative = {
            'ad_format': ad_format,
            'ad_name': ad_name,
            'image_ids': image_ids,
            'ad_text': 'Trade Bitcoin, crypto & more with OKX - The most trusted crypto trading app.',
            'call_to_action': 'DOWNLOAD_NOW',
            'landing_page_url': 'https://apps.apple.com/us/app/okx-buy-bitcoin-btc-crypto/id1327268470',
            'display_name': 'OKX: Buy Bitcoin & Crypto',
            'identity_type': 'CUSTOMIZED_USER',
            'identity_id': identity_id,
            'music_id': '6991891121504782338'  # Always include music_id for CAROUSEL_ADS
        }

        # Prepare request body
        request_body = {
            'advertiser_id': str(advertiser_id),
            'adgroup_id': str(adset_id),
            'ad_name': ad_name,
            'status': 'DISABLE',
            'creatives': [creative]
        }

        logger.info(f"Ad creation request data: {request_body}")

        # Make API request
        import requests
        response = requests.post(url, headers=headers, json=request_body)
        response_data = response.json()

        logger.info(f"TikTok ad creation response: {response_data}")

        # Check response
        if response_data.get('code') == 0:
            ad_data = response_data.get('data', {})
            ad_ids = ad_data.get('ad_ids', [])

            if not ad_ids:
                raise Exception("No ad IDs returned from TikTok API")

            logger.info(f"TikTok ad created successfully. ID: {ad_ids[0]}")
            return {
                'success': True,
                'ad_id': ad_ids[0],
                'ad_name': ad_name
            }
        else:
            error_msg = response_data.get('message', 'Unknown error')
            raise Exception(f"TikTok API error: {error_msg}")
    except Exception as e:
        logger.error(f"Error creating TikTok ad: {str(e)}")
        return {
            'success': False,
            'error': str(e)
        }

# Main function to create ads in existing adsets


def create_ads_in_existing_adsets(
        platform,
        advertiser_id,
        adset_ids,
        library_assets,
        ad_names=None):
    """
    Create ads in existing adsets for the specified platform

    Args:
        platform: 'meta' or 'tiktok'
        advertiser_id: The platform-specific advertiser ID
        adset_ids: List of adset IDs
        library_assets: List of assets from the media library
        ad_names: Dictionary mapping adset IDs to ad names

    Returns:
        Dictionary with results
    """
    logger.info(
        f"Creating ads for platform: {platform}, Advertiser ID: {advertiser_id}")
    logger.info(f"Adset IDs: {adset_ids}")
    logger.info(f"Number of assets: {len(library_assets)}")

    # Debug log to check asset assignments
    for adset_id in adset_ids:
        if adset_id in ad_names:
            if isinstance(ad_names[adset_id], list):
                # Handle case where multiple ads are defined for the same adset
                for idx, ad_entry in enumerate(ad_names[adset_id]):
                    logger.info(
                        f"Adset {adset_id}, Ad #{
                            idx +
                            1} '{
                            ad_entry.get('name')}' has {
                            len(
                                ad_entry.get(
                                    'assets',
                                    []))} assets assigned")
                    logger.info(
                        f"Asset IDs assigned to adset {adset_id}, Ad #{
                            idx +
                            1}: {
                            ad_entry.get(
                                'assets',
                                [])}")
            else:
                # Single ad for this adset
                logger.info(
                    f"Adset {adset_id} has {len(ad_names[adset_id].get('assets', []))} assets assigned")
                logger.info(
                    f"Asset IDs assigned to adset {adset_id}: {
                        ad_names[adset_id].get(
                            'assets', [])}")

    results = {
        'success': True,
        'platform': platform,
        'ads_created': []
    }

    try:
        # Initialize the appropriate API
        if platform == 'meta':
            api = initialize_meta_api(advertiser_id)
        elif platform == 'tiktok':
            api = initialize_tiktok_api()
        else:
            raise ValueError(f"Unsupported platform: {platform}")

        # Process each adset
        for adset_id in adset_ids:
            # Check if we have multiple ads for this adset
            if adset_id in ad_names:
                if isinstance(ad_names[adset_id], list):
                    # Multiple ads for this adset
                    ad_entries = ad_names[adset_id]
                else:
                    # Single ad for this adset, convert to list for consistent
                    # processing
                    ad_entries = [ad_names[adset_id]]
            else:
                # No ads defined, create default entry
                ad_entries = [
                    {'name': f"Ad for adset {adset_id}", 'assets': []}]

            # Process each ad for this adset
            for ad_entry in ad_entries:
                ad_name = ad_entry.get('name', f"Ad for adset {adset_id}")
                assigned_asset_ids = ad_entry.get('assets', [])

                logger.info(f"Processing ad '{ad_name}' for adset {adset_id}")
                logger.info(
                    f"Looking for assets with IDs: {assigned_asset_ids}")

                # Find the assigned assets in the library
                adset_assets = [
                    asset for asset in library_assets if asset.get('id') in assigned_asset_ids]
                logger.info(
                    f"Found {
                        len(adset_assets)} assets for ad '{ad_name}' in adset {adset_id}")

                if not adset_assets:
                    error_msg = f"No assets assigned to ad '{ad_name}' in adset {adset_id}"
                    logger.warning(error_msg)
                    results.setdefault('errors', []).append(error_msg)
                    continue

                # Create ad based on platform
                if platform == 'meta':
                    # Upload images to Meta
                    image_hashes = []
                    for asset in adset_assets:
                        try:
                            if asset.get('type') == 'image':
                                image_hash = upload_image_to_meta(
                                    api, asset.get('file_path'))
                                image_hashes.append(image_hash)
                        except Exception as e:
                            error_msg = f"Error uploading image {
                                asset.get('id')} to Meta: {
                                str(e)}"
                            logger.error(error_msg)
                            results.setdefault('errors', []).append(error_msg)

                    if not image_hashes:
                        error_msg = f"Failed to upload any images for ad '{ad_name}' in adset {adset_id}"
                        logger.error(error_msg)
                        results.setdefault('errors', []).append(error_msg)
                        continue

                    # Create ad in the adset
                    ad_result = create_ad_in_meta_adset(
                        api, adset_id, image_hashes, ad_name)

                    if ad_result['success']:
                        results['ads_created'].append({
                            'adset_id': adset_id,
                            'ad_id': ad_result['ad_id'],
                            'ad_name': ad_name
                        })
                    else:
                        results['success'] = False
                        results.setdefault(
                            'errors',
                            []).append(
                            ad_result.get(
                                'error',
                                f"Error creating ad '{ad_name}' in adset {adset_id}"))

                elif platform == 'tiktok':
                    # Upload images to TikTok
                    image_infos = []
                    for asset in adset_assets:
                        try:
                            if asset.get('type') == 'image':
                                image_info = upload_image_to_tiktok(
                                    api, advertiser_id, asset.get('file_path'))
                                image_infos.append(image_info)
                        except Exception as e:
                            error_msg = f"Error uploading image {
                                asset.get('id')} to TikTok: {
                                str(e)}"
                            logger.error(error_msg)
                            results.setdefault('errors', []).append(error_msg)

                    if not image_infos:
                        error_msg = f"Failed to upload any images for ad '{ad_name}' in adset {adset_id}"
                        logger.error(error_msg)
                        results.setdefault('errors', []).append(error_msg)
                        continue

                    # Create ad in the adset
                    ad_result = create_ad_in_tiktok_adset(
                        api, advertiser_id, adset_id, image_infos, ad_name)

                    if ad_result['success']:
                        results['ads_created'].append({
                            'adset_id': adset_id,
                            'ad_id': ad_result['ad_id'],
                            'ad_name': ad_name
                        })
                    else:
                        results['success'] = False
                        results.setdefault(
                            'errors',
                            []).append(
                            ad_result.get(
                                'error',
                                f"Error creating ad '{ad_name}' in adset {adset_id}"))

        return results

    except Exception as e:
        logger.error(f"Error creating ads for {platform}: {str(e)}")
        return {
            'success': False,
            'platform': platform,
            'error': str(e)
        }


# For direct testing
if __name__ == "__main__":
    # Sample test
    print("Ad Uploader module loaded. Run through the Flask app to create ads.")
