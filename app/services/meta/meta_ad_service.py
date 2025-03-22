"""
Meta Ad Service
Handles creation and management of Meta ads
"""
import logging
import os
import json
import re
from facebook_business.adobjects.adcreative import AdCreative
from facebook_business.adobjects.adimage import AdImage
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.adset import AdSet
from facebook_business.adobjects.ad import Ad
from facebook_business.exceptions import FacebookRequestError

from app.config.meta_config import DEFAULT_PAGE_ID, get_meta_account_details
from app.services.meta.meta_utils import create_fallback_image

class MetaAdService:
    """Service for creating and managing Meta ads"""
    
    def __init__(self, api, ad_account_id, asset_service):
        """Initialize the ad service
        
        Args:
            api: Initialized FacebookAdsApi instance
            ad_account_id: Meta ad account ID
            asset_service: Instance of MetaAssetService for handling images/videos
        """
        self.api = api
        self.ad_account_id = ad_account_id
        self.asset_service = asset_service
    
    def get_ad_account(self, account_id=None):
        """Get an ad account object"""
        account_id = account_id or self.ad_account_id
        if not account_id.startswith('act_'):
            account_id = f'act_{account_id}'
        return AdAccount(account_id)
    
    def create_ad(self, ad_data):
        """
        Create a new ad in Meta
        
        Args:
            ad_data (dict): Ad data including name, adset_id, assets
            
        Returns:
            dict: Created ad data or error message
        """
        try:
            adset_id = str(ad_data['adset_id'])
            # Extract numeric ID if needed
            if '_' in adset_id:
                adset_id = adset_id.split('_')[-1]
            
            logging.info(f"[Meta] Using numeric adset ID: {adset_id} (extracted from {ad_data['adset_id']})")
            
            # Get the account configuration to access app store URLs
            account_details = get_meta_account_details(self.ad_account_id)
            if not account_details:
                raise Exception(f"No configuration found for account ID: {self.ad_account_id}")
            
            # Get page ID for the ad
            page_id = self._get_page_id_from_adset(adset_id)
            logging.info(f"Using page ID: {page_id} for ad creation")
            
            # Initialize with default store URLs from account configuration
            object_store_url_android = account_details['object_store_url_android']
            object_store_url_ios = account_details['object_store_url_ios']
            use_single_store_url = False
            single_store_url = None
            
            # Get the promoted object information from the AdSet to match store URLs
            try:
                adset = AdSet(adset_id)
                adset_data = adset.api_get(fields=['promoted_object'])
                
                logging.info(f"AdSet data for promoted object: {adset_data}")
                
                # If adset has a promoted object, we MUST use those store URLs
                promoted_object = adset_data.get('promoted_object', {})
                if promoted_object:
                    logging.info(f"AdSet has promoted object: {promoted_object}")
                    
                    # Get the exact object store URL from the promoted object
                    if 'object_store_url' in promoted_object:
                        object_store_url = promoted_object.get('object_store_url')
                        logging.info(f"Using exact object store URL from promoted object: {object_store_url}")
                        
                        # Use the single URL from promoted object
                        use_single_store_url = True
                        single_store_url = object_store_url
                        
                        # For compatibility, also set individual platform URLs
                        object_store_url_android = object_store_url
                        object_store_url_ios = object_store_url
                        logging.info(f"Using promoted object URL for all platforms: {object_store_url}")
            except Exception as e:
                logging.warning(f"Could not get promoted object from adset: {e}")
                # Continue with account_details
            
            # Process assets (images/videos)
            asset_data = self.asset_service.process_assets(ad_data)
            
            # Get the ad account object
            ad_account = self.get_ad_account()
            
            # Create creative with the correct object store URLs from the adset's promoted object
            # Handle both single URL and platform-specific URLs
            creative_params = {
                'name': f"Creative for {ad_data['name']}",
                'title': ad_data.get('headline', ''),
                'object_story_spec': {
                    'page_id': page_id,
                    'link_data': {
                        'image_hash': asset_data.get('image_hash'),
                        'link': account_details['link_url'],
                        'message': ad_data.get('headline', ''),
                        'call_to_action': {
                            'type': 'DOWNLOAD',
                            'value': {
                                'link': account_details['link_url']
                            }
                        }
                    }
                }
            }
            
            # Set object store URLs based on what the AdSet's promoted object expects
            if use_single_store_url:
                # Use the exact URL from promoted object as link
                creative_params['object_story_spec']['link_data']['link'] = single_store_url
                creative_params['object_story_spec']['link_data']['call_to_action']['value']['link'] = single_store_url
                logging.info(f"Using single store URL from promoted object as link: {single_store_url}")
            else:
                # Use platform-specific URLs
                creative_params['object_story_spec']['link_data']['call_to_action']['value']['object_store_urls'] = {
                    'android': object_store_url_android,
                    'iphone': object_store_url_ios,
                    'ipad': object_store_url_ios
                }
                logging.info(f"Using platform-specific object_store_urls")
            
            logging.info(f"Creating creative with parameters: {creative_params}")
            
            # Create the creative
            creative = ad_account.create_ad_creative(params=creative_params)
            
            creative_id = creative['id']
            logging.info(f"Created Meta creative with ID: {creative_id}")
                
            # Create the ad
            ad_params = {
                'name': ad_data['name'],
                'adset_id': adset_id,
                'creative': {'creative_id': creative_id},
                'status': 'ACTIVE'  # Set to active instead of paused
            }
            
            logging.info(f"Sending ad parameters to Meta API: {ad_params}")
            
            # Create ad using the direct API call
            ad = ad_account.create_ad(params=ad_params)
            
            created_ad_id = ad['id']
            return {'success': True, 'ad_id': created_ad_id}
            
        except FacebookRequestError as e:
            logging.error(f"Error creating Meta ad: {e}")
            
            # Try fallback approach with placeholder
            try:
                return self._create_emergency_fallback_ad(ad_data, e)
            except Exception as fallback_error:
                logging.error(f"Emergency fallback ad creation failed: {fallback_error}")
                return {'success': False, 'error': str(e), 'fallback_error': str(fallback_error)}
        
        except Exception as e:
            logging.error(f"Unexpected error creating Meta ad: {e}")
            return {'success': False, 'error': str(e)}

    def _create_emergency_fallback_ad(self, ad_data, original_error):
        """Create a fallback ad when the primary method fails"""
        logging.warning("Using emergency fallback for ad creation")
        
        # Extract adset ID
        adset_id = str(ad_data['adset_id'])
        if '_' in adset_id:
            adset_id = adset_id.split('_')[-1]
        
        # Get the account configuration for URLs
        account_details = get_meta_account_details(self.ad_account_id)
        if not account_details:
            raise Exception(f"No configuration found for account ID: {self.ad_account_id}")
        
        # Generate fallback placeholder image
        placeholder_path = create_fallback_image()
        
        # Get page ID
        page_id = self._get_page_id_from_adset(adset_id)
        
        # Upload the fallback image
        image = AdImage(parent_id=f'act_{self.ad_account_id}')
        image[AdImage.Field.filename] = placeholder_path
        image.remote_create()
        image_hash = image[AdImage.Field.hash]
        logging.info(f"Uploaded final fallback image with hash: {image_hash}")
        
        # Initialize with default store URLs from account configuration
        object_store_url_android = account_details['object_store_url_android']
        object_store_url_ios = account_details['object_store_url_ios'] 
        
        # Get the promoted object data from the AdSet to use the correct object store URLs
        try:
            adset = AdSet(adset_id)
            adset_data = adset.api_get(fields=['promoted_object'])
            
            logging.info(f"Retrieved adset data for emergency fallback: {adset_data}")
            
            # Check if we have a promoted object and get its store URL
            if 'promoted_object' in adset_data and adset_data['promoted_object']:
                promoted_object = adset_data['promoted_object']
                logging.info(f"Using promoted object data from adset: {promoted_object}")
                
                # Get the exact object store URL from the promoted object
                if 'object_store_url' in promoted_object:
                    object_store_url = promoted_object.get('object_store_url')
                    logging.info(f"Using exact object store URL from promoted object: {object_store_url}")
                    
                    # Use the exact URL from the promoted object for all platforms
                    object_store_url_android = object_store_url
                    object_store_url_ios = object_store_url
                    logging.info(f"Using same store URL for all platforms: {object_store_url}")
        except Exception as e:
            logging.warning(f"Could not get promoted object data from adset: {e}")
            # Continue with account_details URLs
        
        # Create ad account object
        ad_account = AdAccount(f'act_{self.ad_account_id}')
        
        # Create with direct API call instead of the object approach to avoid serialization issues
        creative_params = {
            'name': f"Emergency fallback for {ad_data['name']}",
            'object_story_spec': {
                'page_id': page_id,
                'link_data': {
                    'image_hash': image_hash,
                    'link': account_details['link_url'],
                    'message': ad_data.get('headline', 'Download our app'),
                    'call_to_action': {
                        'type': 'DOWNLOAD',
                        'value': {
                            'link': account_details['link_url']
                        }
                    }
                }
            }
        }
            
        # Use the exact URL from the promoted object as link (this is what the AdSet expects)
        creative_params['object_story_spec']['link_data']['link'] = object_store_url_android
        creative_params['object_story_spec']['link_data']['call_to_action']['value']['link'] = object_store_url_android
        logging.info(f"Using promoted object URL as link: {object_store_url_android}")
        
        logging.info(f"Creating emergency fallback creative with params: {creative_params}")
        
        # Create the creative using the API directly 
        creative = ad_account.create_ad_creative(
            params=creative_params
        )
        
        creative_id = creative['id']
        logging.info(f"Created emergency fallback creative with ID: {creative_id}")
        
        # Create the ad
        ad_params = {
            'name': ad_data['name'],
            'adset_id': adset_id,
            'creative': {'creative_id': creative_id},
            'status': 'ACTIVE'  # Set to active instead of paused
        }
        logging.info(f"Creating emergency fallback ad with parameters: {ad_params}")
        
        # Use direct API call
        ad = ad_account.create_ad(
            params=ad_params
        )
        
        created_ad_id = ad['id']
        return {'success': True, 'ad_id': created_ad_id, 'is_fallback': True}

    def _get_page_id_from_adset(self, adset_id):
        """Get the page ID from an existing ad in the adset"""
        try:
            # Normalize the adset_id to ensure it's a pure numeric string
            normalized_adset_id = str(adset_id).strip()
            
            # Extract numeric part if it's in a format like 'adset_123456789_1'
            if 'adset_' in normalized_adset_id:
                numeric_match = re.search(r'(\d+)', normalized_adset_id)
                if numeric_match:
                    normalized_adset_id = numeric_match.group(1)
                    logging.info(f"Extracted numeric adset ID for page lookup: {normalized_adset_id} from {adset_id}")
            
            # If we're trying to get the page ID for a non-numeric adset ID
            # just use the default page ID since it will fail anyway
            if not normalized_adset_id.isdigit():
                logging.warning(f"Non-numeric adset ID provided: {adset_id}, using default page ID")
                return DEFAULT_PAGE_ID
            
            # Get the adset
            adset = AdSet(normalized_adset_id)
            
            # Get ads in the adset - use proper field syntax
            ads = adset.get_ads(fields=['id', 'creative'])
            
            if not ads:
                logging.info(f"No ads found in adset {normalized_adset_id}, using default page ID")
                return DEFAULT_PAGE_ID  # Use the imported config value
            
            # Get the first ad's creative
            first_ad = ads[0]
            
            # Check if creative data is available
            if 'creative' not in first_ad:
                logging.info(f"No creative field found in ad {first_ad['id']}, using default page ID")
                return DEFAULT_PAGE_ID  # Use the imported config value
                
            # The creative field contains the ID
            creative_id = first_ad['creative'].get('id')
            if not creative_id:
                logging.info(f"No creative ID found in ad {first_ad['id']}, using default page ID")
                return DEFAULT_PAGE_ID  # Use the imported config value
                
            # Get the creative object directly
            creative = AdCreative(creative_id).api_get(fields=['object_story_spec'])
            
            if not creative or 'object_story_spec' not in creative:
                logging.info(f"No object_story_spec found in creative {creative_id}, using default page ID")
                return DEFAULT_PAGE_ID  # Use the imported config value
            
            # Extract page ID from the creative
            story_spec = creative['object_story_spec']
            if 'page_id' not in story_spec:
                logging.info(f"No page ID found in creative {creative_id}, using default page ID")
                return DEFAULT_PAGE_ID  # Use the imported config value
            
            page_id = story_spec['page_id']
            logging.info(f"Found page ID {page_id} from adset {normalized_adset_id}")
            return page_id
            
        except Exception as e:
            logging.error(f"Error getting page ID from adset {adset_id}: {str(e)}")
            logging.info(f"Using default page ID as fallback")
            # Always return a valid page ID from the config
            return DEFAULT_PAGE_ID 