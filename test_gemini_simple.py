#!/usr/bin/env python3

"""
Simple test script following exactly the Gemini documentation example
for image editing with Gemini 2.0 Flash Experimental
"""

import os
from dotenv import load_dotenv
import google.generativeai as genai
from google.generativeai import types
from PIL import Image
from io import BytesIO
import base64

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

# Initialize the client as in the docs example
client = genai.Client(api_key=api_key)

# Create the prompt
text_prompt = "Edit this image: Add fluffy clouds to the sky"

print(f"Creating client with API key")
print(f"Using prompt: {text_prompt}")

try:
    # Load image
    image = Image.open(image_path)
    
    # Convert to RGB if needed
    if image.mode != "RGB":
        image = image.convert("RGB")
    
    print(f"Image loaded: {image.size}, Mode: {image.mode}")
    
    # Prepare the request
    # This follows the exact pattern from the docs
    print("Sending request to Gemini API...")
    
    # Convert PIL Image to bytes
    img_byte_arr = BytesIO()
    image.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)
    
    # Convert to base64 for debug visibility
    base64_image = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
    print(f"Base64 image length: {len(base64_image)}")
    
    # The API call using the client from the docs
    response = client.models.generate_content(
        model="gemini-2.0-flash-exp-image-generation",
        contents=[
            text_prompt,
            {
                "inline_data": {
                    "mime_type": "image/jpeg",
                    "data": base64_image
                }
            }
        ],
        config=types.GenerateContentConfig(
            response_modalities=["Text", "Image"]
        )
    )
    
    print(f"Response received: {type(response)}")
    
    # Process the response
    if response.candidates:
        print(f"Found {len(response.candidates)} candidates")
        for i, candidate in enumerate(response.candidates):
            print(f"Processing candidate {i+1}")
            if hasattr(candidate, 'content') and candidate.content:
                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        print(f"Text response: {part.text[:100]}")
                    
                    if hasattr(part, 'inline_data') and part.inline_data:
                        print("Image data received!")
                        image_data = part.inline_data.data
                        output_path = f"gemini_edited_image_docs_example.jpg"
                        
                        with open(output_path, 'wb') as f:
                            f.write(base64.b64decode(image_data))
                        
                        print(f"Edited image saved to: {output_path}")
                        print("TEST SUCCESSFUL!")
    else:
        print("No candidates in response")
        print(f"Full response: {response}")
        print("TEST FAILED!")

except Exception as e:
    print(f"ERROR: {str(e)}")
    print("TEST FAILED!") 