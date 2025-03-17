"""
AIGC routes for the application.
Contains routes for AI image generation, AI video generation, etc.
"""
from flask import render_template, request, jsonify, Blueprint, redirect, url_for
import os
import json
from datetime import datetime
import uuid

from app.config import UPLOAD_FOLDER, project_root
from app.services.flux_api import FluxAPI
from app.services.openai_vision import OpenAIVision

aigc_bp = Blueprint('aigc', __name__)

@aigc_bp.route('/ideabank/ai_image')
def ai_image():
    """Render the AI image generator page."""
    # Check if we're regenerating an asset
    regenerate_id = request.args.get('regenerate')
    regeneration_data = None
    
    if regenerate_id:
        # Load the asset data
        assets_file = os.path.join(project_root, 'Python', 'static', 'media_library.json')
        try:
            with open(assets_file, 'r') as f:
                assets = json.load(f)
                
            # Find the asset by ID
            for asset in assets:
                if asset.get('id') == regenerate_id:
                    regeneration_data = asset
                    break
        except (FileNotFoundError, json.JSONDecodeError):
            pass
    
    return render_template('aigc/ai_image.html', regeneration_data=regeneration_data)

@aigc_bp.route('/ideabank/ai_video')
def ai_video():
    """Render the AI video generator page."""
    return render_template('aigc/ai_video.html')

@aigc_bp.route('/api/generate_image', methods=['POST'])
def generate_image():
    """Generate an image using the FLUX API."""
    data = request.json
    prompt = data.get('prompt')
    resolution = data.get('resolution', '1:1')
    model = data.get('model', 'flux-pro-1.1')
    
    if not prompt:
        return jsonify({'success': False, 'error': 'Prompt is required'})
    
    # Generate image using FLUX API
    flux_api = FluxAPI()
    image_url = flux_api.generate_image(prompt, resolution, model)
    
    if not image_url:
        return jsonify({'success': False, 'error': 'Failed to generate image'})
    
    # Save the image URL and prompt to history
    history_file = os.path.join(project_root, 'Python', 'static', 'aigc_history.json')
    
    try:
        with open(history_file, 'r') as f:
            history = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        history = []
    
    # Add new entry to history
    history.append({
        'url': image_url,
        'prompt': prompt,
        'timestamp': datetime.now().isoformat()
    })
    
    # Save updated history
    with open(history_file, 'w') as f:
        json.dump(history, f)
    
    return jsonify({'success': True, 'image_url': image_url})

@aigc_bp.route('/api/aigc/image/history')
def get_image_history():
    """Get the image generation history."""
    history_file = os.path.join(project_root, 'Python', 'static', 'aigc_history.json')
    
    try:
        with open(history_file, 'r') as f:
            history = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        history = []
    
    # Sort by timestamp, newest first
    history.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    return jsonify({'success': True, 'images': history})

@aigc_bp.route('/api/generate_headlines', methods=['POST'])
def generate_headlines():
    """Generate headlines using OpenAI Vision API."""
    data = request.json
    image_url = data.get('image_url')
    prompt = data.get('prompt', 'Generate 3 compelling headlines for this image')
    
    if not image_url:
        return jsonify({'success': False, 'error': 'Image URL is required'})
    
    try:
        # Generate headlines using OpenAI Vision
        vision_api = OpenAIVision()
        headlines = vision_api.generate_headlines(image_url, prompt)
        
        return jsonify({'success': True, 'headlines': headlines})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}) 