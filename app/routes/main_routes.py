"""
Main routes for the application.
Contains routes for the home page and other general pages.
"""
from flask import render_template, Blueprint

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    """Render the home page."""
    return render_template('index.html')

@main_bp.errorhandler(404)
def page_not_found(e):
    """Handle 404 errors."""
    return render_template('error.html', error="Page not found"), 404

@main_bp.errorhandler(500)
def server_error(e):
    """Handle 500 errors."""
    return render_template('error.html', error="Server error"), 500 