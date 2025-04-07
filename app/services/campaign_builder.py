"""
Campaign Builder Service
Handles creation of ad campaigns across different platforms
"""
from app.services.meta_service import MetaService
from app.services.tiktok_service import TikTokService

class CampaignBuilder:
    """
    Service for building and managing advertising campaigns across platforms
    """
    
    def __init__(self):
        """Initialize the campaign builder with platform services"""
        self.meta_service = MetaService()
        self.tiktok_service = TikTokService()
    
    def create_campaign(self, platform, account_id, campaign_data):
        """
        Create a campaign on the specified platform
        
        Args:
            platform: The platform to create the campaign on ('meta' or 'tiktok')
            account_id: The advertiser account ID
            campaign_data: Dictionary containing campaign details
            
        Returns:
            Dictionary with campaign ID and status
        """
        if platform == 'meta':
            return self.create_meta_campaign(account_id, campaign_data)
        elif platform == 'tiktok':
            return self.create_tiktok_campaign(account_id, campaign_data)
        else:
            raise ValueError(f"Unsupported platform: {platform}")
    
    def create_meta_campaign(self, account_id, campaign_data):
        """
        Create a campaign on Meta Ads
        
        Args:
            account_id: The Meta ad account ID
            campaign_data: Dictionary containing campaign details
            
        Returns:
            Dictionary with campaign ID and status
        """
        try:
            campaign = self.meta_service.create_campaign(
                account_id=account_id,
                campaign_data=campaign_data
            )
            
            return {
                'success': True,
                'campaign_id': campaign.get('id'),
                'status': campaign.get('status', 'CREATED')
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_tiktok_campaign(self, advertiser_id, campaign_data):
        """
        Create a campaign on TikTok Ads
        
        Args:
            advertiser_id: The TikTok advertiser ID
            campaign_data: Dictionary containing campaign details
            
        Returns:
            Dictionary with campaign ID and status
        """
        try:
            # Initialize TikTok service with advertiser ID
            tiktok_service = TikTokService(advertiser_id=advertiser_id)
            
            campaign = tiktok_service.create_campaign(campaign_data)
            
            return {
                'success': True,
                'campaign_id': campaign.get('campaign_id'),
                'status': campaign.get('status', 'CREATED')
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_ad(self, platform, account_id, ad_data):
        """
        Create an ad on the specified platform
        
        Args:
            platform: The platform to create the ad on ('meta' or 'tiktok')
            account_id: The advertiser account ID
            ad_data: Dictionary containing ad details
            
        Returns:
            Dictionary with ad ID and status
        """
        if platform == 'meta':
            return self.create_meta_ad(account_id, ad_data)
        elif platform == 'tiktok':
            return self.create_tiktok_ad(account_id, ad_data)
        else:
            raise ValueError(f"Unsupported platform: {platform}")
    
    def create_meta_ad(self, account_id, ad_data):
        """
        Create an ad on Meta Ads
        
        Args:
            account_id: The Meta ad account ID
            ad_data: Dictionary containing ad details
            
        Returns:
            Dictionary with ad ID and status
        """
        try:
            # Extract required data
            adset_id = ad_data.get('adset_id')
            name = ad_data.get('name', f"Ad {adset_id}")
            creative_ids = ad_data.get('creative_ids', [])
            
            if not adset_id:
                raise ValueError("Ad set ID is required")
            
            if not creative_ids:
                raise ValueError("At least one creative ID is required")
            
            # Create the ad
            ad = self.meta_service.create_ad(
                account_id=account_id,
                adset_id=adset_id,
                name=name,
                creative_ids=creative_ids
            )
            
            return {
                'success': True,
                'ad_id': ad.get('id'),
                'status': ad.get('status', 'CREATED')
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_tiktok_ad(self, advertiser_id, ad_data):
        """
        Create an ad on TikTok Ads
        
        Args:
            advertiser_id: The TikTok advertiser ID
            ad_data: Dictionary containing ad details
            
        Returns:
            Dictionary with ad ID and status
        """
        try:
            # Initialize TikTok service with advertiser ID
            tiktok_service = TikTokService(advertiser_id=advertiser_id)
            
            # Extract required data
            adgroup_id = ad_data.get('adgroup_id')
            name = ad_data.get('name', f"Ad {adgroup_id}")
            creatives = ad_data.get('creatives', [])
            
            if not adgroup_id:
                raise ValueError("Ad group ID is required")
            
            if not creatives:
                raise ValueError("At least one creative is required")
            
            # Create the ad
            ad = tiktok_service.create_ad(
                adgroup_id=adgroup_id,
                name=name,
                creatives=creatives
            )
            
            return {
                'success': True,
                'ad_id': ad.get('ad_id'),
                'status': ad.get('status', 'CREATED')
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            } 