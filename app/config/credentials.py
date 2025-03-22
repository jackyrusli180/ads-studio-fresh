"""
Centralized credentials configuration.
This module provides a single location for accessing all API credentials.

WARNING: Do not commit real credentials to version control.
This file should be included in .gitignore or use environment variables for production.
"""

import os

# TikTok credentials
TIKTOK_ADVERTISER_ID = "7437092357411225617"  # Default advertiser ID
TIKTOK_APP_ID = "7431435492954128400"  # App ID
TIKTOK_APP_SECRET = os.environ.get('TIKTOK_APP_SECRET', '')  # App Secret

# Meta (Facebook) Credentials
META_APP_ID = "1503153793701868"
META_APP_SECRET = "7e016e3d7f40a4af606e36832e41a1cf"
META_ACCESS_TOKEN = "EAAVXHEPqlZBwBO1x4zX1YcwiVoTIZCiQC2ulrzrC2rP3l805wgMJWVhxdCDGFuaPNAqdK3iRySjKx1MeYHY6z2e1EIiwjUDQSZAeX0jj7KbYsswaDj2ZCB2SMZCEX1zIFpptPqa6w9Lr9DbO70FfqAZAYZCevlAjdIuW6baWI5wCu72UnIN9kKzPBefHj6QI6i0ZAli5mZBXl"
META_BUSINESS_ID = os.environ.get('META_BUSINESS_ID', '')
META_AD_ACCOUNT_ID = os.environ.get('META_AD_ACCOUNT_ID', '') 