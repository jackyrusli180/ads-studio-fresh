"""
Centralized configuration package for the application.
Provides a single entry point for all configuration settings.
"""
from typing import Dict, Any, Optional
import os
import logging
from dotenv import load_dotenv

# Import configuration modules
from .meta_config import META_ACCOUNTS, get_meta_account_details, get_all_meta_accounts
from .tiktok_config import TIKTOK_ACCOUNTS, get_tiktok_account_details, get_all_tiktok_accounts

# Get the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv(os.path.join(project_root, '.env'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(project_root, 'app.log')),
        logging.StreamHandler()
    ]
)

# Application settings
UPLOAD_FOLDER = os.path.join(project_root, 'static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'avi'}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Secret key for session
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev_key_for_development_only')

# API Credentials
class APICredentials:
    """Container for API credentials with environment variable fallbacks"""
    
    # Meta API credentials
    META_APP_ID = os.environ.get('META_APP_ID', '871288784921611')
    META_APP_SECRET = os.environ.get('META_APP_SECRET', '9f8a7b32623f6a6624051cef37988a75')
    META_ACCESS_TOKEN = os.environ.get('META_ACCESS_TOKEN', 'EAAMYbrqFpAsBO9UyhPMlMZCd97rrxEgDHA6YsGhusX0GBiFI0FmZAiY4ZBeVWGzv5UZA1xQ04ByRSrzkNtmUKamgZBQV8ZCUtAAQqkv8t2vWBaPx6T4Pl0sh88apHl9E1JFJ5ZC3nIcAS8CDiVpikANZATwK05CZBTZBd6XaFp6g5YuO1ZAxvcGvVq9codhA7l8wePzJzuIuPQe')
    META_BUSINESS_ID = os.environ.get('META_BUSINESS_ID', '')
    META_AD_ACCOUNT_ID = os.environ.get('META_AD_ACCOUNT_ID', 'act_599607976078688')
    
    # TikTok API credentials
    TIKTOK_APP_ID = os.environ.get('TIKTOK_APP_ID', 'your_tiktok_app_id')
    TIKTOK_APP_SECRET = os.environ.get('TIKTOK_APP_SECRET', 'your_tiktok_app_secret')
    TIKTOK_ACCESS_TOKEN = os.environ.get('TIKTOK_ACCESS_TOKEN', 'b8586d78d2a3d2ae1b542c1e8c99c0e3c82bdaaf')
    TIKTOK_ADVERTISER_ID = os.environ.get('TIKTOK_ADVERTISER_ID', '7463377308125036561')

# Export credentials as a singleton instance
credentials = APICredentials()

# Convenience functions for account configuration
def get_meta_account(account_id: str) -> Optional[Dict[str, Any]]:
    """Get Meta account configuration by account ID"""
    return get_meta_account_details(account_id)

def get_tiktok_account(advertiser_id: str) -> Optional[Dict[str, Any]]:
    """Get TikTok account configuration by advertiser ID"""
    return get_tiktok_account_details(advertiser_id) 