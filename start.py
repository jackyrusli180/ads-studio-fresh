#!/usr/bin/env python
"""Custom script to start Django server on a fixed port."""
import os
import sys
import subprocess
from dotenv import load_dotenv

def start_server():
    """Start Django server on the configured port."""
    # Load environment variables
    load_dotenv()
    
    # Get port from environment or use default
    port = os.environ.get("PORT", "8001")
    
    print(f"Starting Django server on port {port}...")
    subprocess.run([sys.executable, "manage.py", "runserver", f"127.0.0.1:{port}"])

if __name__ == "__main__":
    start_server() 