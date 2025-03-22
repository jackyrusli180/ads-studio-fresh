"""
Meta Utilities
This file serves as a compatibility shim for old imports.
The actual implementation has been moved to app/services/meta/meta_utils.py.
"""

# Re-export utility functions from their new location
from app.services.meta.meta_utils import (
    download_image_from_url,
    download_video_from_url,
    create_fallback_image
) 