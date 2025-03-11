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
    def __init__(self):
        # Get absolute path to project root (one level up from Python directory)
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.comfy_path = os.path.join(self.project_root, 'ComfyUI')
        self.custom_nodes_path = os.path.join(self.comfy_path, 'custom_nodes')
        
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
            
        # Install Text Overlay Plugin if not present
        text_overlay_plugin_path = os.path.join(self.custom_nodes_path, 'ComfyUI-text-overlay')
        if not os.path.exists(text_overlay_plugin_path):
            try:
                subprocess.run(['git', 'clone', 'https://github.com/mikkel/ComfyUI-text-overlay.git'], 
                             cwd=self.custom_nodes_path, check=True)
                logging.info("Successfully installed ComfyUI-text-overlay plugin")
            except Exception as e:
                logging.error(f"Failed to install ComfyUI-text-overlay: {str(e)}")
            
        # Add ComfyUI to Python path
        if self.comfy_path not in sys.path:
            sys.path.insert(0, self.comfy_path)
            
        self.initialized = False
        self.process = None
        self.running = False
        self.port = 8189  # Changed from 8188 to 8189
        self.comfy_url = f"http://127.0.0.1:{self.port}"
        
    def initialize(self):
        """Initialize ComfyUI components safely"""
        if self.initialized:
            return True
            
        try:
            # Import core ComfyUI modules
            import execution
            import nodes
            import comfy.utils
            
            # Initialize necessary components
            self.execution = execution
            self.nodes = nodes
            self.utils = comfy.utils
            
            # Initialize nodes (removed init_nodes call since it doesn't exist)
            # Instead, just load custom nodes
            custom_nodes_path = os.path.join(self.comfy_path, 'custom_nodes')
            if os.path.exists(custom_nodes_path):
                sys.path.append(custom_nodes_path)
                # Let ComfyUI handle node initialization
            
            self.initialized = True
            return True
            
        except ImportError as e:
            logging.error(f"Failed to initialize ComfyUI: {str(e)}")
            return False
        except Exception as e:
            logging.error(f"Unexpected error initializing ComfyUI: {str(e)}")
            return False
    
    def load_workflow(self, workflow_path):
        """Load a ComfyUI workflow file"""
        if not self.initialize():
            return None
            
        try:
            with open(workflow_path, 'r') as f:
                workflow = json.load(f)
                
            # Add debug logging to see workflow content
            if "nodes" in workflow:
                logging.info(f"Loaded workflow in editor format with {len(workflow['nodes'])} nodes")
            else:
                logging.info(f"Loaded workflow in API format with {len(workflow)} nodes")
            return workflow
        except Exception as e:
            logging.error(f"Error loading workflow: {str(e)}")
            return None
    
    def execute_workflow(self, workflow):
        """Execute a ComfyUI workflow"""
        if not self.initialize():
            return None
            
        try:
            # Add workflow execution logic here
            pass
        except Exception as e:
            logging.error(f"Error executing workflow: {str(e)}")
            return None
    
    def start_server(self):
        if self.running:
            return
            
        # Check if the port is already in use
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind(('127.0.0.1', self.port))
            s.close()
        except socket.error:
            # Port is in use, try to find another available port
            logging.info(f"Port {self.port} is already in use. Finding an available port...")
            for port in range(8190, 8200):  # Try ports 8190-8199
                try:
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.bind(('127.0.0.1', port))
                    s.close()
                    self.port = port
                    self.comfy_url = f"http://127.0.0.1:{self.port}"
                    logging.info(f"Found available port: {self.port}")
                    break
                except socket.error:
                    continue
        
        try:
            if not os.path.exists(self.comfy_path):
                raise Exception(f"ComfyUI directory not found at {self.comfy_path}")
                
            # Check if main.py exists
            main_py = os.path.join(self.comfy_path, 'main.py')
            if not os.path.exists(main_py):
                raise Exception(f"ComfyUI main.py not found at {main_py}")
                
            # Start ComfyUI server with detailed logging
            cmd = [
                sys.executable,
                main_py,
                '--port', str(self.port),
                '--listen', '127.0.0.1',
                '--dont-print-server',  # Add this to prevent immediate shutdown
            ]
            
            logging.info(f"Starting ComfyUI server with command: {' '.join(cmd)}")
            
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.comfy_path,  # Set working directory to ComfyUI folder
                preexec_fn=os.setsid if hasattr(os, 'setsid') else None  # Make the server process a session leader on Unix systems
            )
            
            # Start threads to log output
            threading.Thread(target=self._log_output, args=(self.process.stdout, "stdout"), daemon=True).start()
            threading.Thread(target=self._log_output, args=(self.process.stderr, "stderr"), daemon=True).start()
            
            # Wait for server to start
            self._wait_for_server()
            self.running = True
            logging.info("ComfyUI server started successfully")
            
        except Exception as e:
            logging.error(f"Failed to start ComfyUI server: {str(e)}")
            if self.process and hasattr(os, 'killpg') and hasattr(os, 'getpgid'):
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)  # Kill the entire process group on Unix
            elif self.process:
                self.process.terminate()  # Fallback for Windows
            raise

    def _log_output(self, pipe, name):
        """Log output from the process"""
        for line in iter(pipe.readline, b''):
            logging.info(f"ComfyUI {name}: {line.decode().strip()}")

    def _wait_for_server(self, timeout=120):  # Increased timeout to 2 minutes
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                response = requests.get(f'http://127.0.0.1:{self.port}/object_info')
                if response.status_code == 200:
                    return
            except requests.exceptions.ConnectionError:
                # Check if process is still running
                if self.process.poll() is not None:
                    # Process has terminated, get output
                    stdout, stderr = self.process.communicate()
                    raise Exception(f"ComfyUI server process terminated unexpectedly.\nStdout: {stdout.decode()}\nStderr: {stderr.decode()}")
                logging.debug("Server not ready yet, retrying...")
                time.sleep(2)
            except Exception as e:
                logging.error(f"Error checking server status: {str(e)}")
                time.sleep(2)
                
        # If we get here, timeout occurred
        # Get any output from the process
        stdout, stderr = self.process.communicate()
        raise Exception(f"ComfyUI server failed to start within timeout period.\nStdout: {stdout.decode()}\nStderr: {stderr.decode()}")
    
    def stop_server(self):
        """Stop the running ComfyUI server"""
        if not self.running or not self.process:
            return
        
        # Try graceful termination first
        try:
            if hasattr(os, 'setsid') and self.process:
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
            elif self.process:
                self.process.terminate()
            
            # Give it a moment to shut down
            time.sleep(1)
            
            # Force kill if still running
            if self.process.poll() is None:
                if hasattr(os, 'setsid'):
                    os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
                else:
                    self.process.kill()
                
            # Also kill any other hanging ComfyUI processes
            self._kill_other_comfy_processes()
            
        except Exception as e:
            logging.error(f"Error stopping ComfyUI server: {str(e)}")
        finally:
            self.process = None
            self.running = False
        
    def _kill_other_comfy_processes(self):
        """Kill any other ComfyUI processes that might be running"""
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    cmdline = proc.info.get('cmdline', [])
                    if cmdline and len(cmdline) > 1 and 'ComfyUI/main.py' in ' '.join(cmdline):
                        if proc.pid != (self.process.pid if self.process else None):
                            logging.info(f"Killing other ComfyUI process: {proc.pid}")
                            proc.kill()
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
        except ImportError:
            logging.warning("psutil not installed, cannot kill other ComfyUI processes")

    def restart_server(self):
        """Completely stop and restart the server"""
        self.stop_server()
        time.sleep(2)  # Give it time to fully stop
        self.start_server()

    def prepare_workflow(self, workflow, image_path):
        """Prepare the workflow with our image path"""
        modified_workflow = copy.deepcopy(workflow)
        
        # Check if this is already in API format (no 'nodes' key, just node IDs as keys)
        if 'nodes' not in modified_workflow:
            # This is already in API format with node IDs as keys
            for node_id, node in modified_workflow.items():
                if node.get('class_type') == 'LoadImage':
                    # Update the LoadImage node with our image
                    if 'inputs' in node:
                        node['inputs']['image'] = image_path
                    return modified_workflow
        
        # Otherwise, handle the 'nodes' format as before
        load_image_nodes = []
        
        # Check if nodes is a list or dictionary
        if isinstance(modified_workflow.get('nodes', []), list):
            # List format handling...
            for node in modified_workflow['nodes']:
                if node.get('type') == 'LoadImage':
                    load_image_nodes.append(node)
                
            # If we found load image nodes, update the first one with our image path
            if load_image_nodes:
                # Assuming the first LoadImage node is the main content image
                main_image_node = load_image_nodes[0]
                
                # Update the image path in widgets_values
                if isinstance(main_image_node.get('widgets_values', []), list):
                    if len(main_image_node['widgets_values']) > 0:
                        main_image_node['widgets_values'][0] = image_path
        else:
            # Dictionary format handling...
            for node_id, node in modified_workflow['nodes'].items():
                if node.get('type') == 'LoadImage':
                    load_image_nodes.append(node_id)
                
            # If we found load image nodes, update the first one with our image path
            if load_image_nodes:
                # Assuming the first LoadImage node is the main content image
                main_image_node = modified_workflow['nodes'][load_image_nodes[0]]
                
                # Update the image path - handle different formats of widgets_values
                if isinstance(main_image_node.get('widgets_values', []), list):
                    if len(main_image_node['widgets_values']) > 0:
                        main_image_node['widgets_values'][0] = image_path
                elif 'inputs' in main_image_node and 'image' in main_image_node['inputs']:
                    main_image_node['inputs']['image'] = image_path
        
        return modified_workflow
    
    def run_workflow(self, workflow, headline=None):
        """Execute a workflow in ComfyUI and wait for the result"""
        try:
            # If a headline was provided, do one final check for the Dutch text
            if headline:
                # Check the entire workflow as a string for the Dutch text
                workflow_str = json.dumps(workflow)
                if "Deskundige hulp" in workflow_str:
                    logging.info("Found Dutch text in serialized workflow, attempting replacement")
                    workflow_str = workflow_str.replace("Deskundige hulp in het Nederlands, 24/7/365 beschikbaar", headline)
                    # Parse back to dict
                    workflow = json.loads(workflow_str)
                    logging.info("Replaced Dutch text in serialized workflow")
            
            if not self.initialize():
                return None
            
            if not workflow:
                logging.error("No workflow provided")
                return None
            
            # Convert from editor format to API format if needed
            api_prompt = {}
            if "nodes" in workflow:
                # This is editor format, convert to API format
                logging.info("Converting workflow from editor format to API format")
                for node_id, node_data in workflow["nodes"].items():
                    # Create API node format
                    api_node = {
                        "class_type": node_data.get("type", ""),
                        "inputs": {}
                    }
                    
                    # Copy inputs
                    for input_name, input_value in node_data.get("inputs", {}).items():
                        api_node["inputs"][input_name] = input_value
                    
                    # Add to API prompt
                    api_prompt[node_id] = api_node
                    
                logging.info(f"Converted {len(api_prompt)} nodes to API format")
            else:
                # Already in API format
                api_prompt = workflow
            
            # Log the API prompt structure for debugging
            logging.info(f"Sending API prompt: {json.dumps(api_prompt)[:200]}...")
            
            # Send the API request
            response = requests.post(
                f"{self.comfy_url}/prompt", 
                json={"prompt": api_prompt}
            )
            
            if not response.ok:
                logging.error(f"Failed to send workflow to ComfyUI: {response.text}")
                return None
            
            prompt_id = response.json()['prompt_id']
            
            # After sending the API request
            logging.info(f"ComfyUI API response: {response.text}")
            
            # After getting the prompt_id in run_workflow
            logging.info(f"Got prompt_id: {prompt_id}, waiting for completion...")
            
            # Wait a moment for the workflow to execute
            time.sleep(3)  # Increase to 3 seconds
            
            # Directory to watch for new files
            output_dir = os.path.join(self.project_root, 'ComfyUI', 'output')
            logging.info(f"Checking for output files in: {output_dir}")
            
            # Log all files in the directory before and after
            if os.path.exists(output_dir):
                logging.info(f"Files in output directory before: {os.listdir(output_dir)}")
            
            # Record files before execution to compare
            files_before = set(os.listdir(output_dir)) if os.path.exists(output_dir) else set()
            
            # Wait for up to 30 seconds for new files to appear
            max_wait = 30
            for i in range(max_wait):
                # Check for new files
                if os.path.exists(output_dir):
                    current_files = set(os.listdir(output_dir))
                    # Log all files currently in directory
                    logging.info(f"Current files in output directory ({i}s): {current_files}")
                    
                    new_files = current_files - files_before
                    logging.info(f"New files found: {new_files}")
                    
                    # Check for any branded_asset file (more permissive check)
                    branded_files = []
                    for file in current_files:
                        if 'branded_asset' in file:
                            branded_files.append(file)
                    
                    logging.info(f"Branded files found: {branded_files}")
                    
                    if branded_files:
                        # Sort by modification time to get the newest file
                        newest_file = max(
                            branded_files,
                            key=lambda f: os.path.getmtime(os.path.join(output_dir, f))
                        )
                        logging.info(f"Found output file: {newest_file}")
                        
                        output_path = os.path.join(output_dir, newest_file)
                        logging.info(f"Final output path: {output_path}")
                        
                        # Make sure the static/output directory exists for web serving
                        static_output_dir = os.path.join(self.project_root, 'static', 'output')
                        os.makedirs(static_output_dir, exist_ok=True)
                        
                        # Copy the file to the static output directory with a timestamp filename
                        timestamp = int(time.time())
                        filename = f"branded_asset_{timestamp}{os.path.splitext(newest_file)[1]}"
                        web_output_path = os.path.join(static_output_dir, filename)
                        
                        # Add this logging statement
                        logging.info(f"ComfyUI output file: {output_path}")
                        logging.info(f"Web accessible path: {web_output_path}")
                        
                        # Copy the file to the static output location
                        shutil.copy(output_path, web_output_path)
                        
                        # After copying the file
                        if os.path.exists(output_path):
                            logging.info(f"Original file exists at: {output_path}")
                        else:
                            logging.error(f"Original file NOT found at: {output_path}")
                        
                        if os.path.exists(web_output_path):
                            logging.info(f"Copied file exists at: {web_output_path}")
                        else:
                            logging.error(f"Copied file NOT found at: {web_output_path}")
                        
                        # Return the web-accessible path
                        return web_output_path
                
                # Wait before checking again
                time.sleep(1)
            
            # If we get here, no files were found
            # Check for any branded_asset file regardless of creation time
            if os.path.exists(output_dir):
                all_files = os.listdir(output_dir)
                # Get all files with 'branded_asset' in the name
                branded_files = [f for f in all_files if 'branded_asset' in f]
                
                if branded_files:
                    logging.info(f"Found existing branded files: {branded_files}")
                    # Use the newest one
                    newest_file = max(
                        branded_files,
                        key=lambda f: os.path.getmtime(os.path.join(output_dir, f))
                    )
                    logging.info(f"Using existing output file: {newest_file}")
                    
                    output_path = os.path.join(output_dir, newest_file)
                    # Continue with existing code...
                    
                    # Make sure the static/output directory exists for web serving
                    static_output_dir = os.path.join(self.project_root, 'static', 'output')
                    os.makedirs(static_output_dir, exist_ok=True)
                    
                    # Copy the file to the static output directory with a timestamp filename
                    timestamp = int(time.time())
                    filename = f"branded_asset_{timestamp}{os.path.splitext(newest_file)[1]}"
                    web_output_path = os.path.join(static_output_dir, filename)
                    
                    # Copy the file to the static output location
                    shutil.copy(output_path, web_output_path)
                    
                    # Return the web-accessible path
                    return web_output_path
            
            logging.error(f"No output files found after {max_wait} seconds")
            return None
            
        except Exception as e:
            logging.error(f"Error running ComfyUI workflow: {str(e)}")
            logging.error(traceback.format_exc())
            return None

    def test_workflow(self):
        """Test a minimal workflow"""
        # Create a minimal test workflow
        test_workflow = {
            "1": {
                "inputs": {
                    "image": "test.jpg"
                },
                "class_type": "LoadImage"
            },
            "2": {
                "inputs": {
                    "images": ["1", 0]
                },
                "class_type": "PreviewImage"
            }
        }
        
        # Send the request
        response = requests.post(
            f"{self.comfy_url}/prompt", 
            json={"prompt": test_workflow}
        )
        
        logging.info(f"Test workflow response: {response.text}")
        return response.ok

    def apply_branding(self, image_path, headline=None, tc_text=None):
        """Apply branding template to an image with custom headline and T&C text"""
        try:
            # Download image first if it's a URL
            local_image_path = image_path
            if image_path.startswith(('http://', 'https://')):
                # Create a temp file to store the downloaded image
                temp_dir = os.path.join(self.project_root, 'static', 'temp')
                os.makedirs(temp_dir, exist_ok=True)
                
                # Generate a filename from the URL
                file_extension = image_path.split('?')[0].split('.')[-1]
                if file_extension not in ['jpg', 'jpeg', 'png', 'webp', 'gif']:
                    file_extension = 'jpg'  # Default to jpg
                
                # Create a unique filename
                filename = f"temp_{int(time.time())}_{uuid.uuid4().hex[:8]}.{file_extension}"
                local_image_path = os.path.join(temp_dir, filename)
                
                # Download the image
                logging.info(f"Downloading image from URL: {image_path}")
                response = requests.get(image_path, stream=True)
                response.raise_for_status()
                
                with open(local_image_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                    
                logging.info(f"Downloaded image to: {local_image_path}")
            
            # Load the v2 template which is already in API format
            workflow_path = os.path.join(self.project_root, 'ComfyUI', 'user', 'default', 'workflows', '9_16_template_v2.json')
            workflow = self.load_workflow(workflow_path)
            
            if not workflow:
                logging.error("Failed to load branding template workflow")
                return None
            
            # Print the entire workflow to debug
            logging.debug(f"Loaded workflow: {json.dumps(workflow, indent=2)}")
            
            # Track if we found and replaced the text
            headline_replaced = False
            tc_text_replaced = False
            
            # First, modify the image path
            for node_id, node_data in workflow.items():
                if node_data.get('class_type') == 'LoadImage' and node_data['inputs'].get('upload') == 'image':
                    if node_data['inputs'].get('image') == 'testcoin.jpeg':  # This is the main image to replace
                        node_data['inputs']['image'] = local_image_path
                        logging.info(f"Set main image input to {local_image_path}")
            
            # Now focus exclusively on TextOverlay nodes
            for node_id, node_data in workflow.items():
                if node_data.get('class_type') == 'TextOverlay':
                    logging.info(f"TextOverlay node found: {node_id}")
                    
                    # Check all inputs for this node
                    for input_key, input_value in node_data.get('inputs', {}).items():
                        logging.info(f"  Input {input_key}: {input_value}")
                        
                    # Specifically look for the 'text' field
                    if 'text' in node_data.get('inputs', {}):
                        current_text = node_data['inputs']['text']
                        logging.info(f"  Current text: '{current_text}'")
                        
                        # Check if this is the headline text (usually shorter)
                        if len(current_text) < 100 and headline and not headline_replaced:
                            old_text = node_data['inputs']['text']
                            node_data['inputs']['text'] = headline
                            logging.info(f"  REPLACED HEADLINE: '{old_text}' → '{headline}'")
                            headline_replaced = True
                        # Check if this is the T&C text (usually longer)
                        elif len(current_text) >= 100 and tc_text and not tc_text_replaced:
                            old_text = node_data['inputs']['text']
                            node_data['inputs']['text'] = tc_text
                            logging.info(f"  REPLACED T&C TEXT: '{old_text}' → '{tc_text}'")
                            tc_text_replaced = True
            
            # If we still haven't replaced headline text, use the string replacement approach
            if headline and not headline_replaced:
                logging.warning("No headline TextOverlay.text was found, trying direct string replacement")
                workflow_str = json.dumps(workflow)
                if "Deskundige hulp" in workflow_str:
                    logging.info("Found Dutch headline text in workflow JSON")
                    workflow_str = workflow_str.replace("Deskundige hulp in het Nederlands, 24/7/365 beschikbaar", headline)
                    # Parse back to dict
                    workflow = json.loads(workflow_str)
                    logging.info(f"Replaced Dutch headline text with: '{headline}'")
                    headline_replaced = True
            
            # If we still haven't replaced T&C text, use the string replacement approach
            if tc_text and not tc_text_replaced:
                logging.warning("No T&C TextOverlay.text was found, trying direct string replacement")
                workflow_str = json.dumps(workflow)
                default_tc = "OKX is de handelsnaam van OKCoin Europe Ltd, een in Malta geregistreerd bedrijf, dat een licentie heeft van de MFSA als VASP (Virtual Asset Service Provider). Dit is geen aanbod of uitnodiging om digitale activa te kopen, verkopen of aan te houden, die onderhevig zijn aan volatiliteit en risico met zich meebrengen. Voorwaarden van toepassing. Afbeelding gemaakt met AI."
                if default_tc in workflow_str:
                    logging.info("Found default T&C text in workflow JSON")
                    workflow_str = workflow_str.replace(default_tc, tc_text)
                    # Parse back to dict
                    workflow = json.loads(workflow_str)
                    logging.info(f"Replaced default T&C text with custom T&C")
                    tc_text_replaced = True
            
            # Run the modified workflow
            output_path = self.run_workflow(workflow)
            
            # Clean up temp file if we downloaded it
            if local_image_path != image_path and os.path.exists(local_image_path):
                os.remove(local_image_path)
            
            return output_path
        except Exception as e:
            logging.error(f"Error applying branding: {str(e)}")
            logging.error(traceback.format_exc())
            return None 