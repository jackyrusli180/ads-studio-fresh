#!/usr/bin/env python3

"""
Test script for image generation using Imagen 3
Following the official Google AI documentation with adjustments for API version
"""

import google.generativeai as genai
from PIL import Image
from io import BytesIO
import base64
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key
api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not found")

print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")

# Configure the API
genai.configure(api_key=api_key)

# Check if Imagen model is available
print("Checking available models...")
model_name = "imagen-3.0-generate-002"
model_exists = False

for m in genai.list_models():
    if model_name in m.name or "imagen" in m.name.lower():
        print(f"Found Imagen model: {m.name}")
        model_exists = True

if not model_exists:
    print(f"WARNING: Model {model_name} doesn't appear to be in the available models list.")
    print("The Imagen feature might not be available in your current region or API access tier.")
    print("Note: Imagen is only available on the Paid Tier")
    exit(1)

# Create the prompt
prompt = "A serene landscape with mountains and a lake at sunset"

print(f"Using prompt: {prompt}")
print("Sending request to Imagen API...")

try:
    # Create a model instance for Imagen
    model = genai.GenerativeModel(model_name)
    
    # Generate image with the model
    response = model.generate_content(
        prompt,
        generation_config={
            "temperature": 0.4,
        }
    )
    
    print(f"Response received: {type(response)}")
    
    # Process the response
    if hasattr(response, 'candidates') and response.candidates:
        print(f"Found {len(response.candidates)} candidates")
        for candidate in response.candidates:
            if hasattr(candidate, 'content') and candidate.content:
                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        print(f"Text response: {part.text[:100]} [...]")
                    
                    if hasattr(part, 'inline_data') and part.inline_data:
                        print("Image data received!")
                        
                        # Get image data
                        image_data = part.inline_data.data
                        
                        # Handle both binary and base64-encoded data
                        try:
                            # Try to decode if it's base64
                            if isinstance(image_data, str):
                                print("Decoding base64 image")
                                image_data = base64.b64decode(image_data)
                            
                            # Open and save the image
                            image = Image.open(BytesIO(image_data))
                            output_path = "imagen_generated.png"
                            image.save(output_path)
                            
                            print(f"Generated image saved to: {output_path}")
                            print("TEST SUCCESSFUL!")
                        except Exception as img_error:
                            print(f"Error processing image: {str(img_error)}")
    else:
        print("No candidates found in the response")
        if hasattr(response, 'prompt_feedback'):
            print(f"Prompt feedback: {response.prompt_feedback}")
        print(f"Full response: {response}")
    
    print("Processing complete!")
    
except Exception as e:
    print(f"ERROR: {str(e)}")
    print("TEST FAILED!") 