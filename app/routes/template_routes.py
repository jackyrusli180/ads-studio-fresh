"""
Template routes for the application.
Contains routes for ComfyUI templates, etc.
"""
from flask import render_template, request, jsonify, Blueprint
import os
import json
import logging

from app.config import project_root
from app.services.comfy_handler import ComfyUIHandler

template_bp = Blueprint('template', __name__)

@template_bp.route('/templates/comfy')
def templates_comfy():
    """Render the ComfyUI templates page."""
    comfy_handler = ComfyUIHandler(project_root)
    
    try:
        # Try to start ComfyUI server
        comfy_handler.start_server()
        
        return render_template(
            'comfy_templates/comfy.html',
            comfy_port=comfy_handler.port,
            comfy_path=comfy_handler.comfy_path,
            python_path=comfy_handler.python_path
        )
    except Exception as e:
        logging.error(f"Error starting ComfyUI: {str(e)}")
        return render_template(
            'comfy_templates/comfy.html',
            error=str(e),
            comfy_path=comfy_handler.comfy_path,
            python_path=comfy_handler.python_path
        )

@template_bp.route('/api/comfy/load_template')
def load_comfy_template():
    """Load a ComfyUI template."""
    # Load the default template
    template_file = os.path.join(project_root, 'Python', 'static', 'workflows', 'Template 1.json')
    
    try:
        with open(template_file, 'r') as f:
            template = json.load(f)
        return jsonify(template)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logging.error(f"Error loading template: {str(e)}")
        return jsonify({'error': 'Failed to load template'}) 