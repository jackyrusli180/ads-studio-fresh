import os
import requests
import time
import logging
import ssl

class FluxAPI:
    def __init__(self):
        self.api_key = "e5d9929d-54af-4f77-aa79-76f96b8ffd75"
        self.base_url = "https://api.us1.bfl.ai/v1"
        
    def _wait_for_result(self, request_id):
        """Poll for result until ready or timeout"""
        max_attempts = 60  # 30 seconds max wait time
        attempt = 0
        
        while attempt < max_attempts:
            try:
                response = requests.get(
                    f"{self.base_url}/get_result",
                    headers={
                        'accept': 'application/json',
                        'x-key': self.api_key,
                    },
                    params={'id': request_id}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result["status"] == "Ready":
                        return result['result']['sample']
                    elif result["status"] == "Failed":
                        logging.error(f"Generation failed: {result.get('error', 'Unknown error')}")
                        return None
                
                time.sleep(0.5)
                attempt += 1
                
            except Exception as e:
                logging.error(f"Error polling for result: {str(e)}")
                return None
                
        logging.error("Timeout waiting for image generation")
        return None

    def generate_image(self, prompt, resolution="1:1", model="flux-pro-1.1"):
        """Generate image using FLUX API"""
        try:
            # Parse resolution
            if resolution == "1:1":
                width, height = 1024, 1024
            elif resolution == "16:9":
                width, height = 1024, 576
            elif resolution == "9:16":
                width, height = 576, 1024
            else:
                width, height = 1024, 1024  # Default to square
            
            # Make initial request
            response = requests.post(
                f"{self.base_url}/{model}",
                headers={
                    'accept': 'application/json',
                    'x-key': self.api_key,
                    'Content-Type': 'application/json',
                },
                json={
                    'prompt': prompt,
                    'width': width,
                    'height': height,
                }
            )
            
            if response.status_code == 200:
                request_data = response.json()
                request_id = request_data["id"]
                
                # Wait for and return result
                return self._wait_for_result(request_id)
            
            elif response.status_code == 429:
                logging.error("Too many active tasks. Please wait for previous tasks to complete.")
                return None
                
            elif response.status_code == 402:
                logging.error("Out of credits. Please purchase more credits.")
                return None
                
            else:
                logging.error(f"Error making generation request: {response.status_code}")
                return None
                
        except Exception as e:
            logging.error(f"Error generating image: {str(e)}")
            return None

print(ssl.OPENSSL_VERSION) 