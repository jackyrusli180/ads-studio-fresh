"""
Main application package.
Initializes the Flask application and registers all blueprints.
"""
import os
import sys
import subprocess
import hashlib
import time
from flask import Flask, redirect, url_for, request, send_from_directory
from datetime import datetime
import logging

# Check if psutil is installed
try:
    import psutil
except ImportError:
    print("psutil module not found. Installing...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
        print("psutil installed successfully.")
        import psutil
    except Exception as e:
        print(f"Error installing psutil: {str(e)}")
        print("Please install psutil manually with: pip install psutil")

# Import configuration
from app.config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS, MAX_CONTENT_LENGTH, SECRET_KEY
from app.utils import cache_bust_url

def create_app():
    """Create and configure the Flask application."""
    # Get the absolute path to the app directory
    app_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Create Flask app with explicit template and static folder paths
    app = Flask(__name__, 
                template_folder=os.environ.get('FLASK_TEMPLATE_FOLDER', 
                                              os.path.join(app_dir, 'templates')),
                static_folder=os.environ.get('FLASK_STATIC_FOLDER', 
                                            os.path.join(app_dir, 'static')))
    
    # Configure the app
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
    app.config['SECRET_KEY'] = SECRET_KEY
    app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 year in seconds
    
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s'
    )
    
    # Log details about each request including port information
    @app.before_request
    def log_request_info():
        """Log request details including the server port"""
        server_port = request.environ.get('SERVER_PORT', 'unknown')
        request_path = request.path
        
        # Only log API requests to avoid excessive logging
        if request_path.startswith('/api/'):
            logging.info(f"Request: {request.method} {request_path} on port {server_port} - Data: {request.args.to_dict()}")

    # Register custom Jinja2 filters
    @app.template_filter('datetime')
    def format_datetime(value, format='%Y-%m-%d %H:%M'):
        """Format a datetime object to string."""
        if value is None:
            return ""
        if isinstance(value, str):
            try:
                value = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                return value
        return value.strftime(format)
    
    # Add cache busting filter
    @app.template_filter('cache_bust')
    def cache_bust_filter(filename):
        """Add cache busting parameter to static file URLs."""
        return cache_bust_url(filename)
    
    # Override the default static file serving
    @app.route('/static/<path:filename>')
    def custom_static(filename):
        """Custom static file serving with cache busting."""
        # Get the full path to the static file
        file_path = os.path.join(app.static_folder, filename)
        
        # Check if the file exists
        if os.path.exists(file_path):
            # Get the directory and filename
            directory = os.path.dirname(file_path)
            basename = os.path.basename(file_path)
            rel_directory = os.path.relpath(directory, app.static_folder)
            
            # Set cache headers based on file type
            cache_timeout = 31536000  # 1 year in seconds
            return send_from_directory(
                app.static_folder, 
                os.path.join(rel_directory, basename),
                max_age=cache_timeout
            )
        
        # If file doesn't exist, fall back to default static file serving
        return app.send_static_file(filename)
    
    # Add cache control headers
    @app.after_request
    def add_cache_headers(response):
        """Add cache control headers to responses."""
        # Don't cache HTML responses
        if request.path.endswith('.html') or response.mimetype == 'text/html':
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        # Cache static files with a long expiration
        elif '/static/' in request.path:
            response.headers['Cache-Control'] = 'public, max-age=31536000'
        
        return response
    
    # Import route blueprints
    from app.routes.main_routes import main_bp
    from app.routes.asset_routes import asset_bp
    from app.routes.aigc_routes import aigc_bp
    from app.routes.ad_management_routes import ad_management_bp
    from app.routes.template_routes import template_bp
    from app.routes.analytics_routes import analytics_bp
    from app.routes.tiktok_routes import tiktok_bp
    from app.routes.meta_routes import meta_bp, meta_api_bp
    from app.routes.api import api_bp
    
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(asset_bp)
    app.register_blueprint(aigc_bp)
    app.register_blueprint(ad_management_bp)
    app.register_blueprint(template_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(tiktok_bp)
    app.register_blueprint(meta_bp)
    app.register_blueprint(meta_api_bp)
    app.register_blueprint(api_bp)
    
    # Create URL aliases if needed
    app.add_url_rule('/aigc/ai_image', 'aigc_ai_image', 
                    lambda: redirect(url_for('aigc.ai_image')))
    app.add_url_rule('/aigc/ai_video', 'aigc_ai_video', 
                    lambda: redirect(url_for('aigc.ai_video')))
    
    # Add URL alias for index
    app.add_url_rule('/', 'index', lambda: redirect(url_for('main.index')))
    
    # Add URL aliases for asset routes
    app.add_url_rule('/asset-manager/library', 'asset_library', 
                    lambda: redirect(url_for('asset.asset_library')))
    app.add_url_rule('/asset-manager/approval-flow', 'approval_flow', 
                    lambda: redirect(url_for('asset.approval_flow')))
    app.add_url_rule('/asset-manager/my-approvals', 'my_approvals', 
                    lambda: redirect(url_for('asset.my_approvals')))
    
    # Update URL aliases for ads routes
    app.add_url_rule('/ad-management/ads_builder', 'ads_builder', 
                    lambda: redirect(url_for('ad_management.ads_builder')))
    app.add_url_rule('/ad-management/automated-rules', 'automated_rules', 
                    lambda: redirect(url_for('ad_management.automated_rules')))
    
    # Add URL aliases for template routes
    app.add_url_rule('/templates/comfy', 'templates_comfy', 
                    lambda: redirect(url_for('template.templates_comfy')))
    
    # Add URL aliases for analytics routes
    app.add_url_rule('/analytics/performance', 'analytics_performance', 
                    lambda: redirect(url_for('analytics.analytics_performance')))
    app.add_url_rule('/analytics/reports', 'analytics_reports', 
                    lambda: redirect(url_for('analytics.analytics_reports')))
    
    # Add redirects for old URLs
    @app.route('/ads/ads_builder')
    def redirect_ads_builder():
        return redirect(url_for('ad_management.ads_builder'))

    @app.route('/ads/automated-rules')
    def redirect_automated_rules():
        return redirect(url_for('ad_management.automated_rules'))

    @app.route('/ads/automated-rules/create')
    def redirect_create_rule():
        return redirect(url_for('ad_management.create_rule'))

    @app.route('/ads/accounts')
    def redirect_accounts():
        return redirect(url_for('ad_management.get_accounts'))

    @app.route('/ads/api/create_campaign', methods=['POST'])
    def redirect_create_campaign():
        return redirect(url_for('ad_management.create_campaign'))
    
    return app

# Create the application instance
app = create_app() 