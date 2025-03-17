"""
Analytics routes for the application.
Contains routes for performance reports, etc.
"""
from flask import render_template, Blueprint

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/analytics/performance')
def analytics_performance():
    """Render the analytics performance page."""
    return render_template('analytics/index.html')

@analytics_bp.route('/analytics/reports')
def analytics_reports():
    """Render the analytics reports page."""
    return render_template('analytics/index.html') 