#!/usr/bin/env python3

"""
Test script for image generation using Gemini 2.0 Flash Experimental
Following the official Google AI documentation, adjusted for compatibility
"""

import google.generativeai as genai
from PIL import Image
from io import BytesIO
import base64
import os
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

# Get API key
api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not found")

print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")

# Configure the API
genai.configure(api_key=api_key)

# List available models
print("Available models:")
models = list(genai.list_models())
for i, m in enumerate(models[:10]):  # Show first 10 models
    print(f"- {m.name}")

# Check if the model exists
target_model = "gemini-2.0-flash-exp-image-generation"
model_exists = any(target_model in m.name for m in models)

if not model_exists:
    print(f"WARNING: Model {target_model} doesn't appear to be in the available models list.")
    print("The image generation feature might not be available in your current region or API access tier.")
    sys.exit(1)

# Create the prompt - a very simple and safe prompt
contents = "Generate a simple image of a landscape with mountains and a lake."

print(f"Using prompt: {contents}")
print("Sending request to Gemini API...")

try:
    # Create a model instance
    model = genai.GenerativeModel('gemini-2.0-flash-exp-image-generation')
    
    # Make the API call
    response = model.generate_content(
        contents
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
                            output_path = "gemini_generated_image.png"
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