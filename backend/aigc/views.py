from django.shortcuts import render
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AIGeneratedImage, AIGeneratedHeadline, AttributeCategory, Attribute, ImageAttribute
from .serializers import AIGeneratedImageSerializer, AIGeneratedHeadlineSerializer, AttributeCategorySerializer
import requests
import os
import json
from django.conf import settings
from PIL import Image, ImageDraw, ImageFont
import textwrap
import io
import base64
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
import logging
import time
from urllib.parse import urlparse
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from PIL import Image as PILImage
from io import BytesIO

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def image_history(request):
    """Get the user's AI image generation history"""
    images = AIGeneratedImage.objects.filter(user=request.user)
    serializer = AIGeneratedImageSerializer(images, many=True)
    return Response({
        'images': serializer.data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_image(request):
    """Generate an AI image based on prompt using Flux API"""
    prompt = request.data.get('prompt')
    resolution = request.data.get('resolution', '1:1')
    model = request.data.get('model', 'flux-pro-1.1')
    regeneration_id = request.data.get('regeneration_id')
    image_prompt = request.data.get('image_prompt')  # Get base64 image prompt if provided
    
    if not prompt:
        return Response({
            'error': 'Prompt is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get dimensions based on resolution
    dimensions = {
        '1:1': (1024, 1024),
        '16:9': (1792, 1024),
        '9:16': (576, 1024)
    }
    width, height = dimensions.get(resolution, (1024, 1024))
    
    # Get API key from environment
    api_key = os.environ.get('BFL_API_KEY')
    if not api_key:
        logger.error("BFL_API_KEY not found in environment variables")
        return Response({
            'error': 'Image generation service not properly configured'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    try:
        # Step 1: Submit request to Flux API
        logger.info(f"Submitting request to Flux API with prompt: {prompt[:50]}...")
        
        # Map our model name to Flux API endpoint
        flux_endpoint = {
            'flux-pro-1.1': 'flux-pro-1.1',
            'flux-pro-1.1-ultra': 'flux-pro-1.1-ultra',
            'flux-pro': 'flux-pro',
            'flux-dev': 'flux-dev'
        }.get(model, 'flux-pro-1.1')
        
        # Prepare request payload
        request_payload = {
            'prompt': prompt,
            'width': width,
            'height': height,
        }
        
        # Add image_prompt if provided
        if image_prompt:
            logger.info("Reference image provided, adding to request as image_prompt")
            request_payload['image_prompt'] = image_prompt
        
        # Create request to Flux API
        flux_response = requests.post(
            f'https://api.us1.bfl.ai/v1/{flux_endpoint}',
            headers={
                'accept': 'application/json',
                'x-key': api_key,
                'Content-Type': 'application/json',
            },
            json=request_payload,
        )
        
        if flux_response.status_code != 200:
            logger.error(f"Flux API request failed: {flux_response.text}")
            return Response({
                'error': f"Image generation failed: {flux_response.text}"
            }, status=status.HTTP_502_BAD_GATEWAY)
        
        request_data = flux_response.json()
        request_id = request_data.get('id')
        
        if not request_id:
            logger.error(f"No request ID in Flux API response: {request_data}")
            return Response({
                'error': 'Failed to get request ID from image generation service'
            }, status=status.HTTP_502_BAD_GATEWAY)
        
        # Step 2: Poll for result
        logger.info(f"Polling for result with request ID: {request_id}")
        max_attempts = 30  # Timeout after ~15 seconds
        attempts = 0
        
        while attempts < max_attempts:
            time.sleep(0.5)  # Wait 500ms between polls
            attempts += 1
            
            result_response = requests.get(
                'https://api.us1.bfl.ai/v1/get_result',
                headers={
                    'accept': 'application/json',
                    'x-key': api_key,
                },
                params={
                    'id': request_id,
                },
            )
            
            if result_response.status_code != 200:
                logger.error(f"Flux API result request failed: {result_response.text}")
                continue
            
            result_data = result_response.json()
            result_status = result_data.get('status')
            
            if result_status == 'Ready':
                # Get the image URL from the result
                image_url = result_data.get('result', {}).get('sample')
                
                if not image_url:
                    logger.error(f"No image URL in Flux API response: {result_data}")
                    return Response({
                        'error': 'Failed to get image URL from service'
                    }, status=status.HTTP_502_BAD_GATEWAY)
                
                # Download the image from the signed URL
                image_response = requests.get(image_url)
                if image_response.status_code != 200:
                    logger.error(f"Failed to download image: {image_response.status_code}")
                    return Response({
                        'error': 'Failed to download generated image'
                    }, status=status.HTTP_502_BAD_GATEWAY)
                
                # Save the image
                image_path = f"ai_images/{uuid.uuid4()}.jpg"
                full_path = os.path.join(settings.MEDIA_ROOT, image_path)
                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                
                with open(full_path, 'wb') as f:
                    f.write(image_response.content)
                
                # Create database entry
                image_url = f"{settings.MEDIA_URL}{image_path}"
                
                # If it's a regeneration, update the existing record with new data
                if regeneration_id:
                    try:
                        original_image = AIGeneratedImage.objects.get(id=regeneration_id, user=request.user)
                        new_image = AIGeneratedImage.objects.create(
                            user=request.user,
                            prompt=prompt,
                            image_url=image_url,
                            resolution=resolution,
                            model_used=model
                        )
                        return Response({
                            'image_url': image_url,
                            'id': new_image.id
                        })
                    except AIGeneratedImage.DoesNotExist:
                        return Response({
                            'error': 'Original image not found'
                        }, status=status.HTTP_404_NOT_FOUND)
                else:
                    # Create a new image entry
                    new_image = AIGeneratedImage.objects.create(
                        user=request.user,
                        prompt=prompt,
                        image_url=image_url,
                        resolution=resolution,
                        model_used=model,
                        used_reference_image=bool(image_prompt)  # Track if reference image was used
                    )
                    
                    return Response({
                        'image_url': image_url,
                        'id': new_image.id
                    })
            
            elif result_status == 'Failed':
                logger.error(f"Flux API generation failed: {result_data}")
                return Response({
                    'error': 'Image generation failed on the service'
                }, status=status.HTTP_502_BAD_GATEWAY)
            
            # If status is 'Pending' or 'Processing', continue polling
            logger.info(f"Generation status: {result_status}, attempt {attempts}/{max_attempts}")
        
        # If we reach here, we've hit the timeout
        logger.error(f"Timed out waiting for image generation after {max_attempts} attempts")
        return Response({
            'error': 'Timed out waiting for image generation'
        }, status=status.HTTP_504_GATEWAY_TIMEOUT)
        
    except Exception as e:
        logger.exception(f"Error generating image: {str(e)}")
        return Response({
            'error': f'Error generating image: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_headlines(request):
    """Generate AI headlines for an image"""
    prompt = request.data.get('prompt')
    image_url = request.data.get('image_url')
    
    if not prompt or not image_url:
        return Response({
            'error': 'Prompt and image_url are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # For demo, generate placeholder headlines
    # In production, this would call an AI service
    headlines = [
        "Trade Like a Pro: Maximize Your Profits Today!",
        "Don't Miss Out: Crypto Trends Changing the Market Now",
        "Limited Time: Join Thousands Making Gains Every Day"
    ]
    
    try:
        # Find the image record to associate headlines with
        image = AIGeneratedImage.objects.get(image_url=image_url)
        
        # Store headlines in database
        for headline in headlines:
            AIGeneratedHeadline.objects.create(
                image=image,
                text=headline
            )
            
        return Response({
            'headlines': headlines
        })
    except AIGeneratedImage.DoesNotExist:
        return Response({
            'error': 'Image not found'
        }, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def apply_branding(request):
    """Apply branding (headline and T&C text) to an image"""
    image_url = request.data.get('image_url')
    headline = request.data.get('headline')
    tc_text = request.data.get('tc_text')
    
    if not image_url:
        return Response({
            'error': 'Image URL is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Get the original image
        image = AIGeneratedImage.objects.get(image_url=image_url)
        
        # Get the actual file path from the URL
        relative_path = image_url.replace(settings.MEDIA_URL, '')
        img_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        
        if not os.path.exists(img_path):
            return Response({
                'error': 'Image file not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Open and process the image
        img = Image.open(img_path)
        draw = ImageDraw.Draw(img)
        width, height = img.size
        
        # Add headline text if provided
        if headline:
            try:
                # For a real implementation, use proper font paths
                # font_path = os.path.join(settings.BASE_DIR, 'static/fonts/Arial.ttf')
                # font = ImageFont.truetype(font_path, 40)
                font = ImageFont.load_default()
                
                # Draw headline at the top
                draw.rectangle([(0, 0), (width, 80)], fill=(0, 0, 0, 180))
                draw.text((20, 20), headline, fill=(255, 255, 255), font=font)
            except Exception as e:
                logger.error(f"Error adding headline: {e}")
        
        # Add T&C text if provided
        if tc_text:
            try:
                # font_small = ImageFont.truetype(font_path, 20)
                font_small = ImageFont.load_default()
                
                # Wrap text to fit width
                margin = 20
                tc_y_position = height - 100
                
                # Draw background for T&C
                draw.rectangle([(0, tc_y_position - margin), (width, height)], fill=(0, 0, 0, 180))
                
                # Simple text wrapping (in production use proper text wrapping)
                lines = textwrap.wrap(tc_text, width=60)
                y_text = tc_y_position
                for line in lines:
                    draw.text((margin, y_text), line, font=font_small, fill=(255, 255, 255))
                    y_text += 25
            except Exception as e:
                logger.error(f"Error adding T&C text: {e}")
        
        # Save the branded image
        branded_image_path = f"ai_images/branded_{uuid.uuid4()}.jpg"
        full_branded_path = os.path.join(settings.MEDIA_ROOT, branded_image_path)
        os.makedirs(os.path.dirname(full_branded_path), exist_ok=True)
        img.save(full_branded_path)
        
        # Update the image record
        branded_image_url = f"{settings.MEDIA_URL}{branded_image_path}"
        image.branded_image_url = branded_image_url
        image.headline = headline
        image.tc_text = tc_text
        image.save()
        
        return Response({
            'branded_image_url': branded_image_url
        })
        
    except AIGeneratedImage.DoesNotExist:
        return Response({
            'error': 'Image not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error applying branding: {e}")
        return Response({
            'error': f'Error applying branding: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_for_approval(request):
    """Send an image for approval"""
    image_url = request.data.get('image_url')
    prompt = request.data.get('prompt')
    headline = request.data.get('headline')
    tc_text = request.data.get('tc_text')
    regeneration_id = request.data.get('regeneration_id')
    
    if not image_url:
        return Response({
            'error': 'Image URL is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Find the image by branded_image_url
        image = AIGeneratedImage.objects.get(branded_image_url=image_url)
        
        # Update image status
        image.status = 'pending'
        
        # If regeneration, mark the original as replaced
        if regeneration_id:
            try:
                original_image = AIGeneratedImage.objects.get(id=regeneration_id)
                original_image.status = 'replaced'
                original_image.save()
            except AIGeneratedImage.DoesNotExist:
                pass
        
        # Update other fields if provided
        if prompt:
            image.prompt = prompt
        if headline:
            image.headline = headline
        if tc_text:
            image.tc_text = tc_text
            
        image.save()
        
        return Response({
            'success': True,
            'message': 'Image sent for approval successfully'
        })
        
    except AIGeneratedImage.DoesNotExist:
        return Response({
            'error': 'Image not found'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error sending for approval: {e}")
        return Response({
            'error': f'Error sending for approval: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def creative_detail(request, id):
    """Get details of a specific AI-generated creative"""
    try:
        # Try to find the image by ID
        image = AIGeneratedImage.objects.get(id=id, user=request.user)
        serializer = AIGeneratedImageSerializer(image)
        return Response(serializer.data)
    except AIGeneratedImage.DoesNotExist:
        logger.error(f"Creative with ID {id} not found or not accessible by user {request.user.id}")
        return Response({
            'error': 'Creative not found or you do not have permission to view it'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Error retrieving creative details: {e}")
        return Response({
            'error': f'Error retrieving creative details: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def edit_image(request):
    """Edit an image using Gemini 2.0 Flash Experimental model"""
    try:
        # Get request data
        image_url = request.data.get('image_url')
        prompt = request.data.get('prompt')
        
        if not image_url or not prompt:
            return Response({
                'error': 'Image URL and prompt are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the image file - handle both relative and absolute URLs
        # Strip the domain if it's an absolute URL
        if '://' in image_url:
            # Extract just the path part from the URL
            parsed_url = urlparse(image_url)
            path = parsed_url.path
            if path.startswith('/media/'):
                relative_path = path.replace('/media/', '')
            else:
                return Response({
                    'error': 'Invalid image URL path'
                }, status=status.HTTP_400_BAD_REQUEST)
        elif image_url.startswith(settings.MEDIA_URL):
            relative_path = image_url.replace(settings.MEDIA_URL, '')
        else:
            return Response({
                'error': 'Invalid image URL format'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        image_path = os.path.join(settings.MEDIA_ROOT, relative_path)
        
        if not os.path.exists(image_path):
            logger.error(f"Image file not found: {image_path}")
            return Response({
                'error': 'Image file not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Set up the API - get key from environment or .env file
        api_key = os.environ.get('GEMINI_API_KEY')
        
        # If not in environment variables, try to load from .env file directly
        if not api_key:
            try:
                import dotenv
                from pathlib import Path
                
                # Get the project root directory (where manage.py is)
                base_dir = Path(__file__).resolve().parent.parent
                env_file = os.path.join(base_dir, '.env')
                
                if os.path.exists(env_file):
                    # Load .env file
                    dotenv.load_dotenv(env_file)
                    api_key = os.environ.get('GEMINI_API_KEY')
                    logger.info("Loaded GEMINI_API_KEY from .env file")
            except Exception as env_error:
                logger.error(f"Error loading .env file: {env_error}")
        
        # If still not found, use the API key provided by the user
        if not api_key:
            api_key = 'AIzaSyBkBGfLEKJu85ujuWHn8aHeYtN8Ub42b-U'
            logger.warning("Using provided GEMINI_API_KEY as fallback")
                
        if not api_key:
            logger.error("GEMINI_API_KEY not found in environment variables or .env file")
            return Response({
                'error': 'Image editing service not properly configured'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        logger.info(f"Using Gemini API Key: {api_key[:5]}...{api_key[-5:]}")
        
        try:
            # Initialize the Gemini API with the correct method
            client = genai.Client(api_key=api_key)
            
            # Open and prepare the image
            img = PILImage.open(image_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
                
            # Create the prompt
            text_input = f"Edit this image: {prompt}. Only respond with an edited image."
            
            # Prepare the image
            img_bytes = BytesIO()
            img.save(img_bytes, format='JPEG')
            img_bytes = img_bytes.getvalue()
            
            # Convert to base64-encoded string
            base64_image = base64.b64encode(img_bytes).decode('utf-8')
            
            # Log the model we're going to use
            model_name = 'gemini-2.0-flash-exp-image-generation'
            logger.info(f"Using Gemini model: {model_name}")
            
            # Log details about the request
            logger.info(f"Calling Gemini API with prompt: {text_input[:50]}...")
            
            # Make API call with the client approach
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    text_input, 
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg", 
                            "data": base64_image
                        }
                    }
                ],
                config={
                    "temperature": 0.4,
                    "response_modalities": ["Text", "Image"]
                }
            )
            
            logger.info(f"Received response from Gemini API: {type(response)}")
            
            # Log response details for debugging
            logger.info(f"Response dir: {dir(response)}")
            logger.info(f"Response attributes: {[attr for attr in dir(response) if not attr.startswith('_')]}")
            
            # Process the response - improved error handling
            if not response:
                logger.error("Empty response from Gemini API")
                return Response({
                    'error': 'Empty response from image editing service'
                }, status=status.HTTP_502_BAD_GATEWAY)
            
            # Initialize result
            result = {'parts': []}
            
            # Extract text response if available
            if hasattr(response, 'text') and response.text:
                logger.info(f"Response contains text: {response.text[:100]}...")
                result['parts'].append({
                    'type': 'text',
                    'text': response.text
                })
            
            # Extract image data from response parts
            try:
                # Check for parts in response
                if hasattr(response, 'parts'):
                    logger.info(f"Found {len(response.parts)} parts in response")
                    
                    for part in response.parts:
                        # Check for text parts
                        if hasattr(part, 'text') and part.text:
                            logger.info(f"Found text part: {part.text[:50]}...")
                            
                        # Handle image parts
                        if hasattr(part, 'inline_data') and part.inline_data:
                            logger.info(f"Found inline image data, mime type: {part.inline_data.mime_type}")
                            
                            if part.inline_data.mime_type.startswith('image/'):
                                image_data = part.inline_data.data
                                
                                # Handle base64 encoded data
                                if isinstance(image_data, str):
                                    logger.info("Decoding base64 image data")
                                    try:
                                        image_data = base64.b64decode(image_data)
                                    except Exception as decode_error:
                                        logger.error(f"Error decoding base64 image: {str(decode_error)}")
                                
                                # Create a unique filename for the edited image
                                image_path = f"ai_images/edited_{uuid.uuid4()}.jpg"
                                full_path = os.path.join(settings.MEDIA_ROOT, image_path)
                                os.makedirs(os.path.dirname(full_path), exist_ok=True)
                                
                                # Save the image to disk
                                with open(full_path, 'wb') as f:
                                    f.write(image_data)
                                
                                # Create database entry
                                image_url = f"{settings.MEDIA_URL}{image_path}"
                                edited_image = AIGeneratedImage.objects.create(
                                    user=request.user,
                                    prompt=f"[Edited] {prompt}",
                                    image_url=image_url,
                                    resolution="1:1",
                                    model_used="gemini-2.0-flash-exp-image-generation"
                                )
                                
                                # Convert to base64 for frontend
                                image_base64 = base64.b64encode(image_data).decode('utf-8')
                                
                                result['parts'].append({
                                    'type': 'image',
                                    'data': image_base64,
                                    'image_url': image_url,
                                    'image_id': edited_image.id
                                })
                                
                                logger.info(f"Successfully processed and saved edited image: {image_url}")
                elif hasattr(response, 'candidates') and response.candidates:
                    logger.info(f"Found candidates in response: {len(response.candidates)}")
                    
                    for candidate in response.candidates:
                        if hasattr(candidate, 'content') and candidate.content:
                            if hasattr(candidate.content, 'parts'):
                                for part in candidate.content.parts:
                                    if hasattr(part, 'text') and part.text:
                                        logger.info(f"Found text in candidate: {part.text[:50]}...")
                                    
                                    if hasattr(part, 'inline_data') and part.inline_data:
                                        logger.info(f"Found inline image data in candidate")
                                        image_data = part.inline_data.data
                                        
                                        # Handle base64 encoded data
                                        if isinstance(image_data, str):
                                            logger.info("Decoding base64 image data")
                                            try:
                                                image_data = base64.b64decode(image_data)
                                            except Exception as decode_error:
                                                logger.error(f"Error decoding base64 image: {str(decode_error)}")
                                        
                                        # Create a unique filename for the edited image
                                        image_path = f"ai_images/edited_{uuid.uuid4()}.jpg"
                                        full_path = os.path.join(settings.MEDIA_ROOT, image_path)
                                        os.makedirs(os.path.dirname(full_path), exist_ok=True)
                                        
                                        # Save the image to disk
                                        with open(full_path, 'wb') as f:
                                            f.write(image_data)
                                        
                                        # Create database entry
                                        image_url = f"{settings.MEDIA_URL}{image_path}"
                                        edited_image = AIGeneratedImage.objects.create(
                                            user=request.user,
                                            prompt=f"[Edited] {prompt}",
                                            image_url=image_url,
                                            resolution="1:1",
                                            model_used="gemini-2.0-flash-exp-image-generation"
                                        )
                                        
                                        # Convert to base64 for frontend
                                        image_base64 = base64.b64encode(image_data).decode('utf-8')
                                        
                                        result['parts'].append({
                                            'type': 'image',
                                            'data': image_base64,
                                            'image_url': image_url,
                                            'image_id': edited_image.id
                                        })
                                        
                                        logger.info(f"Successfully processed and saved edited image: {image_url}")
                                        
            except Exception as parse_error:
                logger.exception(f"Error extracting image from response: {str(parse_error)}")
            
            # If no image was found in the response
            if not any(part.get('type') == 'image' for part in result['parts']):
                logger.error("No image found in the Gemini API response")
                return Response({
                    'error': 'No image was generated by the editing service'
                }, status=status.HTTP_502_BAD_GATEWAY)
                
            return Response(result)
            
        except Exception as api_error:
            logger.exception(f"Error in Gemini API call: {str(api_error)}")
            # Check for specific API errors
            if hasattr(genai, 'errors') and isinstance(api_error, genai_errors.APIError):
                if api_error.code == 404:
                    return Response({
                        'error': 'The image editing model was not found.',
                        'details': str(api_error)
                    }, status=status.HTTP_404_NOT_FOUND)
                elif api_error.code == 403:
                    return Response({
                        'error': 'Access to the image editing model is forbidden. Check your API key permissions.',
                        'details': str(api_error)
                    }, status=status.HTTP_403_FORBIDDEN)
                else:
                    return Response({
                        'error': f'API Error (code {api_error.code}): {api_error.message}',
                        'details': str(api_error)
                    }, status=status.HTTP_400_BAD_REQUEST)
            elif "is not found for API version" in str(api_error):
                return Response({
                    'error': 'The image editing model is not available in your current API tier. You may need to upgrade to a paid tier.',
                    'details': str(api_error)
                }, status=status.HTTP_402_PAYMENT_REQUIRED)
            elif "bad argument type for built-in operation" in str(api_error):
                # Likely an issue with the data format
                return Response({
                    'error': 'Error processing image for editing. Please check image format.',
                    'details': str(api_error),
                    'troubleshooting': 'This may be due to incompatible image format or data encoding.'
                }, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({
                    'error': f'Error from Gemini API: {str(api_error)}'
                }, status=status.HTTP_502_BAD_GATEWAY)
            
    except Exception as e:
        logger.exception(f"Error editing image: {str(e)}")
        return Response({
            'error': f'Error editing image: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_attribute_categories(request):
    """Get all attribute categories with their attributes"""
    categories = AttributeCategory.objects.all().prefetch_related('attributes')
    serializer = AttributeCategorySerializer(categories, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_attributes(request, image_id):
    """Assign attributes to an image"""
    try:
        image = AIGeneratedImage.objects.get(id=image_id, user=request.user)
    except AIGeneratedImage.DoesNotExist:
        return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Validate input
    attributes = request.data.get('attributes', [])
    if not isinstance(attributes, list):
        return Response({'error': 'Attributes must be an array'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Clear existing attributes if replace flag is set
    if request.data.get('replace', False):
        ImageAttribute.objects.filter(image=image).delete()
    
    # Add new attributes
    for attr_data in attributes:
        attribute_id = attr_data.get('id')
        confidence = float(attr_data.get('confidence', 1.0))
        is_verified = bool(attr_data.get('is_verified', True))
        
        try:
            attribute = Attribute.objects.get(id=attribute_id)
            ImageAttribute.objects.update_or_create(
                image=image,
                attribute=attribute,
                defaults={
                    'confidence': confidence,
                    'is_verified': is_verified
                }
            )
        except Attribute.DoesNotExist:
            # Skip invalid attributes
            continue
    
    # Refresh the image to get the updated attributes
    image = AIGeneratedImage.objects.get(id=image_id)
    serializer = AIGeneratedImageSerializer(image)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def filter_images_by_attributes(request):
    """Filter images by attributes"""
    # Get attribute IDs from query params
    attribute_ids = request.query_params.getlist('attribute_id', [])
    
    # If no attributes specified, return empty list
    if not attribute_ids:
        return Response({'images': []})
    
    # Convert to integers
    try:
        attribute_ids = [int(attr_id) for attr_id in attribute_ids]
    except ValueError:
        return Response({'error': 'Invalid attribute ID'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Find images that have ALL the specified attributes
    images = AIGeneratedImage.objects.filter(
        user=request.user,
        imageattribute__attribute_id__in=attribute_ids
    ).distinct()
    
    # If multiple attributes are specified, ensure all are present
    if len(attribute_ids) > 1:
        for attr_id in attribute_ids:
            images = images.filter(imageattribute__attribute_id=attr_id)
    
    serializer = AIGeneratedImageSerializer(images, many=True)
    return Response({'images': serializer.data})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auto_tag_image(request, image_id):
    """Automatically tag an image based on its prompt"""
    try:
        image = AIGeneratedImage.objects.get(id=image_id, user=request.user)
    except AIGeneratedImage.DoesNotExist:
        return Response({'error': 'Image not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Extract keywords from prompt
    prompt = image.prompt.lower()
    
    # Get all attributes
    attributes = Attribute.objects.all()
    
    # Simple keyword matching (in a real app, use AI for better tagging)
    assigned_attributes = []
    for attribute in attributes:
        # If attribute name appears in prompt, tag it
        if attribute.name.lower() in prompt:
            image_attr, created = ImageAttribute.objects.get_or_create(
                image=image,
                attribute=attribute,
                defaults={
                    'confidence': 0.8,  # Medium-high confidence for keyword matches
                    'is_verified': False  # Not verified by human
                }
            )
            assigned_attributes.append(attribute.name)
    
    return Response({
        'message': f'Auto-tagged image with attributes: {", ".join(assigned_attributes)}',
        'attributes': assigned_attributes
    })
