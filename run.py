"""
Run script for the application.
Starts the Flask development server.
"""
import sys
import os
import argparse
import socket

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging for better debugging
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

# Load TikTok configuration
try:
    from app.config.tiktok_config import ACCESS_TOKEN
    logging.info(f"Using TikTok access token: {ACCESS_TOKEN[:5]}...{ACCESS_TOKEN[-5:]}")
except ImportError:
    logging.warning("Could not import TikTok access token")

# Add TikTok SDK to the Python path - using absolute path for reliability
tiktok_sdk_path = '/Users/jackyrusli/Codebase/Ads Studio V1/app/lib/tiktok-sdk'
tiktok_sdk_python_path = os.path.join(tiktok_sdk_path, 'python_sdk')

# Add Meta SDK to the Python path
meta_sdk_path = '/Users/jackyrusli/Codebase/Ads Studio V1/app/lib/meta-sdk'

if os.path.exists(tiktok_sdk_python_path):
    # Add both the SDK root and python_sdk directory to the path
    sys.path.insert(0, tiktok_sdk_path)
    sys.path.insert(0, tiktok_sdk_python_path)
    logging.info(f"Added TikTok SDK paths: {tiktok_sdk_path} and {tiktok_sdk_python_path}")
    
    # Try importing the business_api_client to verify it's accessible
    try:
        import business_api_client
        logging.info(f"Successfully imported business_api_client from {business_api_client.__file__}")
    except ImportError as e:
        logging.error(f"Failed to import business_api_client. Error: {e}")
else:
    logging.warning(f"TikTok SDK path does not exist: {tiktok_sdk_python_path}")

if os.path.exists(meta_sdk_path):
    # Add Meta SDK to the path
    sys.path.insert(0, meta_sdk_path)
    logging.info(f"Added Meta SDK path: {meta_sdk_path}")
    
    # Try importing the facebook_business module to verify it's accessible
    try:
        import facebook_business
        logging.info(f"Successfully imported facebook_business from {facebook_business.__file__}")
    except ImportError as e:
        logging.error(f"Failed to import facebook_business. Error: {e}")
else:
    logging.warning(f"Meta SDK path does not exist: {meta_sdk_path}")

# Set environment variables for Flask to use
base_dir = os.path.dirname(os.path.abspath(__file__))
os.environ['FLASK_TEMPLATE_FOLDER'] = os.path.join(base_dir, 'app/templates')
os.environ['FLASK_STATIC_FOLDER'] = os.path.join(base_dir, 'app/static')

# Import the app
from app import app

def is_port_in_use(port):
    """Check if a port is in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def find_available_port(start_port, max_attempts=10):
    """Find an available port starting from start_port"""
    port = start_port
    for _ in range(max_attempts):
        if not is_port_in_use(port):
            return port
        port += 1
    return None

if __name__ == '__main__':
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Run the Flask application')
    parser.add_argument('-p', '--port', type=int, default=5000, help='Port to run the server on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to')
    args = parser.parse_args()
    
    # Use the specified port or default to 5000
    port = args.port
    host = args.host
    
    # Check if the port is already in use
    if is_port_in_use(port):
        logging.warning(f"Port {port} is already in use.")
        new_port = find_available_port(port + 1)
        if new_port:
            logging.info(f"Switching to available port: {new_port}")
            port = new_port
        else:
            logging.error("Could not find an available port. Please specify one with -p/--port option.")
            sys.exit(1)
    
    # Add server port to the app config
    app.config['SERVER_PORT'] = port
    
    logging.info(f"Starting Flask server on {host}:{port}")
    logging.info(f"Access the application at http://localhost:{port}")
    
    try:
        app.run(debug=True, port=port, host=host)
    except OSError as e:
        if "Address already in use" in str(e):
            logging.error(f"Port {port} is already in use. Try a different port with -p/--port option.")
            sys.exit(1)
        else:
            raise 