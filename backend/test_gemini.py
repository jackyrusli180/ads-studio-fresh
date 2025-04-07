#!/usr/bin/env python3

import google.generativeai as genai
from PIL import Image
import os
from dotenv import load_dotenv
import io
import base64
from datetime import datetime
import sys

# Load environment variables from .env file
load_dotenv()

# Get the API key from environment variable
api_key = os.environ.get('GEMINI_API_KEY')
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables")

print(f"Using API key: {api_key[:5]}...{api_key[-5:]}")

# Configure the Gemini API
genai.configure(api_key=api_key)

def test_image_editing(image_path, prompt):
    """Test image editing with Gemini API"""
    print(f"Loading image from: {image_path}")
    
    # Ensure we're using an absolute path
    if not os.path.isabs(image_path):
        image_path = os.path.join(os.getcwd(), image_path)
    
    print(f"Absolute path: {image_path}")
    
    # Load the image
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image file not found: {image_path}")
    
    # Method 1: Using PIL Image
    try:
        # Open the image
        img = Image.open(image_path)
        
        # Convert image to RGB if needed
        if img.mode != 'RGB':
            print(f"Converting image from {img.mode} to RGB")
            img = img.convert('RGB')
        
        print(f"Image size: {img.size}, Mode: {img.mode}")
        
        # Create the model
        model = genai.GenerativeModel('gemini-2.0-flash-exp-image-generation')
        
        # Create the prompt
        text = f"Edit this image: {prompt}. Please create an edited version of this image according to my instructions."
        
        print(f"Sending prompt: {text}")
        print("Sending request to Gemini API...")
        
        # Method 1: Using direct image object with prompt text
        response = model.generate_content(
            [text, img],
            generation_config={
                "temperature": 0.4,
                "response_mime_type": ["image/jpeg"]
            }
        )
        
        print(f"Response received: {type(response)}")
        
        # Save the edited image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"gemini_edited_image_{timestamp}.jpg"
        
        # Process the response
        if hasattr(response, 'candidates') and response.candidates:
            for candidate in response.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    for part in candidate.content.parts:
                        # Check for text content
                        if hasattr(part, 'text') and part.text:
                            print(f"Text response: {part.text[:100]}")
                        
                        # Check for image content
                        if hasattr(part, 'inline_data') and part.inline_data:
                            print("Image data received")
                            image_data = part.inline_data.data
                            
                            # Check if the data is base64 encoded
                            try:
                                # If it's base64 encoded, decode it
                                if isinstance(image_data, str):
                                    print("Decoding base64 image data")
                                    image_data = base64.b64decode(image_data)
                            except Exception as decode_error:
                                print(f"Error decoding base64 image: {str(decode_error)}")
                            
                            with open(output_path, 'wb') as f:
                                f.write(image_data)
                            print(f"Edited image saved to: {output_path}")
                            
                            # Also open the image to display it
                            edited_img = Image.open(io.BytesIO(image_data))
                            # Don't show the image as it might not work in all environments
                            # edited_img.show()
                            return True
        
        # If we get here, no image was found in the response
        print("No image found in the response")
        print(f"Full response: {response}")
        return False
        
    except Exception as e:
        print(f"Error using Method 1: {str(e)}")
    
    # Method 2: Using binary data with genai.types
    try:
        print("\nTrying alternative method...")
        
        # Convert image to bytes
        img = Image.open(image_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG")
        buffer.seek(0)
        img_bytes = buffer.getvalue()
        base64_image = base64.b64encode(img_bytes).decode('utf-8')
        
        # Create parts for the request using updated API format
        # Create the model
        model = genai.GenerativeModel('gemini-2.0-flash-exp-image-generation')
        
        # Send the request
        print("Sending request with binary data...")
        response = model.generate_content(
            [
                f"Edit this image: {prompt}",
                {"inline_data": {"mime_type": "image/jpeg", "data": base64_image}}
            ],
            generation_config={
                "temperature": 0.4,
                "top_p": 1,
                "top_k": 32,
                "response_mime_type": ["image/jpeg"]
            }
        )
        
        # Process the response
        output_path = f"gemini_edited_image_method2_{timestamp}.jpg"
        if hasattr(response, 'candidates') and response.candidates:
            for candidate in response.candidates:
                if hasattr(candidate, 'content') and candidate.content:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            print("Image data received (Method 2)")
                            image_data = part.inline_data.data
                            
                            # Check if the data is base64 encoded
                            try:
                                # If it's base64 encoded, decode it
                                if isinstance(image_data, str):
                                    print("Decoding base64 image data")
                                    image_data = base64.b64decode(image_data)
                            except Exception as decode_error:
                                print(f"Error decoding base64 image: {str(decode_error)}")
                            
                            with open(output_path, 'wb') as f:
                                f.write(image_data)
                            print(f"Edited image saved to: {output_path}")
                            
                            # Also open the image to display it
                            edited_img = Image.open(io.BytesIO(image_data))
                            # Don't show the image as it might not work in all environments
                            # edited_img.show()
                            return True
        
        print("No image found in the response (Method 2)")
        print(f"Full response: {response}")
        return False
        
    except Exception as e:
        print(f"Error using Method 2: {str(e)}")
        return False

if __name__ == "__main__":
    # Default values
    default_image_path = "media/ai_images/75fb4543-4606-448b-9ab6-712c091041d6.jpg"
    default_prompt = "Make the colors more vibrant and add a blue sky"
    
    # Check for command line arguments
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        # Interactive mode
        image_path = input(f"Enter path to the image file (default: {default_image_path}): ")
        if not image_path:
            image_path = default_image_path
    
    if len(sys.argv) > 2:
        prompt = sys.argv[2]
    else:
        # Interactive mode
        prompt = input(f"Enter editing prompt (default: {default_prompt}): ")
        if not prompt:
            prompt = default_prompt
    
    print("\n=== Testing Gemini Image Editing ===")
    success = test_image_editing(image_path, prompt)
    
    if success:
        print("\n✅ Test completed successfully! Check the output image.")
    else:
        print("\n❌ Test failed. No edited image was created.") 