"""
TikTok API service package.
Provides a clean interface for interacting with the TikTok Ads API.
"""
from app.services.tiktok.client import TikTokClient
from app.services.tiktok.campaigns import TikTokCampaignsMixin
from app.services.tiktok.adgroups import TikTokAdGroupsMixin
from app.services.tiktok.ads import TikTokAdsMixin
from app.services.tiktok.assets import TikTokAssetsMixin
from app.services.tiktok.apps import TikTokAppsMixin


class TikTokService(
    TikTokClient,
    TikTokCampaignsMixin,
    TikTokAdGroupsMixin,
    TikTokAdsMixin,
    TikTokAssetsMixin,
    TikTokAppsMixin
):
    """
    Combined service for interacting with the TikTok Ads API using the official SDK.
    Includes functionality for campaigns, ad groups, ads, asset uploads, and apps.
    """
    pass  # All functionality is inherited from the mixins 