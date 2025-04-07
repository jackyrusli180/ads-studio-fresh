#!/usr/bin/env python3

import google.generativeai as genai
from PIL import Image
import os
from dotenv import load_dotenv
import base64
from io import BytesIO

# Load environment variables
load_dotenv()

# Get API key
api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not found")

print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")

# Set the image path
image_path = "media/ai_images/75fb4543-4606-448b-9ab6-712c091041d6.jpg"
if not os.path.exists(image_path):
    raise FileNotFoundError(f"Image not found: {image_path}")

print(f"Loading image from: {image_path}")

# Configure the API
genai.configure(api_key=api_key)

try:
    # Load image
    img = Image.open(image_path)
    
    # Convert to RGB if needed
    if img.mode != "RGB":
        img = img.convert("RGB")
    
    print(f"Image loaded: {img.size}, Mode: {img.mode}")
    
    # Create the model
    model = genai.GenerativeModel('gemini-1.5-pro')
    
    # Create the prompt
    text_prompt = "Edit this image: Add fluffy clouds to the sky"
    
    print(f"Using prompt: {text_prompt}")
    print("Sending request to Gemini API...")
    
    # Direct image approach
    response = model.generate_content(
        [text_prompt, img],
        generation_config={
            "temperature": 0.4
        }
    )
    
    print(f"Response received: {type(response)}")
    
    # Save the edited image
    output_path = "gemini_direct_image_test.jpg"
    
    # Process the response
    if hasattr(response, 'candidates') and response.candidates:
        print(f"Found {len(response.candidates)} candidates")
        for candidate in response.candidates:
            if hasattr(candidate, 'content') and candidate.content:
                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        print(f"Text response: {part.text[:100]}")
                    
                    if hasattr(part, 'inline_data') and part.inline_data:
                        print("Image data received!")
                        image_data = part.inline_data.data
                        
                        # Try to decode if it's base64
                        try:
                            if isinstance(image_data, str):
                                print("Decoding base64 image")
                                image_data = base64.b64decode(image_data)
                        except Exception as e:
                            print(f"Error decoding base64: {e}")
                        
                        # Save the image
                        with open(output_path, 'wb') as f:
                            f.write(image_data)
                        
                        print(f"Edited image saved to: {output_path}")
                        print("TEST SUCCESSFUL!")
                        exit(0)
    
    print("No image data found in response")
    print(f"Response: {response}")
    print("TEST FAILED!")
    exit(1)
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    print("TEST FAILED!")
    exit(1) 