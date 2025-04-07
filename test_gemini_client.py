#!/usr/bin/env python3

"""
Test script for image editing using Gemini 2.0 Flash Experimental
Following the exact format from the latest Google documentation
"""

import os
from dotenv import load_dotenv
from google import genai
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

# Initialize the Client - new SDK approach
client = genai.Client(api_key=api_key)

# Load and prepare the image
image = Image.open(image_path)
if image.mode != "RGB":
    image = image.convert("RGB")

print(f"Image loaded: {image.size}, Mode: {image.mode}")

# Convert image to base64
img_byte_arr = BytesIO()
image.save(img_byte_arr, format='JPEG')
img_byte_arr.seek(0)
base64_image = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
print(f"Base64 image length: {len(base64_image)}")

# Create the prompt
text_prompt = "Edit this image: Add fluffy clouds to the sky. Only respond with an edited image."

print(f"Using prompt: {text_prompt}")
print("Sending request to Gemini API...")

try:
    # Make the API call using the new SDK approach
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
        config={
            "response_modalities": ["Text", "Image"]
        }
    )
    
    print(f"Response received: {type(response)}")
    
    # Print raw response for debugging
    print(f"Raw Response: {response}")
    
    # Process the response - new approach for SDK
    if hasattr(response, 'parts'):
        print(f"Checking response.parts directly")
        for part in response.parts:
            if hasattr(part, 'text') and part.text:
                print(f"Text from parts: {part.text[:100]}")
            if hasattr(part, 'inline_data') and part.inline_data:
                print("Image data from parts received!")
                try:
                    image_data = part.inline_data.data
                    output_path = "gemini_edited_client.jpg"
                    with open(output_path, 'wb') as f:
                        f.write(image_data)
                    print(f"Image saved to: {output_path}")
                    print("TEST SUCCESSFUL!")
                except Exception as e:
                    print(f"Error processing image: {e}")
    
    # Try the response.candidates[0].content.parts approach
    elif hasattr(response, 'candidates') and response.candidates:
        print(f"Found {len(response.candidates)} candidates")
        for candidate in response.candidates:
            if hasattr(candidate, 'content') and candidate.content:
                if hasattr(candidate.content, 'parts'):
                    for part in candidate.content.parts:
                        if hasattr(part, 'text') and part.text:
                            print(f"Text from candidates: {part.text[:100]}")
                        
                        if hasattr(part, 'inline_data') and part.inline_data:
                            print("Image data from candidates received!")
                            
                            # Get image data
                            image_data = part.inline_data.data
                            
                            # Save the image
                            output_path = "gemini_edited_client.jpg"
                            with open(output_path, 'wb') as f:
                                f.write(image_data)
                            
                            print(f"Edited image saved to: {output_path}")
                            print("TEST SUCCESSFUL!")
    else:
        print("Could not find image data in response structure.")
        print("TEST FAILED!")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    print("TEST FAILED!") 