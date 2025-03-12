import os
from openai import OpenAI
import base64
import requests
import logging
from dotenv import load_dotenv

class OpenAIVision:
    def __init__(self):
        # Get the project root directory
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # Load environment variables from the project root
        load_dotenv(os.path.join(project_root, '.env'))
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OpenAI API key not found in environment variables")
        self.client = OpenAI(api_key=api_key)
        
    def generate_headlines(self, image_url, prompt):
        """Generate headlines based on image using OpenAI Vision"""
        try:
            # If image_url is a URL, download the image
            if image_url.startswith('http'):
                response = requests.get(image_url)
                response.raise_for_status()  # Raise exception for bad status codes
                image_data = base64.b64encode(response.content).decode('utf-8')
            else:
                # If it's a local path, read the file
                if not os.path.exists(image_url):
                    raise FileNotFoundError(f"Image file not found: {image_url}")
                with open(image_url, 'rb') as image_file:
                    image_data = base64.b64encode(image_file.read()).decode('utf-8')
            
            # Make API call to OpenAI
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=300
            )
            
            # Process the response
            headlines = response.choices[0].message.content.split('\n')
            # Clean up empty lines and numbering
            headlines = [h.strip() for h in headlines if h.strip()]
            headlines = [h[2:].strip() if h.startswith(('1.', '2.', '3.')) else h for h in headlines]
            
            return headlines
            
        except requests.exceptions.RequestException as e:
            logging.error(f"Error downloading image: {str(e)}")
            raise Exception("Failed to download image")
        except FileNotFoundError as e:
            logging.error(str(e))
            raise
        except Exception as e:
            logging.error(f"Error generating headlines: {str(e)}")
            raise Exception(f"Failed to generate headlines: {str(e)}") 