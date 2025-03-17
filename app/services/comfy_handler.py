import os
import sys
import logging
import json
import subprocess
import threading
import time
import requests
import signal
import copy
import traceback
import socket
import psutil
import uuid
import shutil

class ComfyUIHandler:
    def __init__(self, project_root=None):
        # Get absolute path to project root (one level up from Python directory)
        if project_root is None:
            self.project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        else:
            self.project_root = project_root
            
        self.comfy_path = os.path.join(self.project_root, 'ComfyUI')
        self.custom_nodes_path = os.path.join(self.comfy_path, 'custom_nodes')
        
        # Get Python executable path
        self.python_path = sys.executable
        
        # Default port for ComfyUI
        self.port = 8188
        self.process = None
        
        if not os.path.exists(self.comfy_path):
            raise Exception(f"ComfyUI directory not found at {self.comfy_path}")
            
        # Create custom_nodes directory if it doesn't exist
        os.makedirs(self.custom_nodes_path, exist_ok=True)
            
        # Install TextOverlay node if not present
        text_overlay_path = os.path.join(self.custom_nodes_path, 'ComfyUI-TextOverlay')
        if not os.path.exists(text_overlay_path):
            try:
                subprocess.run(['git', 'clone', 'https://github.com/Munkyfoot/ComfyUI-TextOverlay.git'], 
                             cwd=self.custom_nodes_path, check=True)
                logging.info("Successfully installed ComfyUI-TextOverlay node")
            except Exception as e:
                logging.error(f"Failed to install ComfyUI-TextOverlay: {str(e)}")
    
    def _find_available_port(self):
        """Find an available port for ComfyUI server"""
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('', 0))
        port = s.getsockname()[1]
        s.close()
        return port
    
    def _is_port_in_use(self, port):
        """Check if a port is already in use"""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    def _kill_process_on_port(self, port):
        """Kill any process using the specified port"""
        for proc in psutil.process_iter(['pid', 'name', 'connections']):
            try:
                for conn in proc.connections():
                    if conn.laddr.port == port:
                        logging.info(f"Killing process {proc.pid} using port {port}")
                        proc.terminate()
                        proc.wait(timeout=3)
                        return True
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        return False
    
    def start_server(self):
        """Start the ComfyUI server"""
        # Check if ComfyUI is already running
        if self._is_port_in_use(self.port):
            logging.info(f"ComfyUI already running on port {self.port}")
            return
            
        # Try to kill any process using our port
        self._kill_process_on_port(self.port)
        
        # Start ComfyUI server
        try:
            cmd = [
                self.python_path,
                'main.py',
                '--port', str(self.port),
                '--listen', '127.0.0.1'
            ]
            
            logging.info(f"Starting ComfyUI server with command: {' '.join(cmd)}")
            
            # Start the process
            self.process = subprocess.Popen(
                cmd,
                cwd=self.comfy_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait for server to start
            max_attempts = 30
            for attempt in range(max_attempts):
                try:
                    response = requests.get(f"http://127.0.0.1:{self.port}/")
                    if response.status_code == 200:
                        logging.info("ComfyUI server started successfully")
                        return
                except requests.exceptions.ConnectionError:
                    pass
                
                time.sleep(1)
                
            raise Exception("Timeout waiting for ComfyUI server to start")
            
        except Exception as e:
            logging.error(f"Error starting ComfyUI server: {str(e)}")
            if self.process:
                self.process.terminate()
                self.process = None
            raise
    
    def stop_server(self):
        """Stop the ComfyUI server"""
        if self.process:
            logging.info("Stopping ComfyUI server")
            self.process.terminate()
            self.process.wait(timeout=5)
            self.process = None
    
    def run_workflow(self, workflow):
        """Run a workflow and return the output image path"""
        try:
            # Make a copy of the workflow to avoid modifying the original
            workflow_copy = copy.deepcopy(workflow)
            
            # Generate a unique ID for this run
            run_id = str(uuid.uuid4())
            
            # Prepare the API request
            url = f"http://127.0.0.1:{self.port}/prompt"
            
            # Send the workflow to ComfyUI
            response = requests.post(
                url,
                json={
                    "prompt": workflow_copy,
                    "client_id": run_id
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Error sending workflow to ComfyUI: {response.text}")
                
            prompt_id = response.json()["prompt_id"]
            
            # Wait for the workflow to complete
            max_attempts = 60
            for attempt in range(max_attempts):
                # Check if the workflow has completed
                history_url = f"http://127.0.0.1:{self.port}/history/{prompt_id}"
                history_response = requests.get(history_url)
                
                if history_response.status_code == 200:
                    history = history_response.json()
                    if history.get("status", {}).get("status") == "complete":
                        # Get the output image path
                        outputs = history.get("outputs", {})
                        if outputs:
                            # Find the last node with an image output
                            for node_id, node_output in reversed(list(outputs.items())):
                                for output_name, output_data in node_output.items():
                                    if isinstance(output_data, list) and output_data and isinstance(output_data[0], dict) and "filename" in output_data[0]:
                                        # Found an image output
                                        filename = output_data[0]["filename"]
                                        image_path = os.path.join(self.comfy_path, "output", filename)
                                        return image_path
                        
                        raise Exception("No output image found in workflow result")
                
                time.sleep(1)
                
            raise Exception("Timeout waiting for workflow to complete")
            
        except Exception as e:
            logging.error(f"Error running workflow: {str(e)}")
            logging.error(traceback.format_exc())
            return None 