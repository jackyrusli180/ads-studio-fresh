import atexit
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
import secrets

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
from typing import List, Dict, Optional, Tuple, Union
from dataclasses import dataclass
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Add TikTok Business API SDK to Python path
sys.path.append(os.path.expanduser("~/tiktok-sdk/python_sdk"))

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
    return "." in filename and filename.rsplit(
        ".", 1)[1].lower() in ALLOWED_EXTENSIONS


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

    return render_template(
        "aigc/ai_image.html",
        regeneration_data=regeneration_data)


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
        extra_css=["operation1.css"]  # Add the new CSS file
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
        "templates/comfy.html",
        error=error,
        **debug_info,
        comfy_port=comfy_port)


@app.route("/api/create_campaign", methods=["POST"])
def create_campaign():
    """
    Create a campaign based on the form data
    Operation type 1: Create new ads in existing adsets
    Operation type 2: Create new adsets in existing campaign
    Operation type 3: Create completely new campaign with adsets and ads
    """
    logging.info("Starting campaign creation...")
    try:
        form_data = request.form
        operation_type = form_data.get("operationType")

        # Debug: Print all form key/value pairs to understand structure
        logging.info("Form data structure:")
        for key, value in form_data.items():
            logging.info(f"Key: {key}, Value: {value}")

        # Get platforms
        platforms = request.form.getlist("platforms")
        if not platforms:
            return jsonify({"success": False, "error": "Please select at least one platform"})
        
        # Get library assets
        library_asset_ids = request.form.getlist("library_assets[]")
        if not library_asset_ids:
            return jsonify({"success": False, "error": "Please select at least one asset from the library"})

        # Get asset details from the media library
        media_library = get_media_library()
        library_assets = [asset for asset in media_library if asset.get("id") in library_asset_ids]

        # Process assets and create campaigns
        results = {}

        # Distribute operations to appropriate methods based on operation type
        if operation_type == "1":
            # Operation Type 1: Create new ads in existing adsets
            logging.info("Processing Operation Type 1: Create new ads in existing adsets")
            results = create_ads_in_adsets(platforms, form_data, library_assets)
            
        elif operation_type == "2":
            # Operation Type 2: Create new adsets in existing campaigns
            logging.info("Processing Operation Type 2: Create new adsets in existing campaigns")
            results = create_adsets_in_campaigns(platforms, form_data, library_assets)
            
        elif operation_type == "3":
            # Operation Type 3: Create new campaigns with adsets and ads
            logging.info("Processing Operation Type 3: Create completely new campaigns")
            results = create_full_campaigns(platforms, form_data, library_assets)
            
        else:
            return jsonify({"success": False, "error": f"Invalid operation type: {operation_type}"})
        
        # Check if we have any platform results
        if not results:
            return jsonify({"success": False, "error": "No campaigns were created"})
        
        # Determine overall success based on platform results
        overall_success = all(result.get("success", False) for result in results.values())
        
        response = {
            "success": overall_success,
            "results": results
        }
        
        # Add error message if unsuccessful
        if not overall_success:
            error_messages = []
            for platform, result in results.items():
                if not result.get("success", False):
                    if "error" in result:
                        error_messages.append(f"{platform.capitalize()}: {result['error']}")
                    elif "errors" in result:
                        for error in result["errors"]:
                            error_messages.append(f"{platform.capitalize()}: {error}")
            
            if error_messages:
                response["error"] = ". ".join(error_messages)
        
        logging.info(f"Campaign creation completed with success={overall_success}")
        return jsonify(response)
        
    except Exception as e:
        logging.error(f"Error creating campaign: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({"success": False, "error": f"An error occurred: {str(e)}"})

def create_ads_in_adsets(platforms, form_data, library_assets):
    """
    Operation Type 1: Create new ads in existing adsets
    """
    results = {}
    
    # For debugging: print form data structure
    logging.info("Form data structure:")
    for key, value in form_data.items():
        logging.info(f"Key: {key}, Value: {value}")
    
    # Process Meta platform
    if "meta" in platforms:
        # Support multiple Meta advertiser IDs
        meta_advertiser_ids = form_data.getlist("metaAdvertiserId")
        if not meta_advertiser_ids:
            return {"meta": {"success": False, "error": "Meta Advertiser Account is required"}}
        
        logging.info(f"Meta advertiser IDs: {meta_advertiser_ids}")
        
        # Use the first advertiser ID for now
        meta_advertiser_id = meta_advertiser_ids[0]
        if len(meta_advertiser_ids) > 1:
            logging.info(f"Using first Meta advertiser ID from {len(meta_advertiser_ids)} selected")
        
        # Extract all adset IDs that have form data - including those not in selected_adsets
        meta_adsets = set()
        
        # Get explicitly selected adsets for Meta
        for key, value in form_data.items():
            if key.startswith("selected_adsets[meta][]"):
                if value != "undefined":  # Skip undefined values
                    meta_adsets.add(value)
        
        # Also include adsets that have ad names or asset assignments
        # This ensures we don't miss adsets that weren't explicitly selected but have ads assigned
        for key in form_data.keys():
            if key.startswith("ad_names[") or key.startswith("asset_assignments["):
                # Extract adset ID from the key
                match = re.match(r'(?:ad_names|asset_assignments)\[([^\]]+)\]', key)
                if match:
                    adset_id = match.group(1)
                    # Only add to meta_adsets if this adset is meant for Meta
                    # We'll rely on the frontend properly associating adsets with platforms
                    # and keeping Meta adsets separate from TikTok adsets in the UI
                    if not "tiktok" in key and not any(tiktok_id == adset_id for tiktok_id in form_data.getlist("selected_adsets[tiktok][]")):
                        meta_adsets.add(adset_id)
        
        meta_adsets = list(meta_adsets)
        logging.info(f"Processing Meta adsets: {meta_adsets}")
        
        # Dictionary to store ads by adset ID
        meta_ad_names = {}
        
        # Process each adset
        for adset_id in meta_adsets:
            # Get all ad names for this adset
            ad_keys = [k for k in form_data.keys() if k.startswith(f"ad_names[{adset_id}]")]
            ad_names = []
            
            # Extract ad names and their specific containers if available
            ad_containers = {}
            for key in ad_keys:
                ad_name = form_data.get(key)
                if not ad_name:
                    continue
                    
                # Check if this is a specific container
                container_id = None
                if "[" in key[len(f"ad_names[{adset_id}]"):]:
                    # Extract container ID from brackets
                    match = re.search(r'\[([^\]]+)\]$', key)
                    if match:
                        container_id = match.group(1)
                
                # Use container ID or create a unique ID
                container_id = container_id or f"ad_{len(ad_containers)}"
                ad_containers[container_id] = {"name": ad_name, "assets": []}
                ad_names.append(ad_name)
            
            logging.info(f"Ad names for adset {adset_id}: {ad_names}")
            
            # Get all assets assigned to this adset and organize by container
            asset_keys = [k for k in form_data.keys() if k.startswith(f"asset_assignments[{adset_id}]")]
            all_assets = []
            
            for key in asset_keys:
                # Get the asset ID - may be multiple if it's an array field
                assets = form_data.getlist(key)
                if not assets:
                    continue
                    
                # Check if this is a specific container
                container_id = None
                if "[" in key[len(f"asset_assignments[{adset_id}]"):]:
                    # Extract container ID from brackets
                    match = re.search(r'\[([^\]]+)\]$', key)
                    if match:
                        container_id = match.group(1)
                
                # If we have a container ID and it matches one from ad_names, add assets to it
                if container_id and container_id in ad_containers:
                    ad_containers[container_id]["assets"].extend(assets)
                else:
                    # Otherwise, add to the general pool of assets
                    all_assets.extend(assets)
            
            logging.info(f"All assets assigned to adset {adset_id}: {all_assets}")
            
            # If we have no specific containers with assets, distribute assets to ads sequentially
            if not any(container["assets"] for container in ad_containers.values()):
                # Distribute assets to ads - for now assigning assets sequentially to each ad
                # Starting with the first one
                if ad_containers and all_assets:
                    container_ids = list(ad_containers.keys())
                    for i, asset_id in enumerate(all_assets):
                        container_id = container_ids[i % len(container_ids)]
                        ad_containers[container_id]["assets"].append(asset_id)
            
            # Convert to the structure expected by create_ads_in_existing_adsets
            ad_entries = []
            for container_id, container in ad_containers.items():
                if container["assets"]:  # Only include ads with assets
                    ad_entries.append(container)
                    logging.info(f"  Ad for adset {adset_id}: Name='{container['name']}', Assets={len(container['assets'])}")
            
            # Always store as a list to support multiple ads per adset
            if ad_entries:
                meta_ad_names[adset_id] = ad_entries if len(ad_entries) > 1 else ad_entries[0]
        
        if not meta_adsets:
            results["meta"] = {"success": False, "error": "Please select at least one Meta adset"}
        else:
            # Create ads using the uploader module
            import ad_uploader_existing
            meta_results = ad_uploader_existing.create_ads_in_existing_adsets(
                platform="meta",
                advertiser_id=meta_advertiser_id,
                adset_ids=meta_adsets,
                library_assets=library_assets,
                ad_names=meta_ad_names
            )
            
            results["meta"] = meta_results
    
    # Process TikTok platform
    if "tiktok" in platforms:
        # Support multiple TikTok advertiser IDs
        tiktok_advertiser_ids = form_data.getlist("tiktokAdvertiserId")
        if not tiktok_advertiser_ids:
            return {"tiktok": {"success": False, "error": "TikTok Advertiser Account is required"}}
        
        logging.info(f"TikTok advertiser IDs: {tiktok_advertiser_ids}")
        
        # Use the first advertiser ID for now
        tiktok_advertiser_id = tiktok_advertiser_ids[0]
        if len(tiktok_advertiser_ids) > 1:
            logging.info(f"Using first TikTok advertiser ID from {len(tiktok_advertiser_ids)} selected")
        
        # Extract all adset IDs that have form data - including those not in selected_adsets
        tiktok_adsets = set()
        
        # Get explicitly selected adsets for TikTok
        for key, value in form_data.items():
            if key.startswith("selected_adsets[tiktok][]"):
                if value != "undefined":  # Skip undefined values
                    tiktok_adsets.add(value)
        
        # Also include adsets that have ad names or asset assignments
        # This ensures we don't miss adsets that weren't explicitly selected but have ads assigned
        for key in form_data.keys():
            if key.startswith("ad_names[") or key.startswith("asset_assignments["):
                # Extract adset ID from the key
                match = re.match(r'(?:ad_names|asset_assignments)\[([^\]]+)\]', key)
                if match:
                    adset_id = match.group(1)
                    # Only add to tiktok_adsets if this adset is meant for TikTok
                    # We'll rely on the frontend properly associating adsets with platforms
                    # and keeping TikTok adsets separate from Meta adsets in the UI
                    if not "meta" in key and not any(meta_id == adset_id for meta_id in form_data.getlist("selected_adsets[meta][]")):
                        tiktok_adsets.add(adset_id)
        
        tiktok_adsets = list(tiktok_adsets)
        logging.info(f"Processing TikTok adsets: {tiktok_adsets}")
        
        # Dictionary to store ads by adset ID
        tiktok_ad_names = {}
        
        # Process each adset
        for adset_id in tiktok_adsets:
            # Get all ad names for this adset
            ad_keys = [k for k in form_data.keys() if k.startswith(f"ad_names[{adset_id}]")]
            ad_names = []
            
            # Extract ad names and their specific containers if available
            ad_containers = {}
            for key in ad_keys:
                ad_name = form_data.get(key)
                if not ad_name:
                    continue
                    
                # Check if this is a specific container
                container_id = None
                if "[" in key[len(f"ad_names[{adset_id}]"):]:
                    # Extract container ID from brackets
                    match = re.search(r'\[([^\]]+)\]$', key)
                    if match:
                        container_id = match.group(1)
                
                # Use container ID or create a unique ID
                container_id = container_id or f"ad_{len(ad_containers)}"
                ad_containers[container_id] = {"name": ad_name, "assets": []}
                ad_names.append(ad_name)
            
            logging.info(f"Ad names for adset {adset_id}: {ad_names}")
            
            # Get all assets assigned to this adset and organize by container
            asset_keys = [k for k in form_data.keys() if k.startswith(f"asset_assignments[{adset_id}]")]
            all_assets = []
            
            for key in asset_keys:
                # Get the asset ID - may be multiple if it's an array field
                assets = form_data.getlist(key)
                if not assets:
                    continue
                    
                # Check if this is a specific container - look for pattern asset_assignments[adset_id][container_id][]
                container_id = None
                container_match = re.search(r'asset_assignments\[\d+\]\[([^\]]+)\]', key)
                if container_match:
                    container_id = container_match.group(1)
                elif "[" in key[len(f"asset_assignments[{adset_id}]"):]:
                    # Old pattern (without container ID)
                    match = re.search(r'\[([^\]]+)\]$', key)
                    if match:
                        container_id = match.group(1)
                
                # If we have a container ID and it matches one from ad_names, add assets to it
                if container_id and container_id in ad_containers:
                    ad_containers[container_id]["assets"].extend(assets)
                else:
                    # Otherwise, add to the general pool of assets
                    all_assets.extend(assets)
            
            logging.info(f"All assets assigned to adset {adset_id}: {all_assets}")
            
            # If we have no specific containers with assets, distribute assets to ads sequentially
            if not any(container["assets"] for container in ad_containers.values()):
                # Distribute assets to ads - for now assigning assets sequentially to each ad
                # Starting with the first one
                if ad_containers and all_assets:
                    container_ids = list(ad_containers.keys())
                    for i, asset_id in enumerate(all_assets):
                        container_id = container_ids[i % len(container_ids)]
                        ad_containers[container_id]["assets"].append(asset_id)
            
            # Convert to the structure expected by create_ads_in_existing_adsets
            ad_entries = []
            for container_id, container in ad_containers.items():
                if container["assets"]:  # Only include ads with assets
                    ad_entries.append(container)
                    logging.info(f"  Ad for adset {adset_id}: Name='{container['name']}', Assets={len(container['assets'])}")
            
            # Always store as a list to support multiple ads per adset
            if ad_entries:
                tiktok_ad_names[adset_id] = ad_entries if len(ad_entries) > 1 else ad_entries[0]
        
        if not tiktok_adsets:
            results["tiktok"] = {"success": False, "error": "Please select at least one TikTok adset"}
        else:
            # Create ads using the uploader module
            import ad_uploader_existing
            tiktok_results = ad_uploader_existing.create_ads_in_existing_adsets(
                platform="tiktok",
                advertiser_id=tiktok_advertiser_id,
                adset_ids=tiktok_adsets,
                library_assets=library_assets,
                ad_names=tiktok_ad_names
            )
            
            results["tiktok"] = tiktok_results
    
    return results

def create_adsets_in_campaigns(platforms, form_data, library_assets):
    """
    Operation Type 2: Create new adsets in existing campaigns
    """
    # TODO: Implement creation of new adsets in existing campaigns
    # This function will:
    # 1. First create the new adsets using campaign_builder modules for each platform
    # 2. Then create ads in those adsets using ad_uploader 
    
    logging.info("Operation Type 2 not yet implemented")
    results = {}
    
    for platform in platforms:
        results[platform] = {
            "success": False, 
            "error": f"Creation of new adsets in existing campaigns not yet implemented for {platform}"
        }
    
    return results

def create_full_campaigns(platforms, form_data, library_assets):
    """
    Operation Type 3: Create completely new campaigns with adsets and ads
    """
    # TODO: Implement creation of new campaigns, adsets, and ads
    # This function will use the campaign_builder modules for each platform
    
    logging.info("Operation Type 3 not yet implemented")
    results = {}
    
    for platform in platforms:
        results[platform] = {
            "success": False, 
            "error": f"Creation of new campaigns not yet implemented for {platform}"
        }
    
    return results

@app.route("/api/save_settings", methods=["POST"])
def save_settings():
    try:
        data = request.json
        meta_token = data.get("metaAccessToken")
        tiktok_token = data.get("tiktokAccessToken")

        # Here you would typically save these tokens securely
        # For now, we'll just return success
        return jsonify({"success": True,
                        "message": "Settings saved successfully"})

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
            f"Fetching ad sets for platform: {platform}, campaign: {campaign_id}")

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
        logging.info(
            f"User Action: {data['action']} - Details: {data['details']}")
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
            media_library = [
                m for m in media_library if m["type"] == media_type]
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
            prompt=data["prompt"],
            resolution=data["resolution"],
            model=data["model"])

        if image_url:
            # Download and save the image
            response = requests.get(image_url)
            if response.status_code == 200:
                # Create filename with timestamp
                filename = f"aigc_{
                    datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
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
                            # This path will be prefixed with /static/ in
                            # frontend
                            "local_path": f"uploads/{filename}",
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
        return jsonify({"success": True,
                        "message": "Video generation not yet implemented"})

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
    except BaseException:
        return False


@app.route("/api/start_flux_workflow", methods=["POST"])
def start_flux_workflow():
    global comfyui_process, server_running
    try:
        # First check if server is actually running
        if check_comfyui_running():
            server_running = True
            return jsonify({"success": True,
                            "message": "ComfyUI already running"})

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
                except BaseException:
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
        except BaseException:
            try:
                comfyui_process.kill()  # Force kill if terminate doesn't work
            except BaseException:
                pass
        finally:
            comfyui_process = None
            server_running = False


# Register the cleanup function to run when the application context tears down
app.teardown_appcontext(cleanup_processes)

# Also register cleanup on program exit

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
                            if isinstance(
                                    input_data, list) and len(input_data) >= 2:
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
            return jsonify(
                {"success": False, "error": "No images selected"}), 400

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
            logging.info(
                f"Loaded workflow structure: {
                    json.dumps(
                        workflow,
                        indent=2)}")

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
            output_path = os.path.join(
                app.config["UPLOAD_FOLDER"], output_filename)

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
            if workflow_executor.execute_workflow(
                    current_workflow, output_path):
                results.append(
                    {"filename": output_filename, "original": image})
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
        # Use the OpenAIVision class instead of initializing the client
        # directly
        vision = OpenAIVision()
        client = vision.client

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

        return jsonify({"success": True,
                        "suggestions": response.choices[0].message.content})

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
        template_path = os.path.join(
            app.static_folder, "workflows", "Template 1.json")
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
        text_overlay_path = os.path.join(
            CUSTOM_NODES_PATH, "ComfyUI-TextOverlay")
        if not os.path.exists(text_overlay_path):
            os.makedirs(text_overlay_path, exist_ok=True)

            # Copy node files if they don't exist
            if not os.path.exists(
                os.path.join(
                    text_overlay_path,
                    "__init__.py")):
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
    pending_assets = [
        asset for asset in assets if asset.get("status") == "pending"]
    approved_assets = [
        asset for asset in assets if asset.get("status") == "approved"]
    rejected_assets = [
        asset for asset in assets if asset.get("status") == "rejected"]

    # Log counts for debugging
    logging.info(
        f"Asset counts - Pending: {
            len(pending_assets)}, Approved: {
            len(approved_assets)}, Rejected: {
                len(rejected_assets)}")

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
            return jsonify(
                {"error": "At least one rejection reason is required"}), 400

        assets = get_media_library()
        asset_index = next(
            (i for i, a in enumerate(assets) if a.get("id") == asset_id), None
        )

        if asset_index is None:
            return jsonify({"error": "Asset not found"}), 404

        # Update asset status
        assets[asset_index]["status"] = "rejected"
        assets[asset_index]["rejected_at"] = datetime.now(
            timezone.utc).isoformat()
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
            thumbnail_path = os.path.join(
                self.storage_path, thumbnail_filename)
            self._generate_thumbnail(
                file_path, thumbnail_path, metadata["mime_type"])

            # Create asset
            asset = Asset(
                id=str(
                    uuid.uuid4()),
                name=original_filename,
                file_path=f"/static/uploads/{filename}",
                thumbnail=f"/static/uploads/{thumbnail_filename}",
                type="image" if metadata["mime_type"].startswith("image/") else "video",
                status="pending",
                created_at=datetime.now(
                    timezone.utc).isoformat(),
                tags=[],
                metadata=metadata,
                created_by="system",
                mime_type=metadata["mime_type"],
            )

            return asset

        except Exception as e:
            logging.error(
                f"Error processing file {original_filename}: {
                    str(e)}")
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
                        s for s in probe["streams"] if s["codec_type"] == "video")
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

    def _generate_thumbnail(
            self,
            source_path: str,
            thumb_path: str,
            mime_type: str):
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
                font = ImageFont.truetype(
                    "/System/Library/Fonts/Helvetica.ttc", 24)
            except BaseException:
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
    storage_path=app.config["UPLOAD_FOLDER"],
    media_library_file=MEDIA_LIBRARY_FILE)


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
            return jsonify(
                {"error": "No files were successfully processed"}), 500

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
        except BaseException:
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

    return render_template(
        "ads_builder/index.html",
        selected_assets=selected_assets)


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
            return jsonify({"success": False,
                            "error": "Failed to apply branding"})

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
            return jsonify(
                {"success": False, "error": "No image path provided"})

        # Create a unique ID for the asset
        asset_id = str(uuid.uuid4())

        # Copy the file to the uploads directory with a timestamp-based name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_ext = os.path.splitext(image_path)[1]
        new_filename = f"{timestamp}_{slugify(image_name)}{file_ext}"

        # Source path is relative to static folder
        source_path = os.path.join(
            app.static_folder,
            image_path.lstrip("/static/"))

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
        media_library_path = os.path.join(
            app.static_folder, "media_library.json")
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
    rejected_assets = [
        asset for asset in assets if asset.get("status") == "rejected"]

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
        assets[asset_index]["text_updated_at"] = datetime.now(
            timezone.utc).isoformat()

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
                    f"Empty or non-JSON request body received for asset {asset_id}")
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

                logging.info(
                    f"Updated asset with local branded image: {branded_path}")
            else:
                # For external URLs, download and save the image
                try:
                    image_response = requests.get(branded_image_url)
                    if image_response.status_code == 200:
                        # Create a unique filename
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"branded_{timestamp}_{uuid.uuid4().hex[:8]}.jpg"
                        file_path = os.path.join(
                            app.config["UPLOAD_FOLDER"], filename)

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
                            f"Updated asset with downloaded branded image: {branded_path}")
                except Exception as e:
                    logging.error(f"Error downloading branded image: {str(e)}")
                    # Continue without updating the image

        # Change status back to pending
        assets[asset_index]["status"] = "pending"
        assets[asset_index]["resubmitted_at"] = datetime.now(
            timezone.utc).isoformat()

        # Keep track of revision history
        if "revision_history" not in assets[asset_index]:
            assets[asset_index]["revision_history"] = []

        assets[asset_index]["revision_history"].append(
            {
                "rejected_at": assets[asset_index].get("rejected_at"),
                "rejected_by": assets[asset_index].get("rejected_by"),
                "rejection_comment": assets[asset_index].get("rejection_comment"),
                "rejection_reasons": assets[asset_index].get(
                    "rejection_reasons",
                    []),
                "resubmitted_at": assets[asset_index]["resubmitted_at"],
            })

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
        thumbnail_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            f"thumb_{filename}")
        create_thumbnail(file_path, thumbnail_path)

        # Update the asset
        assets[asset_index]["original_file_path"] = assets[asset_index][
            "file_path"
        ]  # Keep track of original
        assets[asset_index]["file_path"] = f"/static/uploads/{filename}"
        assets[asset_index]["thumbnail"] = f"/static/uploads/thumb_{filename}"
        assets[asset_index]["original_prompt"] = assets[asset_index].get(
            "prompt", "")
        assets[asset_index]["prompt"] = prompt
        assets[asset_index]["regenerated_at"] = datetime.now(
            timezone.utc).isoformat()

        # Important: we do NOT change the status to pending here anymore
        # The status will be changed only when the user clicks the resubmit
        # button

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
        return jsonify({"success": True,
                        "message": "Asset approved successfully"})
    except Exception as e:
        logging.error(f"Error approving asset: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/tiktok/account_details")
def get_tiktok_account_details():
    """API endpoint to get TikTok account details"""
    try:
        advertiser_id = request.args.get("advertiser_id")
        if not advertiser_id:
            return jsonify({"success": False,
                            "error": "Advertiser ID is required"})

        # Get account details from config
        account_details = tiktok_account_config.get_account_details(
            advertiser_id)
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
            return jsonify(
                {"success": False, "error": "Account ID is required"})

        # Get account details from config
        account_details = meta_account_config.get_account_details(account_id)
        if not account_details:
            return jsonify({"success": False,
                            "error": f"Invalid Meta Account ID: {account_id}"})

        return jsonify({"success": True, "account_details": account_details})
    except Exception as e:
        logging.error(f"Error getting Meta account details: {str(e)}")
        return jsonify({"success": False, "error": str(e)})


@app.route("/api/meta/campaigns")
def get_meta_campaigns():
    try:
        account_id = request.args.get("account_id")
        if not account_id:
            return jsonify({"success": False, "error": "Account ID is required"})
        
        # Add debug logging
        logging.info(f"Fetching Meta campaigns for account: {account_id}")
        
        # Initialize the Meta API with the specified account
        ad_account = meta_android.initialize_api(account_id)
        
        # Get campaigns
        campaigns = ad_account.get_campaigns(
            fields=['id', 'name', 'status', 'objective'],
            params={'limit': 100}
        )
        
        # Log the raw response
        logging.info(f"Meta campaigns response: {campaigns}")
        
        # Format the response
        campaign_list = []
        for campaign in campaigns:
            campaign_list.append({
                'id': campaign['id'],
                'name': campaign['name'],
                'status': campaign['status'],
                'objective': campaign.get('objective', '')
            })
        
        logging.info(f"Returning {len(campaign_list)} Meta campaigns for account {account_id}")
        return jsonify({"success": True, "campaigns": campaign_list})
    except Exception as e:
        logging.error(f"Error getting Meta campaigns: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/tiktok/campaigns")
def get_tiktok_campaigns():
    try:
        advertiser_id = request.args.get("advertiser_id")
        if not advertiser_id:
            return jsonify({"success": False, "error": "Advertiser ID is required"})
        
        # Add debug logging
        logging.info(f"Fetching TikTok campaigns for advertiser: {advertiser_id}")
        
        # Initialize the TikTok API
        apis = tiktok_android.initialize_api()
        
        # Get campaigns
        url = "https://business-api.tiktok.com/open_api/v1.3/campaign/get/"
        headers = {
            "Access-Token": apis['campaign_api'].api_client.configuration.access_token
        }
        params = {
            "advertiser_id": advertiser_id,
            "page_size": 100
        }
        
        logging.info(f"TikTok API request: {url} with params {params}")
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        
        # Log the raw response
        logging.info(f"TikTok campaigns response: {data}")
        
        if data.get('code') == 0 and 'data' in data and 'list' in data['data']:
            campaign_list = []
            for campaign in data['data']['list']:
                campaign_list.append({
                    'id': campaign['campaign_id'],
                    'name': campaign['campaign_name'],
                    'status': campaign['operation_status'],
                    'objective': campaign.get('objective_type', '')
                })
            
            logging.info(f"Returning {len(campaign_list)} TikTok campaigns for advertiser {advertiser_id}")
            return jsonify({"success": True, "campaigns": campaign_list})
        else:
            error_message = data.get('message', 'Unknown error')
            logging.error(f"TikTok API error: {error_message}")
            return jsonify({"success": False, "error": error_message})
    except Exception as e:
        logging.error(f"Error getting TikTok campaigns: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/meta/adsets")
def get_meta_adsets():
    try:
        campaign_id = request.args.get("campaign_id")
        if not campaign_id:
            return jsonify({"success": False, "error": "Campaign ID is required"})
        
        # Get the account ID from the request
        account_id = request.args.get("account_id")
        if not account_id:
            # Try to extract from campaign ID as fallback
            account_id = campaign_id.split('_')[0]
        
        # Initialize the Meta API
        ad_account = meta_android.initialize_api(account_id)
        
        # Add debug logging
        logging.info(f"Fetching adsets for Meta campaign: {campaign_id}")
        
        # Get adsets with explicit filtering for the campaign
        # Meta API expects campaign.id in the filtering parameter
        params = {
            'filtering': [
                {
                    'field': 'campaign.id',
                    'operator': 'EQUAL',
                    'value': campaign_id
                }
            ],
            'limit': 100
        }
        
        logging.info(f"Meta API request params: {params}")
        
        # Get adsets
        adsets = ad_account.get_ad_sets(
            fields=['id', 'name', 'status', 'daily_budget', 'lifetime_budget', 'campaign_id'],
            params=params
        )
        
        # Log the raw response
        logging.info(f"Meta adsets response: {adsets}")
        
        # Format the response
        adset_list = []
        for adset in adsets:
            budget = adset.get('daily_budget', adset.get('lifetime_budget', 0))
            budget_display = f"${float(budget)/100:.2f}"
            
            adset_list.append({
                'id': adset['id'],
                'name': adset['name'],
                'status': adset['status'],
                'budget': budget_display,
                'campaign_id': adset.get('campaign_id', '')
            })
        
        logging.info(f"Formatted {len(adset_list)} Meta adsets for campaign {campaign_id}")
        return jsonify({"success": True, "adsets": adset_list})
    except Exception as e:
        logging.error(f"Error getting Meta adsets: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

@app.route("/api/tiktok/adsets")
def get_tiktok_adsets():
    try:
        campaign_id = request.args.get("campaign_id")
        advertiser_id = request.args.get("advertiser_id")
        
        if not campaign_id:
            return jsonify({"success": False, "error": "Campaign ID is required"})
        
        if not advertiser_id:
            # Try to extract from campaign ID as fallback
            advertiser_id = campaign_id.split('_')[0]
        
        # Initialize the TikTok API
        apis = tiktok_android.initialize_api()
        
        # Add debug logging
        logging.info(f"Fetching adsets for TikTok campaign: {campaign_id}")
        logging.info(f"Using advertiser ID: {advertiser_id}")
        
        # Ensure campaign_id is properly formatted for TikTok API
        # TikTok might require specific formatting
        formatted_campaign_id = campaign_id
        logging.info(f"Using formatted campaign ID: {formatted_campaign_id}")
        
        # Get adgroups
        url = "https://business-api.tiktok.com/open_api/v1.3/adgroup/get/"
        headers = {
            "Access-Token": apis['adgroup_api'].api_client.configuration.access_token
        }
        params = {
            "advertiser_id": advertiser_id,  # Use the advertiser_id from the request, not the campaign_id
            "campaign_ids": [formatted_campaign_id],  # Use campaign_ids array for filtering
            "page_size": 100
        }
        
        logging.info(f"TikTok API request: {url} with params {params}")
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        
        # Log the raw response
        logging.info(f"TikTok adsets response: {data}")
        
        if data.get('code') == 0 and 'data' in data and 'list' in data['data']:
            adset_list = []
            for adgroup in data['data']['list']:
                # Verify this adgroup belongs to our campaign
                adgroup_campaign_id = adgroup.get('campaign_id', '')
                logging.info(f"Adgroup {adgroup['adgroup_id']} has campaign_id: {adgroup_campaign_id}")
                
                # Only include adgroups that match our campaign
                if adgroup_campaign_id == formatted_campaign_id or adgroup_campaign_id == campaign_id:
                    budget = adgroup.get('budget', 0)
                    budget_display = f"${float(budget):.2f}"
                    
                    adset_list.append({
                        'id': adgroup['adgroup_id'],
                        'name': adgroup['adgroup_name'],
                        'status': adgroup['operation_status'],
                        'budget': budget_display
                    })
            
            logging.info(f"Formatted {len(adset_list)} TikTok adsets for campaign {campaign_id}")
            return jsonify({"success": True, "adsets": adset_list})
        else:
            error_message = data.get('message', 'Unknown error')
            logging.error(f"TikTok API error: {error_message}")
            return jsonify({"success": False, "error": error_message})
    except Exception as e:
        logging.error(f"Error getting TikTok adsets: {str(e)}")
        return jsonify({"success": False, "error": str(e)})

# Add a test endpoint to verify API credentials
@app.route("/api/test_credentials")
def test_credentials():
    results = {}
    
    # Test Meta credentials
    try:
        meta_account = meta_android.initialize_api()
        meta_account.get_campaigns(fields=['name'], params={'limit': 1})
        results['meta'] = "Success"
    except Exception as e:
        results['meta'] = f"Error: {str(e)}"
    
    # Test TikTok credentials
    try:
        apis = tiktok_android.initialize_api()
        url = "https://business-api.tiktok.com/open_api/v1.3/user/info/"
        headers = {"Access-Token": apis['campaign_api'].api_client.configuration.access_token}
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            results['tiktok'] = "Success"
        else:
            results['tiktok'] = f"Error: {response.text}"
    except Exception as e:
        results['tiktok'] = f"Error: {str(e)}"
    
    return jsonify(results)

@app.route("/api/media_library", methods=["GET"])
def media_library_api():  # Changed function name to avoid conflict
    """API endpoint to get the media library"""
    try:
        # Get the media library from the existing function
        media_library = get_media_library()
        
        # Return the media library as JSON
        return jsonify({
            "success": True,
            "assets": media_library
        })
    except Exception as e:
        logging.error(f"Error getting media library: {str(e)}")
        logging.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Create upload folder if it doesn't exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    init_aigc_history()
    app.run(debug=True)
