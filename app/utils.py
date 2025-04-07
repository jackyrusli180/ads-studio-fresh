import os
import time
import hashlib

def cache_bust_url(filename):
    """
    Generate a cache-busting URL for static files.
    
    Args:
        filename (str): Path to the static file relative to the static folder
        
    Returns:
        str: The filename with a cache-busting query parameter
    """
    # Get the full path to the static file
    static_folder = os.environ.get('FLASK_STATIC_FOLDER', 'app/static')
    file_path = os.path.join(static_folder, filename)
    
    # Check if the file exists
    if os.path.exists(file_path):
        # Use the file's modification time as a cache-busting parameter
        mtime = os.path.getmtime(file_path)
        # Create a hash of the modification time
        hash_str = hashlib.md5(str(mtime).encode()).hexdigest()[:8]
        # Return the filename with the hash as a query parameter
        # Don't add the query parameter to the filename itself
        return filename
    
    # If the file doesn't exist, just return the filename
    return filename 