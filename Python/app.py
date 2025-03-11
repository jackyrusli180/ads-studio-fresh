from flask import Flask, render_template, request, jsonify, session
import os
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import campaign_builder_meta_ios14_SKAN as meta_ios
import campaign_builder_meta_ios_onelink as meta_onelink
import campaign_builder_meta_android as meta_android
import campaign_builder_tiktok_ios14_app_install as tiktok_ios
import campaign_builder_tiktok_android_app_install as tiktok_android
import campaign_builder_tiktok_ios_onelink as tiktok_onelink
import meta_data_fetcher
import tiktok_data_fetcher
import tiktok_account_config
import meta_account_config
import logging
from datetime import datetime, timezone
import traceback
import ad_uploader_existing as ad_uploader
import json
import mimetypes
from flux_api import FluxAPI
import requests
import subprocess
import threading
import sys
import os.path
import time
import re  # Add import for regular expressions

# sys.path.append(os.path.join(os.path.dirname(__file__), 'ComfyUI'))
# import execution
# import nodes
# import comfy.utils
# import runpy
from openai import OpenAI
from base64 import b64encode
from comfy_handler import ComfyUIHandler
from pathlib import Path
from openai_vision import OpenAIVision
import shutil
import uuid
from typing import List, Dict, Optional
from dataclasses import dataclass
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Add TikTok Business API SDK to Python path
sys.path.append("/Users/jackyrusli/Ads Studio/tiktok-business-api-sdk/python_sdk")

# Load environment variables
load_dotenv()

# Get the project root directory
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app = Flask(
    __name__,
    template_folder=os.path.join(project_root, "templates"),
    static_folder=os.path.join(project_root, "static"),
)
app.secret_key = "your_secret_key_here"

# Set upload folder path relative to project root
app.config["UPLOAD_FOLDER"] = os.path.join(project_root, "static", "uploads")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "mp4", "mov", "avi"}
MEDIA_LIBRARY_FILE = os.path.join(project_root, "static", "media_library.json")
AIGC_HISTORY_FILE = os.path.join(project_root, "static", "aigc_history.json")

# Create necessary directories
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(os.path.dirname(MEDIA_LIBRARY_FILE), exist_ok=True)
os.makedirs(os.path.dirname(AIGC_HISTORY_FILE), exist_ok=True)

# Create the branded images directory
BRANDED_IMAGES_DIR = os.path.join(project_root, "static", "branded_images")
os.makedirs(BRANDED_IMAGES_DIR, exist_ok=True)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()],
)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/aigc/ai_image")
def aigc_ai_image():
    # Check if we're regenerating an image
    regenerate_id = request.args.get("regenerate")
    regeneration_data = None

    if regenerate_id:
        # Look up the asset details for regeneration
        assets = get_media_library()
        asset = next((a for a in assets if a.get("id") == regenerate_id), None)

        if asset:
            regeneration_data = {
                "id": asset.get("id"),
                "name": asset.get("name"),
                "prompt": asset.get("original_prompt", ""),
                "file_path": asset.get("file_path"),
            }

    return render_template("aigc/ai_image.html", regeneration_data=regeneration_data)


@app.route("/aigc/ai_video")
def aigc_ai_video():
    # Use our new template instead of the error page
    return render_template("aigc/ai_video.html")


@app.route("/ads_builder", methods=["GET", "POST"])
def ads_builder():
    # Get selected asset IDs from form if it's a POST request
    selected_assets = []
    if request.method == "POST":
        asset_ids = request.form.getlist("selected_assets[]")
        print(f"Received {len(asset_ids)} selected assets: {asset_ids}")

        # Get asset details for each ID
        assets = get_media_library()
        selected_assets = [a for a in assets if a.get("id") in asset_ids]

    # Get TikTok advertiser accounts for dropdown
    tiktok_accounts = tiktok_account_config.get_all_accounts()

    # Get Meta advertiser accounts for dropdown
    meta_accounts = meta_account_config.get_all_accounts()

    return render_template(
        "ads_builder/index.html",
        selected_assets=selected_assets,
        tiktok_accounts=tiktok_accounts,
        meta_accounts=meta_accounts,
    )


@app.route("/automated-rules")
def automated_rules():
    return render_template("ads_manager/automated_rules.html")


@app.route("/templates/comfy")
def templates_comfy():
    error = None
    debug_info = {
        "comfy_path": COMFYUI_PATH,
        "custom_nodes_path": CUSTOM_NODES_PATH,
        "python_path": sys.executable,
    }

    # Create ComfyUIHandler at the beginning
    comfy_handler = ComfyUIHandler()
    comfy_port = comfy_handler.port

    try:
        # Ensure ComfyUI is properly setup
        if not setup_comfyui():
            raise Exception("Failed to setup ComfyUI")

        # Initialize ComfyUI handler
        if not comfy_handler.initialize():
            raise Exception("Failed to initialize ComfyUI handler")

        # Start the server if it's not already running
        if not comfy_handler.running:
            comfy_handler.start_server()

    except Exception as e:
        error = str(e)
        logging.error(f"Error initializing ComfyUI: {error}")

    return render_template(
        "templates/comfy.html", error=error, **debug_info, comfy_port=comfy_port
    )


@app.route("/api/create_campaign", methods=["POST"])
def create_campaign():
    """API endpoint to create a new campaign"""
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        form_data = request.form

        # Debug: Print all form key/value pairs to understand structure
        logging.info("Form data structure:")
        for key, value in form_data.items():
            logging.info(f"Key: {key}, Value: {value}")

        # For library assets, we need to get the file paths from the media
        # library
        library_assets = []

        # Get operation type and platforms
        operation_type = form_data.get("operationType")
        platforms = request.form.getlist("platforms")
        template = form_data.get("template")

        # Get TikTok advertiser ID if provided
        tiktok_advertiser_id = form_data.get("tiktokAdvertiserId")

        # Get Meta advertiser ID if provided
        meta_advertiser_id = form_data.get("metaAdvertiserId")

        logging.info(
            f"Processing request - Platform: {platforms}, Type: {template}, Operation: {operation_type}, TikTok Advertiser ID: {tiktok_advertiser_id}, Meta Advertiser ID: {meta_advertiser_id}"
        )

        # Get media assets - check both for direct uploads and library assets
        uploaded_files = request.files.getlist("creatives[]")
        library_asset_ids = request.form.getlist("library_assets[]")

        # Get asset details from the media library if library assets were
        # selected
        if library_asset_ids:
            media_library = get_media_library()
            library_assets = [
                asset for asset in media_library if asset.get("id") in library_asset_ids
            ]
            logging.info(f"Found {len(library_assets)} assets from library")

        # If we have neither uploads nor library assets, fail
        if not uploaded_files and not library_assets:
            raise ValueError("No images uploaded or selected from library")

        # Process assets and create campaigns
        results = {}

        # For each selected platform
        for platform in platforms:
            result = {
                "success": False,
                "campaign_id": None,
                "adset_id": None,
                "ad_id": None,
                "errors": [],
            }

            try:
                # Handle Meta campaigns
                if platform == "meta":
                    # Check if advertiser ID is provided
                    if not meta_advertiser_id:
                        raise ValueError(
                            "Meta Advertiser Account is required for Meta campaigns"
                        )

                    # Get account details for the selected advertiser ID
                    account_details = meta_account_config.get_account_details(
                        meta_advertiser_id
                    )
                    if not account_details:
                        raise ValueError(
                            f"Invalid Meta Advertiser Account ID: {meta_advertiser_id}"
                        )

                    # Log account details for debugging
                    logging.info(
                        f"Using Meta account: {account_details['name']} (ID: {meta_advertiser_id})"
                    )

                    # Determine which Meta template to use
                    if template == "ios_skan":
                        builder = meta_ios
                    elif template == "ios_onelink":
                        builder = meta_onelink
                    else:  # android
                        builder = meta_android

                    # Initialize API with the selected account ID
                    ad_account = builder.initialize_api(meta_advertiser_id)

                    # Get campaign settings
                    if len(platforms) > 1 and operation_type == "3":
                        # Multiple platforms - use platform-specific fields
                        campaign_name = form_data.get("metaCampaignName")
                    else:
                        # Single platform - use generic fields
                        campaign_name = form_data.get("campaignName")

                    # Handle library assets - get file paths
                    image_paths = []
                    for asset in library_assets:
                        if asset["type"] == "image":
                            # Get the file path
                            file_path = asset["file_path"]
                            logging.info(f"Original file_path from asset: {file_path}")

                            # Fix path construction based on file_path format
                            if file_path.startswith("/static/"):
                                # Already starts with /static/ - just append to
                                # project_root
                                full_path = os.path.join(project_root, file_path[1:])
                            elif file_path.startswith("static/"):
                                # Already contains static/ prefix - just append
                                # to project_root
                                full_path = os.path.join(project_root, file_path)
                            elif os.path.isabs(file_path):
                                # Absolute path - use as is
                                full_path = file_path
                            else:
                                # Relative path without static/ prefix - add it
                                full_path = os.path.join(
                                    project_root, "static", file_path
                                )

                            logging.info(f"Using image path: {full_path}")
                            # Make sure the file exists
                            if not os.path.exists(full_path):
                                logging.error(f"Image file not found: {full_path}")
                                raise ValueError(f"Image file not found: {full_path}")
                            image_paths.append(full_path)

                    # Upload images to Meta
                    media_infos = []
                    for path in image_paths:
                        logging.info(f"Uploading image to Meta: {path}")
                        try:
                            if template == "ios_onelink":
                                # For iOS Onelink, use upload_media
                                media_info = builder.upload_media(ad_account, path)
                                media_infos.append(media_info)
                            else:
                                # For other templates, use upload_image
                                image_hash = builder.upload_image(ad_account, path)
                                media_infos.append(
                                    {"hash": image_hash, "type": "image"}
                                )
                        except Exception as e:
                            logging.error(f"Error uploading image {path}: {str(e)}")
                            raise

                    if not media_infos:
                        logging.error("No images were successfully uploaded to Meta")
                        raise ValueError("Failed to upload any images to Meta")

                    # Create campaign, adset, and ad based on operation type
                    if operation_type == "3":  # New campaign, adset, ad
                        # Create campaign
                        campaign_id = builder.create_campaign(ad_account, campaign_name)
                        logging.info(f"Meta campaign created with ID: {campaign_id}")
                        result["campaign_id"] = campaign_id

                        # Get adgroup data
                        adgroup_names = {}
                        ad_names = {}
                        adgroup_budgets = {}
                        asset_assignments = {}
                        landing_page_urls = {}  # Add dictionary for landing page URLs
                        ad_landing_page_urls = (
                            {}
                        )  # Add dictionary for ad-level landing page URLs

                        # Parse adgroup names and budgets from form data
                        for key, value in form_data.items():
                            if key.startswith("adgroup_names["):
                                # Extract ID from adgroup_names[adgroup-1]
                                match = re.search(r"\[(.*?)\]", key)
                                if match:
                                    adgroup_id = match.group(1)
                                    adgroup_names[adgroup_id] = value
                            elif key.startswith("adgroup_budgets["):
                                # Extract ID from adgroup_budgets[adgroup-1]
                                match = re.search(r"\[(.*?)\]", key)
                                if match:
                                    adgroup_id = match.group(1)
                                    adgroup_budgets[adgroup_id] = value
                            elif key.startswith("landing_page_urls["):
                                # Extract ID from landing_page_urls[adgroup-1]
                                match = re.search(r"\[(.*?)\]", key)
                                if match:
                                    adgroup_id = match.group(1)
                                    landing_page_urls[adgroup_id] = value
                            elif key.startswith("ad_landing_page_urls["):
                                # Extract ID from ad_landing_page_urls[adgroup-1-ad-1]
                                match = re.search(r"\[(.*?)\]", key)
                                if match:
                                    ad_id = match.group(1)
                                    ad_landing_page_urls[ad_id] = value

                        # Parse ad names from form data
                        for key, value in form_data.items():
                            if key.startswith("ad_names["):
                                # Extract ID from ad_names[adgroup-1-ad-1]
                                match = re.search(r"\[(.*?)\]", key)
                                if match:
                                    ad_id = match.group(1)
                                    ad_names[ad_id] = value

                        # Parse asset assignments for each ad
                        for key, values in form_data.lists():
                            if key.startswith("asset_assignments["):
                                # Extract ID from asset_assignments[adgroup-1-ad-1][]
                                match = re.search(r"\[(.*?)\]", key)
                                if match:
                                    ad_id = match.group(1)
                                    asset_assignments[ad_id] = values

                        # Log parsed data
                        logging.info(f"Parsed adgroup names: {adgroup_names}")
                        logging.info(f"Parsed ad names: {ad_names}")
                        logging.info(f"Parsed adgroup budgets: {adgroup_budgets}")
                        logging.info(f"Parsed asset assignments: {asset_assignments}")
                        logging.info(f"Parsed landing page URLs: {landing_page_urls}")
                        logging.info(
                            f"Parsed ad-level landing page URLs: {ad_landing_page_urls}"
                        )

                        # Create a dictionary to map asset IDs to media infos
                        asset_id_to_media_info = {}

                        # Map asset IDs to media infos
                        for i, asset in enumerate(library_assets):
                            if i < len(media_infos):
                                asset_id_to_media_info[asset["id"]] = media_infos[i]

                        logging.info(
                            f"Asset ID to media info mapping: {asset_id_to_media_info}"
                        )

                        # Create adsets and ads for each adgroup
                        adset_ids = []
                        ad_ids = []

                        # Group ads by adgroup
                        ads_by_adgroup = {}
                        for ad_id, assets in asset_assignments.items():
                            # Extract adgroup ID from ad ID (format: adgroup-1-ad-1)
                            adgroup_id = ad_id.split("-ad-")[0]
                            if adgroup_id not in ads_by_adgroup:
                                ads_by_adgroup[adgroup_id] = []

                            ads_by_adgroup[adgroup_id].append(
                                {
                                    "ad_id": ad_id,
                                    "ad_name": ad_names.get(
                                        ad_id, f"Ad {len(ad_ids) + 1}"
                                    ),
                                    "assets": assets,
                                }
                            )

                        logging.info(f"Ads grouped by adgroup: {ads_by_adgroup}")

                        try:
                            for adgroup_id, ads in ads_by_adgroup.items():
                                if not ads:
                                    continue

                                # Get adgroup name and budget
                                adgroup_name = adgroup_names.get(
                                    adgroup_id, f"Ad Group {len(adset_ids) + 1}"
                                )

                                # Convert budget to cents (Meta expects budget in cents)
                                try:
                                    budget = (
                                        float(adgroup_budgets.get(adgroup_id, "500"))
                                        * 100
                                    )  # Convert to cents
                                except ValueError:
                                    budget = (
                                        50000  # Default to $500 if conversion fails
                                    )

                                logging.info(
                                    f"Creating adset '{adgroup_name}' with budget {budget} cents"
                                )

                                try:
                                    # Get country selection
                                    country_name = request.form.get(
                                        f"adgroup_countries[{adgroup_id}]"
                                    )

                                    # Country code mapping
                                    country_mapping = {
                                        "United States": {"meta": "US", "tiktok": "7"},
                                        "Turkey": {"meta": "TR", "tiktok": "298795"},
                                        "Brazil": {"meta": "BR", "tiktok": "31"},
                                        "United Arab Emirates": {
                                            "meta": "AE",
                                            "tiktok": "298796",
                                        },
                                        "Australia": {"meta": "AU", "tiktok": "12"},
                                        "Netherlands": {"meta": "NL", "tiktok": "178"},
                                        "Vietnam": {"meta": "VN", "tiktok": "306"},
                                        "Argentina": {"meta": "AR", "tiktok": "10"},
                                    }

                                    # Get the appropriate country code based on platform
                                    country_code = None
                                    if country_name in country_mapping:
                                        if platform == "meta":
                                            country_code = country_mapping[
                                                country_name
                                            ]["meta"]
                                        elif platform == "tiktok":
                                            country_code = country_mapping[
                                                country_name
                                            ]["tiktok"]

                                    logging.info(
                                        f"Creating adset with name: {adgroup_name}, budget: {budget}, country: {country_code}"
                                    )

                                    # Create adset with the specified name and budget
                                    if template == "ios_skan":
                                        created_adgroup_id = builder.create_adset(
                                            ad_account,
                                            campaign_id,
                                            name=adgroup_name,
                                            budget=budget,
                                            country=country_code,
                                        )
                                    elif template == "ios_onelink":
                                        created_adgroup_id = builder.create_adset(
                                            ad_account,
                                            campaign_id,
                                            adset_name=adgroup_name,
                                            budget=adgroup_budget,
                                            country=country_code,
                                        )
                                    else:  # android
                                        if platform == "meta":
                                            created_adgroup_id = builder.create_adset(
                                                ad_account,
                                                campaign_id,
                                                adset_name=adgroup_name,
                                                budget=budget,
                                                country=country_code,
                                            )
                                        else:  # tiktok
                                            created_adgroup_id = builder.create_adgroup_for_ios14_app_install(
                                                apis,
                                                advertiser_id,
                                                campaign_id,
                                                adgroup_budget,
                                                adgroup_name,
                                                country=country_code,
                                            )

                                    logging.info(
                                        f"Adset created with ID: {created_adgroup_id}"
                                    )
                                    adset_ids.append(created_adgroup_id)

                                    # Create ads for this adgroup
                                    for ad_info in ads:
                                        ad_id = ad_info["ad_id"]
                                        ad_name = ad_info["ad_name"]
                                        assigned_assets = ad_info["assets"]

                                        if not assigned_assets:
                                            logging.warning(
                                                f"No assets assigned to ad {ad_id}, skipping"
                                            )
                                            continue

                                        try:
                                            # Collect all media info for assigned assets
                                            adgroup_media_infos = []
                                            adgroup_image_hashes = []

                                            for asset_id in assigned_assets:
                                                if asset_id in asset_id_to_media_info:
                                                    media_info = asset_id_to_media_info[
                                                        asset_id
                                                    ]
                                                    adgroup_media_infos.append(
                                                        media_info
                                                    )

                                                    # Extract image hash for non-onelink templates
                                                    if (
                                                        template != "ios_onelink"
                                                        and "hash" in media_info
                                                    ):
                                                        adgroup_image_hashes.append(
                                                            media_info["hash"]
                                                        )

                                            if adgroup_media_infos:
                                                try:
                                                    # Create ad
                                                    if template == "ios_onelink":
                                                        # For iOS Onelink, pass all media_infos directly
                                                        logging.info(
                                                            f"Creating Meta ad with multiple media infos for iOS Onelink"
                                                        )

                                                        # First check for ad-level landing page URL
                                                        custom_link_url = (
                                                            ad_landing_page_urls.get(
                                                                ad_id
                                                            )
                                                        )
                                                        logging.info(
                                                            f"Looking for ad-level landing page URL with key '{ad_id}'"
                                                        )
                                                        logging.info(
                                                            f"Available ad-level landing page URL keys: {list(ad_landing_page_urls.keys())}"
                                                        )

                                                        # If not found, fall back to adgroup-level landing page URL
                                                        if not custom_link_url:
                                                            adgroup_id = ad_id.split(
                                                                "-ad-"
                                                            )[0]
                                                            custom_link_url = (
                                                                landing_page_urls.get(
                                                                    adgroup_id
                                                                )
                                                            )
                                                            if custom_link_url:
                                                                logging.info(
                                                                    f"Using adgroup-level landing page URL for ad {ad_id}: {custom_link_url}"
                                                                )
                                                            else:
                                                                logging.info(
                                                                    f"No landing page URL found for ad {ad_id}"
                                                                )

                                                        # Create ad with multiple media infos
                                                        ad_id = builder.create_ad(
                                                            ad_account,
                                                            created_adgroup_id,  # Use created_adgroup_id instead of adset_id
                                                            adgroup_media_infos,
                                                            ad_name,
                                                            custom_link_url,
                                                        )
                                                    else:
                                                        # For other templates, pass all image hashes if available, otherwise just the first one
                                                        if (
                                                            template == "android"
                                                            and len(
                                                                adgroup_image_hashes
                                                            )
                                                            > 0
                                                        ):
                                                            logging.info(
                                                                f"Creating Meta ad with multiple image hashes: {adgroup_image_hashes}"
                                                            )
                                                            # Make sure we have at least 2 images for Flexible Ad Format
                                                            if (
                                                                len(
                                                                    adgroup_image_hashes
                                                                )
                                                                >= 2
                                                            ):
                                                                ad_id = builder.create_ad(
                                                                    ad_account,
                                                                    created_adgroup_id,
                                                                    adgroup_image_hashes,
                                                                    ad_name,
                                                                )
                                                            else:
                                                                # If we only have one image, duplicate it to ensure we have at least 2 images
                                                                # This is required for Flexible Ad Format
                                                                logging.info(
                                                                    f"Only one image hash available, duplicating it for Flexible Ad Format"
                                                                )
                                                                ad_id = builder.create_ad(
                                                                    ad_account,
                                                                    created_adgroup_id,
                                                                    adgroup_image_hashes
                                                                    * 2,
                                                                    ad_name,
                                                                )
                                                        else:
                                                            # Fallback to first image hash for other templates or if no hashes available
                                                            logging.info(
                                                                f"Creating Meta ad with single image hash: {adgroup_media_infos[0]['hash']}"
                                                            )
                                                            ad_id = builder.create_ad(
                                                                ad_account,
                                                                created_adgroup_id,
                                                                adgroup_media_infos[0][
                                                                    "hash"
                                                                ],
                                                                ad_name,
                                                            )

                                                    logging.info(
                                                        f"Meta ad created with ID: {ad_id}"
                                                    )
                                                    ad_ids.append(ad_id)
                                                except Exception as e:
                                                    logging.error(
                                                        f"Error creating ad {ad_name}: {str(e)}"
                                                    )
                                                    result["errors"].append(
                                                        f"Error creating ad {ad_name}: {str(e)}"
                                                    )
                                            else:
                                                logging.error(
                                                    f"No media info found for any assigned assets in ad {ad_id}"
                                                )
                                        except Exception as e:
                                            logging.error(
                                                f"Error processing assets for ad {ad_name}: {str(e)}"
                                            )
                                            result["errors"].append(
                                                f"Error processing assets for ad {ad_name}: {str(e)}"
                                            )
                                except Exception as e:
                                    logging.error(
                                        f"Error creating adset {adgroup_name}: {str(e)}"
                                    )
                                    result["errors"].append(
                                        f"Error creating adset {adgroup_name}: {str(e)}"
                                    )
                        except Exception as e:
                            logging.error(f"Error creating adsets and ads: {str(e)}")
                            result["errors"].append(
                                f"Error creating adsets and ads: {str(e)}"
                            )
                            continue

                        # Update result with the created IDs
                        if adset_ids:
                            result["adset_id"] = adset_ids[
                                0
                            ]  # Use the first adset ID for backward compatibility
                        if ad_ids:
                            result["ad_id"] = ad_ids[
                                0
                            ]  # Use the first ad ID for backward compatibility
                        result["success"] = True

                        # Add all adset and ad IDs to the result
                        result["adset_ids"] = adset_ids
                        result["ad_ids"] = ad_ids
                    else:
                        # Handle other operation types (1 and 2)
                        logging.error(
                            f"Operation type {operation_type} not yet implemented for Meta"
                        )
                        raise ValueError(
                            f"Operation type {operation_type} not yet implemented for Meta"
                        )

                # Handle TikTok campaigns
                elif platform == "tiktok":
                    # Check if advertiser ID is provided
                    if not tiktok_advertiser_id:
                        raise ValueError(
                            "TikTok Advertiser Account is required for TikTok campaigns"
                        )

                    # Get account details for the selected advertiser ID
                    account_details = tiktok_account_config.get_account_details(
                        tiktok_advertiser_id
                    )
                    if not account_details:
                        raise ValueError(
                            f"Invalid TikTok Advertiser Account ID: {tiktok_advertiser_id}"
                        )

                    # Log account details for debugging
                    logging.info(
                        f"Using TikTok account: {account_details['name']} (ID: {tiktok_advertiser_id})"
                    )

                    # Determine which TikTok template to use
                    if template == "ios_skan":
                        builder = tiktok_ios
                    elif template == "ios_onelink":
                        builder = tiktok_onelink
                    else:  # android
                        builder = tiktok_android

                    # Initialize API
                    apis = builder.initialize_api()
                    advertiser_id = (
                        tiktok_advertiser_id  # Use the selected advertiser ID
                    )

                    # Get campaign settings for TikTok
                    if len(platforms) > 1 and operation_type == "3":
                        # Multiple platforms - use platform-specific fields
                        campaign_name = form_data.get("tiktokCampaignName")
                    else:
                        # Single platform - use generic fields
                        campaign_name = form_data.get("campaignName")

                    # Handle library assets - get file paths (similar to Meta
                    # implementation)
                    image_paths = []
                    for asset in library_assets:
                        if asset["type"] == "image":
                            # Get the file path
                            file_path = asset["file_path"]
                            logging.info(f"Original file_path from asset: {file_path}")

                            # Fix path construction based on file_path format
                            if file_path.startswith("/static/"):
                                # Already starts with /static/ - just append to
                                # project_root
                                full_path = os.path.join(project_root, file_path[1:])
                            elif file_path.startswith("static/"):
                                # Already contains static/ prefix - just append
                                # to project_root
                                full_path = os.path.join(project_root, file_path)
                            elif os.path.isabs(file_path):
                                # Absolute path - use as is
                                full_path = file_path
                            else:
                                # Relative path without static/ prefix - add it
                                full_path = os.path.join(
                                    project_root, "static", file_path
                                )

                            logging.info(f"Constructed full path: {full_path}")

                            # Check if file exists
                            if not os.path.exists(full_path):
                                # Try alternative path constructions if the
                                # file wasn't found
                                alt_paths = [
                                    os.path.join(project_root, file_path),
                                    file_path,
                                    os.path.join(
                                        project_root,
                                        "static",
                                        os.path.basename(file_path),
                                    ),
                                    os.path.join(
                                        project_root, os.path.basename(file_path)
                                    ),
                                ]

                                found = False
                                for alt_path in alt_paths:
                                    logging.info(f"Trying alternative path: {alt_path}")
                                    if os.path.exists(alt_path):
                                        full_path = alt_path
                                        found = True
                                        logging.info(
                                            f"Found file at alternative path: {full_path}"
                                        )
                                        break

                                if not found:
                                    logging.error(
                                        f"Image file not found at any attempted path: {file_path}"
                                    )
                                    logging.error(
                                        f"Attempted paths: {
        [full_path] + alt_paths}"
                                    )
                                    continue  # Skip this asset instead of failing the whole operation

                            image_paths.append(full_path)
                            logging.info(f"Added image path to list: {full_path}")

                    if not image_paths:
                        logging.error(
                            "No valid image paths found for TikTok campaign creation"
                        )
                        raise ValueError(
                            "No valid images could be found. Please check the selected assets and try again."
                        )

                    # Create TikTok campaign using the builder
                    logging.info(f"Creating TikTok campaign: {campaign_name}")

                    try:
                        logging.info("Initializing TikTok campaign creation")
                        if operation_type == "3":  # New campaign, adgroup, ad
                            if not image_paths:
                                logging.error(
                                    "No valid image paths found for TikTok ad creation"
                                )
                                raise ValueError(
                                    "No valid images selected. Please select at least one image from the Asset Library."
                                )

                            # Call the appropriate campaign creation function
                            # based on template
                            if template == "ios_skan":
                                logging.info(
                                    f"Calling create_ios14_app_install_campaign with args: apis, advertiser_id={advertiser_id}, name={campaign_name}"
                                )
                                campaign_id = builder.create_ios14_app_install_campaign(
                                    apis, advertiser_id, campaign_name
                                )
                            elif template == "ios_onelink":
                                logging.info(
                                    f"Calling create_campaign with args: apis, advertiser_id={advertiser_id}, name={campaign_name}"
                                )
                                campaign_id = builder.create_campaign(
                                    apis, advertiser_id, campaign_name
                                )
                            else:  # android
                                logging.info(
                                    f"Calling create_android_app_install_campaign with args: apis, advertiser_id={advertiser_id}, name={campaign_name}"
                                )
                                campaign_id = (
                                    builder.create_android_app_install_campaign(
                                        apis, advertiser_id, campaign_name
                                    )
                                )

                            logging.info(f"Campaign created with ID: {campaign_id}")

                            # Get adgroup data
                            adgroup_names = {}
                            ad_names = {}
                            adgroup_budgets = {}
                            asset_assignments = {}
                            landing_page_urls = {}
                            ad_landing_page_urls = {}

                            # Parse adgroup names and budgets from form data
                            for key, value in form_data.items():
                                if key.startswith("adgroup_names["):
                                    # Extract ID from adgroup_names[adgroup-1]
                                    match = re.search(r"\[(.*?)\]", key)
                                    if match:
                                        adgroup_id = match.group(1)
                                    adgroup_names[adgroup_id] = value
                                elif key.startswith("ad_names["):
                                    # Extract ID from ad_names[adgroup-1]
                                    match = re.search(r"\[(.*?)\]", key)
                                    if match:
                                        ad_id = match.group(1)
                                        ad_names[ad_id] = value
                                elif key.startswith("adgroup_budgets["):
                                    # Extract ID from
                                    # adgroup_budgets[adgroup-1]
                                    match = re.search(r"\[(.*?)\]", key)
                                    if match:
                                        adgroup_id = match.group(1)
                                    adgroup_budgets[adgroup_id] = value
                                elif key.startswith("landing_page_urls["):
                                    # Extract ID from landing_page_urls[adgroup-1]
                                    match = re.search(r"\[(.*?)\]", key)
                                    if match:
                                        adgroup_id = match.group(1)
                                        landing_page_urls[adgroup_id] = value
                                elif key.startswith("ad_landing_page_urls["):
                                    # Extract ID from ad_landing_page_urls[adgroup-1-ad-1]
                                    match = re.search(r"\[(.*?)\]", key)
                                    if match:
                                        ad_id = match.group(1)
                                        ad_landing_page_urls[ad_id] = value

                            # Parse asset assignments
                            for key, values in form_data.lists():
                                if key.startswith("asset_assignments["):
                                    # Fix: Make sure we extract the correct
                                    # adgroup ID without any trailing brackets
                                    # Extract ID from
                                    # asset_assignments[adgroup-1][]
                                    match = re.search(r"\[(.*?)\]", key)
                                    if match:
                                        ad_id = match.group(1)
                                        asset_assignments[ad_id] = values

                            # Add detailed logging of parsed data
                            logging.info(f"Parsed adgroup names: {adgroup_names}")
                            logging.info(f"Parsed ad names: {ad_names}")
                            logging.info(f"Parsed adgroup budgets: {adgroup_budgets}")
                            logging.info(
                                f"Parsed asset assignments: {asset_assignments}"
                            )
                            logging.info(
                                f"Parsed landing page URLs: {landing_page_urls}"
                            )
                            logging.info(
                                f"Parsed ad-level landing page URLs: {ad_landing_page_urls}"
                            )

                            # Log the raw form data for landing page URLs
                            landing_page_url_keys = [
                                k
                                for k in form_data.keys()
                                if k.startswith("landing_page_urls[")
                            ]
                            logging.info(
                                f"Raw landing page URL keys: {landing_page_url_keys}"
                            )
                            for key in landing_page_url_keys:
                                logging.info(
                                    f"Raw landing page URL: key='{key}', value='{form_data.get(key)}'"
                                )

                            # If we have adgroup assignments, create multiple
                            # adgroups and ads
                            if asset_assignments:
                                logging.info(
                                    f"Creating {
        len(asset_assignments)} adgroups based on user assignments"
                                )

                                result_adgroups = []
                                result_ads = []

                                # Create a dictionary to map asset IDs to file
                                # paths
                                asset_id_to_path = {}

                                # Get all assets from the media library to map
                                # IDs to file paths
                                media_library = get_media_library()
                                for asset in media_library:
                                    if "id" in asset and "file_path" in asset:
                                        asset_id_to_path[asset["id"]] = os.path.join(
                                            project_root, asset["file_path"].lstrip("/")
                                        )

                                logging.info(
                                    f"Built asset ID to path map with {
        len(asset_id_to_path)} entries"
                                )

                                # Create each adgroup and its ads
                                for (
                                    adgroup_id,
                                    assigned_assets,
                                ) in asset_assignments.items():
                                    if not assigned_assets:
                                        continue

                                    # Extract the parent adgroup ID from the ad ID (format: adgroup-1-ad-1)
                                    parent_adgroup_id = adgroup_id.split("-ad-")[0]

                                    # Skip if we've already processed this adgroup
                                    if parent_adgroup_id in [
                                        ag["id"]
                                        for ag in result_adgroups
                                        if isinstance(ag, dict) and "id" in ag
                                    ]:
                                        logging.info(
                                            f"Skipping duplicate adgroup creation for {parent_adgroup_id}, already processed"
                                        )
                                        continue

                                    # Use custom adgroup budget or default
                                    try:
                                        # Fix: Use parent_adgroup_id for consistent lookup
                                        logging.info(
                                            f"Checking budget for adgroup ID: '{parent_adgroup_id}', available budget keys: {list(adgroup_budgets.keys())}"
                                        )

                                        if parent_adgroup_id in adgroup_budgets:
                                            # Use the specific budget for this adgroup
                                            adgroup_budget_value = adgroup_budgets[
                                                parent_adgroup_id
                                            ]
                                            adgroup_budget = float(adgroup_budget_value)
                                            logging.info(
                                                f"Using adgroup-specific budget: {adgroup_budget} for adgroup {parent_adgroup_id}"
                                            )
                                        else:
                                            # No specific budget, use default
                                            adgroup_budget = 500.00
                                            logging.info(
                                                f"No budget specified for adgroup {parent_adgroup_id}, using default: {adgroup_budget}"
                                            )
                                    except (ValueError, TypeError) as e:
                                        logging.error(
                                            f"Invalid budget value for adgroup {parent_adgroup_id}: {e}, using default 500.00"
                                        )
                                        adgroup_budget = 500.00

                                    # Use custom adgroup name or default
                                    adgroup_name = adgroup_names.get(
                                        parent_adgroup_id,
                                        f"Ad Group {len(result_adgroups) + 1}",
                                    )
                                    logging.info(
                                        f"Creating adgroup '{adgroup_name}' with budget {adgroup_budget}"
                                    )

                                    # Get country for this adgroup
                                    country_code = None
                                    country_name = request.form.get(
                                        f"adgroup_countries[{parent_adgroup_id}]"
                                    )

                                    # Country code mapping
                                    country_mapping = {
                                        "United States": {"meta": "US", "tiktok": "7"},
                                        "Turkey": {"meta": "TR", "tiktok": "298795"},
                                        "Brazil": {"meta": "BR", "tiktok": "31"},
                                        "United Arab Emirates": {
                                            "meta": "AE",
                                            "tiktok": "298796",
                                        },
                                        "Australia": {"meta": "AU", "tiktok": "12"},
                                        "Netherlands": {"meta": "NL", "tiktok": "178"},
                                        "Vietnam": {"meta": "VN", "tiktok": "306"},
                                        "Argentina": {"meta": "AR", "tiktok": "10"},
                                    }

                                    # Get the appropriate country code based on platform
                                    if country_name and country_name in country_mapping:
                                        if platform == "meta":
                                            country_code = country_mapping[
                                                country_name
                                            ]["meta"]
                                        elif platform == "tiktok":
                                            country_code = country_mapping[
                                                country_name
                                            ]["tiktok"]

                                    logging.info(
                                        f"Using country code {country_code} for adgroup {adgroup_name}"
                                    )

                                    # Call the appropriate adgroup creation function based on template
                                    if template == "ios_skan":
                                        if platform == "meta":
                                            created_adgroup_id = builder.create_adset(
                                                ad_account,
                                                campaign_id,
                                                name=adgroup_name,
                                                budget=adgroup_budget,
                                                country=country_code,
                                            )
                                        else:  # tiktok
                                            created_adgroup_id = builder.create_adgroup_for_ios14_app_install(
                                                apis,
                                                advertiser_id,
                                                campaign_id,
                                                adgroup_budget,
                                                adgroup_name,
                                                country=country_code,
                                            )
                                    elif template == "ios_onelink":
                                        created_adgroup_id = builder.create_adset(
                                            ad_account,
                                            campaign_id,
                                            adset_name=adgroup_name,
                                            budget=adgroup_budget,
                                            country=country_code,
                                        )
                                    else:  # android
                                        if platform == "meta":
                                            created_adgroup_id = builder.create_adset(
                                                ad_account,
                                                campaign_id,
                                                adset_name=adgroup_name,
                                                budget=budget,
                                                country=country_code,
                                            )
                                        else:  # tiktok
                                            created_adgroup_id = builder.create_adgroup_for_android_app_install(
                                                apis,
                                                advertiser_id,
                                                campaign_id,
                                                budget=budget,
                                                adgroup_name=adgroup_name,
                                                country=country_code,
                                            )

                                    logging.info(
                                        f"Adgroup created with ID: {created_adgroup_id}"
                                    )
                                    # Store adgroup info with its ID for later reference
                                    result_adgroups.append(
                                        {
                                            "id": parent_adgroup_id,
                                            "tiktok_id": created_adgroup_id,
                                        }
                                    )

                                    # Now find all ads that belong to this adgroup and create them
                                    ads_for_this_adgroup = []
                                    for ad_id, assets in asset_assignments.items():
                                        if ad_id.split("-ad-")[0] == parent_adgroup_id:
                                            ads_for_this_adgroup.append(
                                                {
                                                    "ad_id": ad_id,
                                                    "assets": assets,
                                                    "ad_name": ad_names.get(
                                                        ad_id,
                                                        f"Ad {len(result_ads) + 1}",
                                                    ),
                                                }
                                            )

                                    logging.info(
                                        f"Found {len(ads_for_this_adgroup)} ads for adgroup {parent_adgroup_id}"
                                    )

                                    # Process each ad in this adgroup
                                    for ad_info in ads_for_this_adgroup:
                                        ad_id = ad_info["ad_id"]
                                        ad_assets = ad_info["assets"]
                                        ad_name = ad_info["ad_name"]

                                        if not ad_assets:
                                            logging.warning(
                                                f"No assets assigned to ad {ad_id}, skipping"
                                            )
                                            continue

                                        # Get assets for this ad
                                        ad_asset_paths = []
                                    processed_asset_ids = (
                                        set()
                                    )  # Track already processed assets

                                    for asset_id in ad_assets:
                                        # Skip duplicates
                                        if asset_id in processed_asset_ids:
                                            logging.info(
                                                f"Skipping duplicate asset ID: {asset_id}"
                                            )
                                            continue

                                        processed_asset_ids.add(asset_id)

                                        if asset_id in asset_id_to_path:
                                            asset_path = asset_id_to_path[asset_id]
                                            if os.path.exists(asset_path):
                                                ad_asset_paths.append(asset_path)
                                                logging.info(
                                                    f"Found asset path for ID {asset_id}: {asset_path}"
                                                )
                                            else:
                                                logging.warning(
                                                    f"Asset path exists in map but file not found: {asset_path}"
                                                )
                                        else:
                                            logging.warning(
                                                f"Asset ID not found in map: {asset_id}"
                                            )

                                        if not ad_asset_paths:
                                            logging.warning(
                                                f"No valid assets found for ad {ad_id}"
                                            )
                                            continue

                                        # Upload media for this ad
                                    media_ids = []
                                    media_urls = []
                                    thumbnail_id = None

                                    for path in ad_asset_paths:
                                        try:
                                            logging.info(
                                                f"Uploading asset to {platform}: {path}"
                                            )
                                            if path.lower().endswith((".mp4", ".mov")):
                                                # Handle video upload
                                                media_id, cover_url = (
                                                    builder.upload_video(
                                                        apis, advertiser_id, path
                                                    )
                                                )
                                                media_ids.append(media_id)

                                                # Create thumbnail from video cover
                                                try:
                                                    # Create temporary cover image
                                                    temp_cover_path = (
                                                        path.rsplit(".", 1)[0]
                                                        + "_cover.jpg"
                                                    )
                                                    cover_data = get_image_from_url(
                                                        cover_url
                                                    )
                                                    with open(
                                                        temp_cover_path, "wb"
                                                    ) as f:
                                                        f.write(cover_data)

                                                    # Upload cover as thumbnail
                                                    thumbnail_id, _ = (
                                                        builder.upload_image(
                                                            apis,
                                                            advertiser_id,
                                                            temp_cover_path,
                                                        )
                                                    )

                                                    # Clean up temp file
                                                    if os.path.exists(temp_cover_path):
                                                        os.remove(temp_cover_path)
                                                except Exception as cover_err:
                                                    logging.error(
                                                        f"Error processing video cover: {str(cover_err)}"
                                                    )
                                            else:
                                                # Handle image upload
                                                media_id, media_url = (
                                                    builder.upload_image(
                                                        apis, advertiser_id, path
                                                    )
                                                )
                                                media_ids.append(media_id)
                                                media_urls.append(media_url)
                                        except Exception as media_err:
                                            logging.error(
                                                f"Error uploading media {path}: {str(media_err)}"
                                            )

                                    if not media_ids:
                                        logging.error(
                                            f"Failed to upload any media for ad {ad_id}"
                                        )
                                        continue

                                    # Create ad for this adgroup
                                    try:
                                        media_info = {
                                            "type": (
                                                "video"
                                                if any(
                                                    path.lower().endswith(
                                                        (".mp4", ".mov")
                                                    )
                                                    for path in ad_asset_paths
                                                )
                                                else "image"
                                            ),
                                            "ids": media_ids,
                                            "thumbnail_id": thumbnail_id,
                                        }

                                        # Get custom landing page URL if provided (for iOS Onelink)
                                        custom_landing_page_url = None
                                        if template == "ios_onelink":
                                            # For TikTok, only use ad-level landing page URLs
                                            custom_landing_page_url = (
                                                ad_landing_page_urls.get(ad_id)
                                            )
                                            if custom_landing_page_url:
                                                logging.info(
                                                    f"Found ad-level landing page URL for ad {ad_id}: {custom_landing_page_url}"
                                                )
                                            else:
                                                logging.info(
                                                    f"No ad-level landing page URL found for ad {ad_id}"
                                                )

                                            logging.info(f"Using ad name: {ad_name}")

                                            # For iOS Onelink with custom landing page URL
                                            if (
                                                template == "ios_onelink"
                                                and custom_landing_page_url
                                            ):
                                                logging.info(
                                                    f"Passing custom landing page URL to create_ad: '{custom_landing_page_url}'"
                                                )
                                                created_ad_id = builder.create_ad(
                                                    apis,
                                                    advertiser_id,
                                                    created_adgroup_id,
                                                    media_info,
                                                    ad_name,
                                                    custom_landing_page_url,
                                                )
                                            else:
                                                created_ad_id = builder.create_ad(
                                                    apis,
                                                    advertiser_id,
                                                    created_adgroup_id,
                                                    media_info,
                                                    ad_name,
                                                )

                                            logging.info(
                                                f"Ad created with ID: {created_ad_id}"
                                            )
                                            result_ads.append(created_ad_id)
                                    except Exception as ad_err:
                                        logging.error(
                                            f"Error creating ad for adgroup {created_adgroup_id}: {str(ad_err)}"
                                        )
                                        result["errors"].append(
                                            f"Error creating ad for adgroup {created_adgroup_id}: {str(ad_err)}"
                                        )
                                        continue

                                # Use the results for the response
                                if result_adgroups:
                                    # Use first adgroup for compatibility
                                    adgroup_id = result_adgroups[0]["id"]
                                    result["adset_id"] = adgroup_id

                                    if result_ads:
                                        # Use first ad for compatibility
                                        result["ad_id"] = result_ads[0]

                                    result["success"] = True
                                    result["message"] = (
                                        f"Successfully created {len(result_adgroups)} ad groups and {len(result_ads)} ads"
                                    )

                                    # Add detailed adgroup info
                                    result["adgroups"] = []
                                    for i, ag_info in enumerate(result_adgroups):
                                        ag_info["ad_id"] = result_ads[i]
                                        result["adgroups"].append(ag_info)

                                # Legacy single adgroup creation code removed - we now only use the multi-adgroup flow

                    except NotImplementedError as e:
                        result["message"] = str(e)
                        result["success"] = False
                        result["errors"].append(str(e))
                    except Exception as e:
                        # Extract specific error messages from TikTok API exceptions
                        error_message = str(e)
                        logging.error(
                            f"Error in TikTok campaign creation: {error_message}"
                        )
                        logging.error(f"Traceback: {traceback.format_exc()}")

                        # Extract user-friendly messages from specific TikTok API errors
                        if "budget setting must not be less than" in error_message:
                            # Budget error - extract the minimum budget requirement
                            min_budget = (
                                error_message.split("must not be less than")[1].strip()
                                if "must not be less than" in error_message
                                else "₺200.00"
                            )
                            user_message = f"Budget error: Minimum budget required is {min_budget}. Please increase your budget amount."
                            result["user_message"] = user_message
                        elif "Campaign name already exists" in error_message:
                            user_message = "Campaign name already exists. Please try a different name."
                            result["user_message"] = user_message
                        else:
                            # Generic error message for other cases
                            result["user_message"] = (
                                f"Error creating TikTok campaign: {error_message}"
                            )

                        result["errors"].append(error_message)

            except Exception as e:
                logging.error(f"Error creating {platform} campaign: {str(e)}")
                error_message = str(e)
                result["errors"].append(error_message)
                result["user_message"] = (
                    f"Error creating {platform} campaign: {error_message}"
                )

            results[platform] = result

        # Prepare a clear overall message for the user interface
        all_success = all(result["success"] for result in results.values())
        user_messages = []

        for platform, result in results.items():
            if result.get("user_message"):
                user_messages.append(result["user_message"])
            elif result.get("message"):
                user_messages.append(result["message"])
            elif not result["success"] and result["errors"]:
                user_messages.append(
                    f"{platform.capitalize()} error: {result['errors'][0]}"
                )

        # Use the combined messages or a default message
        user_message = (
            " ".join(user_messages)
            if user_messages
            else (
                "Campaign creation completed successfully"
                if all_success
                else "Campaign creation failed"
            )
        )

        return jsonify(
            {
                "success": any(result["success"] for result in results.values()),
                "message": user_message,
                "results": results,
            }
        )

    except Exception as e:
        logging.error(f"Error processing request: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/save_settings", methods=["POST"])
def save_settings():
    try:
        data = request.json
        meta_token = data.get("metaAccessToken")
        tiktok_token = data.get("tiktokAccessToken")

        # Here you would typically save these tokens securely
        # For now, we'll just return success
        return jsonify({"success": True, "message": "Settings saved successfully"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/get_campaigns", methods=["GET"])
def get_campaigns():
    try:
        platform = request.args.get("platform")
        logging.info(f"Fetching campaigns for platform: {platform}")

        if platform == "meta":
            campaigns = meta_data_fetcher.get_campaigns()
        else:  # tiktok
            campaigns = tiktok_data_fetcher.get_campaigns()

        logging.info(f"Found {len(campaigns)} campaigns")
        return jsonify({"campaigns": campaigns})
    except Exception as e:
        logging.error(f"Error fetching campaigns: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/get_adsets", methods=["GET"])
def get_adsets():
    try:
        platform = request.args.get("platform")
        campaign_id = request.args.get("campaign_id")
        logging.info(
            f"Fetching ad sets for platform: {platform}, campaign: {campaign_id}"
        )

        if platform == "meta":
            adsets = meta_data_fetcher.get_adsets(campaign_id)
        else:  # tiktok
            adsets = tiktok_data_fetcher.get_adgroups(campaign_id)

        logging.info(f"Found {len(adsets)} ad sets")
        return jsonify({"adsets": adsets})
    except Exception as e:
        logging.error(f"Error fetching ad sets: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/log", methods=["POST"])
def log_action():
    try:
        data = request.json
        logging.info(f"User Action: {data['action']} - Details: {data['details']}")
        return jsonify({"success": True})
    except Exception as e:
        logging.error(f"Error logging action: {str(e)}")
        return jsonify({"error": str(e)}), 500


def init_media_library():
    """Initialize media library if it doesn't exist"""
    if not os.path.exists(MEDIA_LIBRARY_FILE):
        with open(MEDIA_LIBRARY_FILE, "w") as f:
            json.dump([], f)


def init_aigc_history():
    """Initialize AIGC history file if it doesn't exist"""
    if not os.path.exists(AIGC_HISTORY_FILE):
        with open(AIGC_HISTORY_FILE, "w") as f:
            json.dump([], f)


def get_file_type(filename):
    """Determine if file is image or video based on extension"""
    ext = filename.rsplit(".", 1)[1].lower()
    if ext in {"png", "jpg", "jpeg", "gif"}:
        return "image"
    elif ext in {"mp4", "mov", "avi"}:
        return "video"
    return None


@app.route("/api/media/upload", methods=["POST"])
def upload_media():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({"error": "File type not allowed"}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(file_path)

        # Add to media library
        media_type = get_file_type(filename)
        media_entry = {
            "id": str(datetime.now().timestamp()),
            "filename": filename,
            "path": filename,
            "type": media_type,
            "upload_date": datetime.now().isoformat(),
            "status": "active",
        }

        with open(MEDIA_LIBRARY_FILE, "r+") as f:
            media_library = json.load(f)
            media_library.append(media_entry)
            f.seek(0)
            json.dump(media_library, f)

        return jsonify({"success": True, "media": media_entry})

    except Exception as e:
        logging.error(f"Error uploading media: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/media/library", methods=["GET"])
def get_media_library():
    try:
        media_type = request.args.get("type", "all")
        status = request.args.get("status", "all")

        with open(MEDIA_LIBRARY_FILE, "r") as f:
            media_library = json.load(f)

        # Filter by type and status if specified
        if media_type != "all":
            media_library = [m for m in media_library if m["type"] == media_type]
        if status != "all":
            media_library = [m for m in media_library if m["status"] == status]

        return jsonify({"media": media_library})

    except Exception as e:
        logging.error(f"Error fetching media library: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/media/status", methods=["POST"])
def update_media_status():
    try:
        data = request.json
        media_id = data.get("id")
        new_status = data.get("status")

        if not media_id or not new_status:
            return jsonify({"error": "Missing required fields"}), 400

        with open(MEDIA_LIBRARY_FILE, "r+") as f:
            media_library = json.load(f)
            for media in media_library:
                if media["id"] == media_id:
                    media["status"] = new_status
                    break
            f.seek(0)
            json.dump(media_library, f, indent=2)
            f.truncate()

        return jsonify({"success": True})

    except Exception as e:
        logging.error(f"Error updating media status: {str(e)}")
        return jsonify({"error": str(e)}), 500


# Initialize Flux API
flux_api = FluxAPI()


@app.route("/api/generate_image", methods=["POST"])
def generate_image():
    try:
        data = request.json
        flux = FluxAPI()
        image_url = flux.generate_image(
            prompt=data["prompt"], resolution=data["resolution"], model=data["model"]
        )

        if image_url:
            # Download and save the image
            response = requests.get(image_url)
            if response.status_code == 200:
                # Create filename with timestamp
                filename = f"aigc_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

                # Save image file
                with open(file_path, "wb") as f:
                    f.write(response.content)

                # Save to history with correct path
                with open(AIGC_HISTORY_FILE, "r+") as f:
                    try:
                        history = json.load(f)
                    except json.JSONDecodeError:
                        history = []

                    history.append(
                        {
                            "id": str(datetime.now().timestamp()),
                            "url": image_url,
                            "local_path": f"uploads/{filename}",  # This path will be prefixed with /static/ in frontend
                            "prompt": data["prompt"],
                            "timestamp": datetime.now().isoformat(),
                        }
                    )

                    f.seek(0)
                    json.dump(history, f, indent=2)
                    f.truncate()

            return jsonify({"success": True, "image_url": image_url})
        else:
            raise Exception("Failed to generate image")

    except Exception as e:
        logging.error(f"Error generating image: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/generate_headlines", methods=["POST"])
def generate_headlines():
    try:
        data = request.json
        vision = OpenAIVision()
        headlines = vision.generate_headlines(
            image_url=data["image_url"], prompt=data["prompt"]
        )

        return jsonify({"success": True, "headlines": headlines})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/aigc/video/generate", methods=["POST"])
def generate_video():
    try:
        data = request.json
        template = data.get("template")
        prompt = data.get("prompt")

        # TODO: Implement video generation
        # For now, return mock response
        return jsonify(
            {"success": True, "message": "Video generation not yet implemented"}
        )

    except Exception as e:
        logging.error(f"Error generating video: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/aigc/image/history", methods=["GET"])
def get_image_history():
    try:
        # Create history file if it doesn't exist
        if not os.path.exists(AIGC_HISTORY_FILE):
            with open(AIGC_HISTORY_FILE, "w") as f:
                json.dump([], f)
            return jsonify({"success": True, "images": []})

        with open(AIGC_HISTORY_FILE, "r") as f:
            try:
                history = json.load(f)
            except json.JSONDecodeError:
                history = []

            # Sort by timestamp, newest first
            history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

            return jsonify({"success": True, "images": history})

    except Exception as e:
        logging.error(f"Error fetching image history: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# Initialize media library on startup
init_media_library()

# Initialize AIGC history on startup
init_aigc_history()

# Track server status
server_running = False
comfyui_process = None


def check_comfyui_running():
    """Check if ComfyUI server is actually running"""
    try:
        response = requests.get("http://127.0.0.1:8188/", timeout=1)
        return response.ok
    except:
        return False


@app.route("/api/start_flux_workflow", methods=["POST"])
def start_flux_workflow():
    global comfyui_process, server_running
    try:
        # First check if server is actually running
        if check_comfyui_running():
            server_running = True
            return jsonify({"success": True, "message": "ComfyUI already running"})

        # First, start ComfyUI if it's not running
        if not server_running:
            logging.info(f"Starting ComfyUI from: {COMFYUI_PATH}")
            if not os.path.exists(COMFYUI_PATH):
                error_msg = f"ComfyUI main.py not found at {COMFYUI_PATH}"
                logging.error(error_msg)
                return jsonify({"success": False, "error": error_msg}), 404

            # Kill any existing process
            if comfyui_process:
                try:
                    comfyui_process.terminate()
                    time.sleep(1)  # Give it time to shut down
                except:
                    pass

            comfyui_process = subprocess.Popen(
                [sys.executable, COMFYUI_PATH],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.path.dirname(COMFYUI_PATH),
                env={
                    **os.environ,
                    "PYTHONPATH": f"{os.path.dirname(COMFYUI_PATH)}:{CUSTOM_NODES_PATH}",
                    "COMFYUI_CUSTOM_NODES_PATH": CUSTOM_NODES_PATH,
                    "COMFYUI_ENABLE_CUSTOM_NODES": "1",
                },
            )

            # Wait for ComfyUI server to start (max 30 seconds)
            start_time = time.time()
            while time.time() - start_time < 30:
                if check_comfyui_running():
                    server_running = True
                    return jsonify(
                        {"success": True, "message": "ComfyUI started successfully"}
                    )
                time.sleep(1)

            error_msg = "Timeout waiting for ComfyUI server to start"
            logging.error(error_msg)
            return jsonify({"success": False, "error": error_msg}), 500

        return jsonify({"success": True, "message": "ComfyUI already running"})

    except Exception as e:
        logging.error(f"Error starting ComfyUI: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/check_flux_workflow")
def check_flux_workflow():
    """Check if ComfyUI and Flux workflow are available"""
    try:
        if comfy_handler.initialize():
            workflow_path = os.path.join(
                app.static_folder, "workflows", "Template 1.json"
            )
            workflow = comfy_handler.load_workflow(workflow_path)
            if workflow:
                return jsonify({"status": "ready"})
        return jsonify({"status": "not_ready"})
    except Exception as e:
        logging.error(f"Error checking Flux workflow: {str(e)}")
        return jsonify({"status": "error", "message": str(e)})


def cleanup_processes(exception=None):
    global comfyui_process, server_running
    if comfyui_process:
        try:
            comfyui_process.terminate()
            comfyui_process.wait(timeout=5)  # Wait for process to terminate
        except:
            try:
                comfyui_process.kill()  # Force kill if terminate doesn't work
            except:
                pass
        finally:
            comfyui_process = None
            server_running = False


# Register the cleanup function to run when the application context tears down
app.teardown_appcontext(cleanup_processes)

# Also register cleanup on program exit
import atexit

atexit.register(cleanup_processes)


class ComfyWorkflowExecutor:
    def __init__(self):
        self.server = self._create_basic_server()

    def _create_basic_server(self):
        """Create a basic server implementation"""

        class BasicPromptServer:
            def __init__(self):
                self.client_id = None
                self.prompt_queue = None
                self.loop = None

            def send_sync(self, *args, **kwargs):
                pass

            def queue_prompt(self, *args, **kwargs):
                pass

            def validate_prompt(self, *args, **kwargs):
                return True

        return BasicPromptServer()

    def prepare_workflow(self, workflow):
        """Convert workflow to ComfyUI's expected format"""
        try:
            prompt = {}
            workflow_copy = json.loads(json.dumps(workflow))

            for node in workflow_copy.get("nodes", []):
                node_id = str(node.get("id"))
                if not node_id:
                    continue

                node_data = {
                    "class_type": node.get("type"),
                    "inputs": {},
                }

                # Handle widget values
                if "widgets_values" in node:
                    for i, value in enumerate(node["widgets_values"]):
                        node_data["inputs"][f"widget_{i}"] = value

                # Handle input connections
                if "inputs" in node:
                    if isinstance(node["inputs"], list):
                        for i, input_conn in enumerate(node["inputs"]):
                            if (
                                input_conn
                                and isinstance(input_conn, list)
                                and len(input_conn) >= 2
                            ):
                                node_data["inputs"][f"input_{i}"] = [
                                    str(input_conn[0]),
                                    input_conn[1],
                                ]
                    elif isinstance(node["inputs"], dict):
                        for input_name, input_data in node["inputs"].items():
                            if isinstance(input_data, list) and len(input_data) >= 2:
                                node_data["inputs"][input_name] = [
                                    str(input_data[0]),
                                    input_data[1],
                                ]
                            else:
                                node_data["inputs"][input_name] = input_data

                prompt[node_id] = node_data

            return prompt

        except Exception as e:
            logging.error(f"Error preparing workflow: {str(e)}")
            return None

    def execute_workflow(self, workflow, output_path):
        """Execute a workflow and save output"""
        try:
            prompt = self.prepare_workflow(workflow)
            if not prompt:
                return False

            logging.info(f"Executing workflow with prompt: {prompt}")
            # Actual execution logic would go here
            # For now, return False to indicate no output
            return False

        except Exception as e:
            logging.error(f"Workflow execution error: {str(e)}")
            logging.error(f"Traceback: {traceback.format_exc()}")
            return False


# Initialize the executor at app startup
workflow_executor = ComfyWorkflowExecutor()


@app.route("/api/apply_template", methods=["POST"])
def apply_template():
    try:
        data = request.json
        images = data.get("images", [])

        if not images:
            return jsonify({"success": False, "error": "No images selected"}), 400

        results = []

        # Load Template 1 workflow
        template_path = os.path.join(
            os.path.dirname(COMFYUI_PATH),
            "user",
            "default",
            "workflows",
            "Template 1.json",
        )
        with open(template_path, "r") as f:
            workflow = json.load(f)
            logging.info(f"Loaded workflow structure: {json.dumps(workflow, indent=2)}")

        # Copy logo to uploads directory if needed
        logo_filename = "okx_logo.png"
        logo_source = os.path.join(app.static_folder, "images", logo_filename)
        logo_dest = os.path.join(app.config["UPLOAD_FOLDER"], logo_filename)
        if not os.path.exists(logo_dest) and os.path.exists(logo_source):
            shutil.copy2(logo_source, logo_dest)

        for image in images:
            # Generate output filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_filename = f"branded_{timestamp}_{image}"
            output_path = os.path.join(app.config["UPLOAD_FOLDER"], output_filename)

            # Create a copy of the workflow for this execution
            current_workflow = json.loads(json.dumps(workflow))

            # Update workflow with current image
            main_image_node = next(
                node for node in current_workflow["nodes"] if node["id"] == 29
            )
            logo_node = next(
                node for node in current_workflow["nodes"] if node["id"] == 7
            )

            # Use just filenames since all files are in the upload directory
            main_image_node["widgets_values"][0] = image
            logo_node["widgets_values"][0] = logo_filename

            # Execute workflow
            if workflow_executor.execute_workflow(current_workflow, output_path):
                results.append({"filename": output_filename, "original": image})
            else:
                logging.error(f"Failed to process image: {image}")

        if not results:
            return (
                jsonify({"success": False, "error": "Failed to process any images"}),
                500,
            )

        return jsonify({"success": True, "results": results})

    except Exception as e:
        logging.error(f"Error applying template: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/vision/analyze", methods=["POST"])
def analyze_image():
    try:
        # Initialize OpenAI client with API key
        client = OpenAI(
            api_key=os.environ.get("OPENAI_API_KEY")
        )

        data = request.json
        image_path = data.get("image")
        custom_prompt = data.get("prompt")

        if not image_path:
            return jsonify({"error": "No image provided"}), 400

        # Get full path to image
        full_path = os.path.join(
            app.config["UPLOAD_FOLDER"], os.path.basename(image_path)
        )

        if not os.path.exists(full_path):
            return jsonify({"error": "Image not found"}), 404

        # Read and encode image
        with open(full_path, "rb") as image_file:
            encoded_image = b64encode(image_file.read()).decode("utf-8")

        # Call OpenAI Vision API
        response = client.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": custom_prompt
                            or "Suggest 3 action-focused image headlines that would make this image compelling for a crypto/trading advertisement. Make each headline short, punchy, and focused on action or FOMO. Format the response as a numbered list.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{encoded_image}"
                            },
                        },
                    ],
                }
            ],
            max_tokens=300,
        )

        return jsonify(
            {"success": True, "suggestions": response.choices[0].message.content}
        )

    except Exception as e:
        logging.error(f"Error analyzing image: {str(e)}")
        logging.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500


@app.route("/aigc/aigc_text.html")
def aigc_aigc_text():
    return render_template("aigc/aigc_text.html")


# Create necessary directories
WORKFLOW_DIR = os.path.join(app.static_folder, "workflows")
os.makedirs(WORKFLOW_DIR, exist_ok=True)

# Create default workflow file if it doesn't exist
default_workflow_path = os.path.join(WORKFLOW_DIR, "Template 1.json")
if not os.path.exists(default_workflow_path):
    with open(default_workflow_path, "w") as f:
        json.dump(
            {
                "version": 1,
                "nodes": {
                    "1": {
                        "id": 1,
                        "type": "Add Text Overlay",
                        "pos": [500, 200],
                        "size": [300, 400],
                        "flags": {},
                        "order": 0,
                        "inputs": {
                            "image": ["2", 0],
                            "text": "Sample Text",
                            "vertical_position": 0,
                            "text_color_option": "White",
                            "bg_color_option": "Black",
                            "bg_opacity": 0.7,
                            "font_path": "",
                        },
                    },
                    "2": {
                        "id": 2,
                        "type": "Load Image",
                        "pos": [200, 200],
                        "size": [300, 200],
                        "flags": {},
                        "order": 1,
                        "inputs": {"image": "path/to/image.jpg"},
                    },
                },
            },
            f,
            indent=2,
        )

# Define these constants near the top after app initialization
COMFYUI_PATH = os.path.join(os.path.dirname(__file__), "ComfyUI")
CUSTOM_NODES_PATH = os.path.join(COMFYUI_PATH, "custom_nodes")

# Add after app initialization
comfy_handler = ComfyUIHandler()

# Create necessary directories and files
try:
    # Create directories
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(os.path.dirname(MEDIA_LIBRARY_FILE), exist_ok=True)
    os.makedirs(os.path.dirname(AIGC_HISTORY_FILE), exist_ok=True)
    os.makedirs(app.template_folder, exist_ok=True)
    os.makedirs(WORKFLOW_DIR, exist_ok=True)

    # Initialize files
    init_media_library()
    init_aigc_history()

    # Create default workflow file
    default_workflow_path = os.path.join(WORKFLOW_DIR, "Template 1.json")
    if not os.path.exists(default_workflow_path):
        with open(default_workflow_path, "w") as f:
            json.dump(
                {
                    "version": 1,
                    "nodes": {
                        "1": {
                            "id": 1,
                            "type": "Add Text Overlay",
                            "pos": [500, 200],
                            "size": [300, 400],
                            "flags": {},
                            "order": 0,
                            "inputs": {
                                "image": ["2", 0],
                                "text": "Sample Text",
                                "vertical_position": 0,
                                "text_color_option": "White",
                                "bg_color_option": "Black",
                                "bg_opacity": 0.7,
                                "font_path": "",
                            },
                        },
                        "2": {
                            "id": 2,
                            "type": "Load Image",
                            "pos": [200, 200],
                            "size": [300, 200],
                            "flags": {},
                            "order": 1,
                            "inputs": {"image": "path/to/image.jpg"},
                        },
                    },
                },
                f,
                indent=2,
            )

except Exception as e:
    logging.error(f"Error initializing application files: {str(e)}")
    raise


@app.route("/api/comfy/load_template")
def load_comfy_template():
    try:
        template_path = os.path.join(app.static_folder, "workflows", "Template 1.json")
        with open(template_path, "r") as f:
            template = json.load(f)
        return jsonify(template)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Add cleanup handler
@app.teardown_appcontext
def cleanup(error):
    comfy_handler.stop_server()


# Add this function after your existing initialization functions
def setup_comfyui():
    """Setup ComfyUI and its custom nodes"""
    try:
        # Ensure ComfyUI paths are in Python path
        if COMFYUI_PATH not in sys.path:
            sys.path.append(COMFYUI_PATH)

        # Ensure custom nodes directory exists
        os.makedirs(CUSTOM_NODES_PATH, exist_ok=True)

        # Ensure TextOverlay node is in place
        text_overlay_path = os.path.join(CUSTOM_NODES_PATH, "ComfyUI-TextOverlay")
        if not os.path.exists(text_overlay_path):
            os.makedirs(text_overlay_path, exist_ok=True)

            # Copy node files if they don't exist
            if not os.path.exists(os.path.join(text_overlay_path, "__init__.py")):
                shutil.copy2(
                    os.path.join(
                        os.path.dirname(__file__),
                        "ComfyUI/custom_nodes/ComfyUI-TextOverlay/__init__.py",
                    ),
                    os.path.join(text_overlay_path, "__init__.py"),
                )
            if not os.path.exists(os.path.join(text_overlay_path, "nodes.py")):
                shutil.copy2(
                    os.path.join(
                        os.path.dirname(__file__),
                        "ComfyUI/custom_nodes/ComfyUI-TextOverlay/nodes.py",
                    ),
                    os.path.join(text_overlay_path, "nodes.py"),
                )

        logging.info("ComfyUI setup completed successfully")
        return True

    except Exception as e:
        logging.error(f"Error setting up ComfyUI: {str(e)}")
        return False


# Add this to your app initialization code (after app = Flask(__name__, ...))
setup_comfyui()


# Add these new routes
@app.route("/asset-manager/approval-flow")
def approval_flow():
    """Render the asset approval flow page"""
    # Get assets from the media library for review
    assets = get_media_library()

    # Count assets by status
    pending_assets = [asset for asset in assets if asset.get("status") == "pending"]
    approved_assets = [asset for asset in assets if asset.get("status") == "approved"]
    rejected_assets = [asset for asset in assets if asset.get("status") == "rejected"]

    # Log counts for debugging
    logging.info(
        f"Asset counts - Pending: {len(pending_assets)}, Approved: {len(approved_assets)}, Rejected: {len(rejected_assets)}"
    )

    return render_template(
        "asset_manager/approval_flow.html",
        assets=assets,
        pending_count=len(pending_assets),
        approved_count=len(approved_assets),
        rejected_count=len(rejected_assets),
    )


@app.route("/asset-manager/library")
def asset_library():
    return render_template("asset_manager/library.html")


@app.route("/api/assets/approve", methods=["POST"])
def approve_asset():
    try:
        data = request.json
        asset_id = data.get("asset_id")
        # Add your approval logic here
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/reject", methods=["POST"])
def reject_asset():
    try:
        data = request.json
        asset_id = data.get("asset_id")
        # Add your rejection logic here
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/comment", methods=["POST"])
def add_asset_comment():
    try:
        data = request.json
        asset_id = data.get("asset_id")
        comment = data.get("comment")
        # Add your comment logic here
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/<asset_id>", methods=["GET"])
def get_asset(asset_id):
    """Get details for a specific asset"""
    try:
        assets = get_media_library()
        asset = next((a for a in assets if a.get("id") == asset_id), None)

        if not asset:
            return jsonify({"error": "Asset not found"}), 404

        return jsonify(asset)
    except Exception as e:
        logging.error(f"Error getting asset: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/<asset_id>/reject", methods=["POST"])
def api_reject_asset(asset_id):
    """Reject an asset with specific rejection reasons"""
    try:
        data = request.json
        comment = data.get("comment", "")
        rejection_reasons = data.get("rejection_reasons", [])

        if not comment:
            return jsonify({"error": "Comment is required for rejection"}), 400

        if not rejection_reasons:
            return jsonify({"error": "At least one rejection reason is required"}), 400

        assets = get_media_library()
        asset_index = next(
            (i for i, a in enumerate(assets) if a.get("id") == asset_id), None
        )

        if asset_index is None:
            return jsonify({"error": "Asset not found"}), 404

        # Update asset status
        assets[asset_index]["status"] = "rejected"
        assets[asset_index]["rejected_at"] = datetime.now(timezone.utc).isoformat()
        assets[asset_index]["rejected_by"] = "Admin"
        assets[asset_index]["rejection_comment"] = comment
        assets[asset_index]["rejection_reasons"] = rejection_reasons

        # Save to file
        with open(MEDIA_LIBRARY_FILE, "w") as f:
            json.dump(assets, f, indent=2)

        return jsonify(assets[asset_index])
    except Exception as e:
        logging.error(f"Error rejecting asset: {str(e)}")
        return jsonify({"error": str(e)}), 500


@dataclass
class Asset:
    """Asset data model"""

    id: str
    name: str
    file_path: str
    thumbnail: str
    type: str
    status: str
    created_at: str
    tags: List[str]
    metadata: Dict = None
    last_modified: str = None
    created_by: str = None
    mime_type: str = None

    def to_dict(self) -> dict:
        """Convert Asset to dictionary for JSON serialization"""
        return {
            "id": self.id,
            "name": self.name,
            "file_path": self.file_path,
            "thumbnail": self.thumbnail,
            "type": self.type,
            "status": self.status,
            "created_at": self.created_at,
            "tags": self.tags,
            "metadata": self.metadata or {},
            "last_modified": self.last_modified,
            "created_by": self.created_by,
            "mime_type": self.mime_type,
        }


class AssetLibrary:
    def __init__(self, storage_path: str, media_library_file: str):
        self.storage_path = storage_path
        self.media_library_file = media_library_file
        self._ensure_directories()

    def _ensure_directories(self):
        """Ensure all required directories exist"""
        os.makedirs(self.storage_path, exist_ok=True)
        os.makedirs(os.path.dirname(self.media_library_file), exist_ok=True)

    def process_file(self, file, original_filename: str) -> Optional[Asset]:
        """Process a single file upload"""
        try:
            # Generate filenames
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            filename = f"{timestamp}_{secure_filename(original_filename)}"
            file_path = os.path.join(self.storage_path, filename)

            # Save file
            file.save(file_path)

            # Get file metadata
            metadata = self._get_file_metadata(file_path)

            # Generate thumbnail
            thumbnail_filename = f"thumb_{filename}"
            thumbnail_path = os.path.join(self.storage_path, thumbnail_filename)
            self._generate_thumbnail(file_path, thumbnail_path, metadata["mime_type"])

            # Create asset
            asset = Asset(
                id=str(uuid.uuid4()),
                name=original_filename,
                file_path=f"/static/uploads/{filename}",
                thumbnail=f"/static/uploads/{thumbnail_filename}",
                type="image" if metadata["mime_type"].startswith("image/") else "video",
                status="pending",
                created_at=datetime.now(timezone.utc).isoformat(),
                tags=[],
                metadata=metadata,
                created_by="system",
                mime_type=metadata["mime_type"],
            )

            return asset

        except Exception as e:
            logging.error(f"Error processing file {original_filename}: {str(e)}")
            return None

    def _get_file_metadata(self, file_path: str) -> Dict:
        """Get file metadata"""
        try:
            mime_type, _ = mimetypes.guess_type(file_path)
            stat = os.stat(file_path)

            metadata = {
                "mime_type": mime_type or "application/octet-stream",
                "size": stat.st_size,
                "created": datetime.fromtimestamp(
                    stat.st_ctime, timezone.utc
                ).isoformat(),
                "modified": datetime.fromtimestamp(
                    stat.st_mtime, timezone.utc
                ).isoformat(),
            }

            if mime_type and mime_type.startswith("image/"):
                from PIL import Image

                with Image.open(file_path) as img:
                    metadata.update(
                        {
                            "width": img.width,
                            "height": img.height,
                            "format": img.format,
                            "mode": img.mode,
                        }
                    )
            elif mime_type and mime_type.startswith("video/"):
                # Add video metadata using ffprobe if available
                try:
                    import ffmpeg

                    probe = ffmpeg.probe(file_path)
                    video_info = next(
                        s for s in probe["streams"] if s["codec_type"] == "video"
                    )
                    metadata.update(
                        {
                            "width": int(video_info["width"]),
                            "height": int(video_info["height"]),
                            "duration": float(probe["format"]["duration"]),
                            "bitrate": int(probe["format"]["bit_rate"]),
                        }
                    )
                except Exception as e:
                    logging.warning(f"Could not get video metadata: {str(e)}")

            return metadata

        except Exception as e:
            logging.error(f"Error getting metadata: {str(e)}")
            return {"mime_type": "application/octet-stream"}

    def _generate_thumbnail(self, source_path: str, thumb_path: str, mime_type: str):
        """Generate thumbnail based on file type"""
        try:
            if mime_type.startswith("video/"):
                self._generate_video_thumbnail(source_path, thumb_path)
            else:
                self._generate_image_thumbnail(source_path, thumb_path)
        except Exception as e:
            logging.error(f"Error generating thumbnail: {str(e)}")
            self._generate_fallback_thumbnail(thumb_path, mime_type)

    def _generate_image_thumbnail(self, source_path: str, thumb_path: str):
        """Generate thumbnail for image files"""
        try:
            from PIL import Image

            with Image.open(source_path) as img:
                # Convert RGBA to RGB if needed
                if img.mode == "RGBA":
                    img = img.convert("RGB")

                # Calculate aspect ratio
                aspect = img.width / img.height

                # Target size with max dimension of 200px
                if aspect > 1:
                    size = (200, int(200 / aspect))
                else:
                    size = (int(200 * aspect), 200)

                # Create thumbnail
                img.thumbnail(size, Image.Resampling.LANCZOS)
                img.save(thumb_path, "JPEG", quality=85)

        except Exception as e:
            logging.error(f"Error generating image thumbnail: {str(e)}")
            raise e

    def _generate_video_thumbnail(self, source_path: str, thumb_path: str):
        """Generate thumbnail for video files"""
        try:
            subprocess.run(
                [
                    "ffmpeg",
                    "-i",
                    source_path,
                    "-ss",
                    "00:00:01",  # Take frame at 1 second
                    "-vframes",
                    "1",
                    "-vf",
                    "scale=200:-1",
                    thumb_path,
                ],
                check=True,
                capture_output=True,
            )

        except Exception as e:
            logging.error(f"Error generating video thumbnail: {str(e)}")
            raise e

    def _generate_fallback_thumbnail(self, thumb_path: str, mime_type: str):
        """Generate a fallback thumbnail with file type indicator"""
        try:
            from PIL import Image, ImageDraw, ImageFont

            # Create a blank image
            img = Image.new("RGB", (200, 200), color="#f1f5f9")
            draw = ImageDraw.Draw(img)

            # Try to load a system font
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
            except:
                font = ImageFont.load_default()

            # Get file type from mime type
            file_type = mime_type.split("/")[-1].upper()

            # Draw text in center
            text_bbox = draw.textbbox((0, 0), file_type, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height = text_bbox[3] - text_bbox[1]

            x = (200 - text_width) / 2
            y = (200 - text_height) / 2

            draw.text((x, y), file_type, fill="#64748b", font=font)
            img.save(thumb_path, "JPEG", quality=85)

        except Exception as e:
            logging.error(f"Error generating fallback thumbnail: {str(e)}")
            # Create an even simpler fallback if PIL fails
            with open(thumb_path, "wb") as f:
                f.write(b"")


# Initialize the asset library
asset_library = AssetLibrary(
    storage_path=app.config["UPLOAD_FOLDER"], media_library_file=MEDIA_LIBRARY_FILE
)


@app.route("/api/assets/upload", methods=["POST"])
def upload_assets():
    """Handle file uploads"""
    try:
        if "files[]" not in request.files:
            return jsonify({"error": "No files provided"}), 400

        files = request.files.getlist("files[]")
        results = []

        for file in files:
            if file and allowed_file(file.filename):
                asset = asset_library.process_file(file, file.filename)
                if asset:
                    asset_dict = asset.to_dict()  # Convert to dict
                    save_to_media_library(asset_dict)  # Save dict to library
                    results.append(asset_dict)  # Add dict to results

        if not results:
            return jsonify({"error": "No files were successfully processed"}), 500

        return jsonify({"success": True, "assets": results})

    except Exception as e:
        logging.error(f"Upload error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/bulk", methods=["POST"])
def bulk_action():
    try:
        data = request.json
        action = data.get("action")
        asset_ids = data.get("asset_ids", [])

        # Add your bulk action logic here

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets")
def get_assets():
    try:
        assets = get_media_library()
        return jsonify(assets)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Initialize ComfyUI handler
try:
    comfy_handler = ComfyUIHandler()
    logging.info("ComfyUI setup completed successfully")
except Exception as e:
    logging.error(f"Error setting up ComfyUI: {str(e)}")


def get_media_library():
    """Get all assets from media library"""
    try:
        if not os.path.exists(MEDIA_LIBRARY_FILE):
            return []
        with open(MEDIA_LIBRARY_FILE, "r") as f:
            return json.load(f)
    except Exception as e:
        logging.error(f"Error reading media library: {str(e)}")
        return []


def save_to_media_library(asset):
    """Save asset to media library"""
    try:
        assets = get_media_library()
        assets.append(asset)
        with open(MEDIA_LIBRARY_FILE, "w") as f:
            json.dump(assets, f, indent=2)
    except Exception as e:
        logging.error(f"Error saving to media library: {str(e)}")
        raise e


# Add this after creating your Flask app (after app = Flask(...))
@app.template_filter("datetime")
def format_datetime(value, format="%Y-%m-%d %H:%M:%S"):
    """Format a datetime object to a readable string"""
    if value is None:
        return ""
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except:
            return value
    return value.strftime(format)


@app.route("/ads-builder", methods=["GET", "POST"])
def ads_builder_with_assets():
    """Render the ads builder page with selected assets"""
    selected_assets = []

    if request.method == "POST":
        # Get selected asset IDs from form
        asset_ids = request.form.getlist("selected_assets[]")

        print(f"Received {len(asset_ids)} selected assets: {asset_ids}")

        # Get asset details for each ID
        assets = get_media_library()
        selected_assets = [a for a in assets if a.get("id") in asset_ids]

        # Store in session for use later
        session["selected_assets"] = [a.get("id") for a in selected_assets]

    return render_template("ads_builder/index.html", selected_assets=selected_assets)


@app.route("/analytics")
def analytics():
    return render_template("analytics/index.html")


@app.route("/analytics/performance")
def analytics_performance():
    return render_template("analytics/performance.html")


@app.route("/analytics/reports")
def analytics_reports():
    return render_template("analytics/reports.html")


@app.route("/api/apply_branding", methods=["POST"])
def apply_branding():
    """Apply branding to an image"""
    try:
        # Extract data from request
        data = request.json
        image_path = data.get("image_path")
        headline = data.get(
            "headline", "Trade crypto with OKX"
        )  # Default text if none provided
        tc_text = data.get(
            "tc_text",
            "OKX is de handelsnaam van OKCoin Europe Ltd, een in Malta geregistreerd bedrijf, dat een licentie heeft van de MFSA als VASP (Virtual Asset Service Provider). Dit is geen aanbod of uitnodiging om digitale activa te kopen, verkopen of aan te houden, die onderhevig zijn aan volatiliteit en risico met zich meebrengen. Voorwaarden van toepassing. Afbeelding gemaakt met AI.",
        )  # Default T&C text

        if not image_path:
            return jsonify({"success": False, "error": "No image provided"})

        # Initialize ComfyUI
        comfy = ComfyUIHandler()
        comfy.initialize()

        # Apply branding with the custom headline and T&C text
        output_path = comfy.apply_branding(image_path, headline, tc_text)

        if not output_path:
            return jsonify({"success": False, "error": "Failed to apply branding"})

        # Convert server path to URL path for frontend
        branded_url = output_path.replace(app.static_folder, "/static")

        # Return success response with branded image URL
        return jsonify({"success": True, "branded_image_url": branded_url})

    except Exception as e:
        logging.error(f"Error applying branding: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/submit_for_approval", methods=["POST"])
def submit_for_approval():
    """Submit an asset for approval"""
    try:
        data = request.json
        image_path = data.get("image_path")
        image_name = data.get("image_name", "Branded Asset")

        if not image_path:
            return jsonify({"success": False, "error": "No image path provided"})

        # Create a unique ID for the asset
        asset_id = str(uuid.uuid4())

        # Copy the file to the uploads directory with a timestamp-based name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_ext = os.path.splitext(image_path)[1]
        new_filename = f"{timestamp}_{slugify(image_name)}{file_ext}"

        # Source path is relative to static folder
        source_path = os.path.join(app.static_folder, image_path.lstrip("/static/"))

        # Destination in uploads folder
        dest_path = os.path.join(app.static_folder, "uploads", new_filename)

        # Create thumbnails directory if it doesn't exist
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)

        # Copy the file
        shutil.copy(source_path, dest_path)

        # Create a thumbnail
        thumbnail_path = os.path.join(
            app.static_folder, "uploads", f"thumb_{new_filename}"
        )
        create_thumbnail(dest_path, thumbnail_path)

        # Prepare the asset data
        asset_data = {
            "id": asset_id,
            "name": image_name,
            "file_path": f"/static/uploads/{new_filename}",
            "thumbnail": f"/static/uploads/thumb_{new_filename}",
            "type": "image",
            "status": "pending",
            "created_at": datetime.now().isoformat(),
            "tags": [],
            "metadata": {
                "mime_type": "image/png",  # Assuming PNG, you may want to detect this
                "size": os.path.getsize(source_path),
                "created": datetime.now().isoformat(),
                "modified": datetime.now().isoformat(),
            },
            "created_by": "AI Generator",
        }

        # Save to your media library (this part depends on your implementation)
        # For this example, I'll assume you have a JSON file
        media_library_path = os.path.join(app.static_folder, "media_library.json")
        try:
            with open(media_library_path, "r") as f:
                media_library = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            media_library = []

        media_library.append(asset_data)

        with open(media_library_path, "w") as f:
            json.dump(media_library, f, indent=2)

        return jsonify(
            {
                "success": True,
                "asset_id": asset_id,
                "message": "Asset submitted for approval",
            }
        )

    except Exception as e:
        logging.error(f"Error submitting asset for approval: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"success": False, "error": str(e)})


# Helper function to create thumbnails
def create_thumbnail(source_path, dest_path, size=(300, 300)):
    from PIL import Image

    img = Image.open(source_path)
    img.thumbnail(size)
    img.save(dest_path)


# Helper function to slugify names for filenames
def slugify(text):
    return "".join(c if c.isalnum() else "_" for c in text).lower()


@app.route("/automated-rules/create")
def create_automated_rule():
    """Render the create automated rule page"""
    return render_template("ads_manager/create_rule.html")


@app.route("/my-approvals")
def my_approvals():
    """Render the my approvals page"""
    # Get rejected assets from the media library
    assets = get_media_library()
    rejected_assets = [asset for asset in assets if asset.get("status") == "rejected"]

    return render_template(
        "asset_manager/my_approvals.html", rejected_assets=rejected_assets
    )


@app.route("/api/assets/<asset_id>/update-text", methods=["POST"])
def update_asset_text(asset_id):
    """Update text content for a rejected asset"""
    try:
        data = request.json
        headline = data.get("headline")
        tc_text = data.get("tc_text")

        assets = get_media_library()
        asset_index = next(
            (i for i, a in enumerate(assets) if a.get("id") == asset_id), None
        )

        if asset_index is None:
            return jsonify({"error": "Asset not found"}), 404

        # Update the text fields if provided
        if headline is not None:
            assets[asset_index]["headline"] = headline

        if tc_text is not None:
            assets[asset_index]["tc_text"] = tc_text

        # Mark text as updated
        assets[asset_index]["text_updated_at"] = datetime.now(timezone.utc).isoformat()

        # Save to file
        with open(MEDIA_LIBRARY_FILE, "w") as f:
            json.dump(assets, f, indent=2)

        return jsonify({"success": True, "asset": assets[asset_index]})

    except Exception as e:
        logging.error(f"Error updating asset text: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/<asset_id>/resubmit", methods=["POST"])
def resubmit_asset(asset_id):
    """Resubmit a rejected asset for approval"""
    try:
        # More robust handling of the request data
        try:
            if request.is_json and request.data:
                data = request.json
            else:
                data = {}
                logging.warning(
                    f"Empty or non-JSON request body received for asset {asset_id}"
                )
        except Exception as e:
            logging.error(f"Error parsing JSON request: {str(e)}")
            data = {}

        branded_image_url = data.get("branded_image_url")

        if branded_image_url:
            logging.info(f"Using branded image URL: {branded_image_url}")
        else:
            logging.info(f"No branded image URL provided for asset {asset_id}")

        assets = get_media_library()
        asset_index = next(
            (i for i, a in enumerate(assets) if a.get("id") == asset_id), None
        )

        if asset_index is None:
            return jsonify({"error": "Asset not found"}), 404

        # If a branded image URL is provided, update the asset with it
        if branded_image_url:
            logging.info(f"Using branded image URL: {branded_image_url}")

            # Extract the path from the URL
            if branded_image_url.startswith("/"):
                branded_path = branded_image_url
                # For local URLs, update the asset directly with the local path
                assets[asset_index]["file_path"] = branded_path

                # Also update thumbnail if we have a matching pattern
                if branded_path.startswith("/static/uploads/"):
                    filename = os.path.basename(branded_path)
                    assets[asset_index][
                        "thumbnail"
                    ] = f"/static/uploads/thumb_{filename}"

                logging.info(f"Updated asset with local branded image: {branded_path}")
            else:
                # For external URLs, download and save the image
                try:
                    image_response = requests.get(branded_image_url)
                    if image_response.status_code == 200:
                        # Create a unique filename
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"branded_{timestamp}_{uuid.uuid4().hex[:8]}.jpg"
                        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

                        # Save the image
                        with open(file_path, "wb") as f:
                            f.write(image_response.content)

                        # Create thumbnail
                        thumbnail_path = os.path.join(
                            app.config["UPLOAD_FOLDER"], f"thumb_{filename}"
                        )
                        create_thumbnail(file_path, thumbnail_path)

                        # Use local path
                        branded_path = f"/static/uploads/{filename}"
                        branded_thumbnail = f"/static/uploads/thumb_{filename}"

                        # Update asset with branded image
                        assets[asset_index]["file_path"] = branded_path
                        assets[asset_index]["thumbnail"] = branded_thumbnail
                        logging.info(
                            f"Updated asset with downloaded branded image: {branded_path}"
                        )
                except Exception as e:
                    logging.error(f"Error downloading branded image: {str(e)}")
                    # Continue without updating the image

        # Change status back to pending
        assets[asset_index]["status"] = "pending"
        assets[asset_index]["resubmitted_at"] = datetime.now(timezone.utc).isoformat()

        # Keep track of revision history
        if "revision_history" not in assets[asset_index]:
            assets[asset_index]["revision_history"] = []

        assets[asset_index]["revision_history"].append(
            {
                "rejected_at": assets[asset_index].get("rejected_at"),
                "rejected_by": assets[asset_index].get("rejected_by"),
                "rejection_comment": assets[asset_index].get("rejection_comment"),
                "rejection_reasons": assets[asset_index].get("rejection_reasons", []),
                "resubmitted_at": assets[asset_index]["resubmitted_at"],
            }
        )

        # Save to file
        with open(MEDIA_LIBRARY_FILE, "w") as f:
            json.dump(assets, f, indent=2)

        return jsonify({"success": True, "asset": assets[asset_index]})

    except Exception as e:
        logging.error(f"Error resubmitting asset: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/<asset_id>/update-image", methods=["POST"])
def update_asset_image(asset_id):
    """Update image for a rejected asset after regeneration"""
    try:
        data = request.json
        new_image_url = data.get("new_image_url")
        prompt = data.get("prompt")

        if not new_image_url:
            return jsonify({"error": "No image URL provided"}), 400

        assets = get_media_library()
        asset_index = next(
            (i for i, a in enumerate(assets) if a.get("id") == asset_id), None
        )

        if asset_index is None:
            return jsonify({"error": "Asset not found"}), 404

        # Download the image from the URL
        image_response = requests.get(new_image_url)
        if image_response.status_code != 200:
            return jsonify({"error": "Failed to download the new image"}), 500

        # Create a unique filename for the new image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"regenerated_{timestamp}_{uuid.uuid4().hex[:8]}.jpg"
        file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)

        # Save the image
        with open(file_path, "wb") as f:
            f.write(image_response.content)

        # Create a thumbnail
        thumbnail_path = os.path.join(app.config["UPLOAD_FOLDER"], f"thumb_{filename}")
        create_thumbnail(file_path, thumbnail_path)

        # Update the asset
        assets[asset_index]["original_file_path"] = assets[asset_index][
            "file_path"
        ]  # Keep track of original
        assets[asset_index]["file_path"] = f"/static/uploads/{filename}"
        assets[asset_index]["thumbnail"] = f"/static/uploads/thumb_{filename}"
        assets[asset_index]["original_prompt"] = assets[asset_index].get("prompt", "")
        assets[asset_index]["prompt"] = prompt
        assets[asset_index]["regenerated_at"] = datetime.now(timezone.utc).isoformat()

        # Important: we do NOT change the status to pending here anymore
        # The status will be changed only when the user clicks the resubmit button

        # Save to file
        with open(MEDIA_LIBRARY_FILE, "w") as f:
            json.dump(assets, f, indent=2)

        return jsonify({"success": True, "asset": assets[asset_index]})

    except Exception as e:
        logging.error(f"Error updating asset image: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route("/api/assets/<asset_id>/approve", methods=["POST"])
def api_approve_asset(asset_id):
    """Approve an asset with optional comment"""
    try:
        data = request.json
        comment = data.get("comment", "")

        # Get all assets
        assets = get_media_library()
        asset = next((a for a in assets if a.get("id") == asset_id), None)

        if not asset:
            return jsonify({"error": "Asset not found"}), 404

        # Update the asset status
        asset["status"] = "approved"
        asset["approval_comment"] = comment
        asset["approved_at"] = datetime.now().isoformat()

        # Save the updated assets back to the file
        with open(MEDIA_LIBRARY_FILE, "w") as f:
            json.dump(assets, f, indent=2)

        # Return success response
        return jsonify({"success": True, "message": "Asset approved successfully"})
    except Exception as e:
        logging.error(f"Error approving asset: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/tiktok/account_details")
def get_tiktok_account_details():
    """API endpoint to get TikTok account details"""
    try:
        advertiser_id = request.args.get("advertiser_id")
        if not advertiser_id:
            return jsonify({"success": False, "error": "Advertiser ID is required"})

        # Get account details from config
        account_details = tiktok_account_config.get_account_details(advertiser_id)
        if not account_details:
            return jsonify(
                {
                    "success": False,
                    "error": f"Invalid TikTok Advertiser Account ID: {advertiser_id}",
                }
            )

        return jsonify({"success": True, "account_details": account_details})
    except Exception as e:
        logging.error(f"Error getting TikTok account details: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/meta/account_details")
def get_meta_account_details():
    """API endpoint to get Meta account details"""
    try:
        account_id = request.args.get("account_id")
        if not account_id:
            return jsonify({"success": False, "error": "Account ID is required"})

        # Get account details from config
        account_details = meta_account_config.get_account_details(account_id)
        if not account_details:
            return jsonify(
                {"success": False, "error": f"Invalid Meta Account ID: {account_id}"}
            )

        return jsonify({"success": True, "account_details": account_details})
    except Exception as e:
        logging.error(f"Error getting Meta account details: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


if __name__ == "__main__":
    # Create upload folder if it doesn't exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    init_aigc_history()
    app.run(debug=True)
