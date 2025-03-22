#!/usr/bin/env python3
"""
TikTok Long-Term Access Token Generator

This script generates a long-term access token for TikTok API that does not expire.
Uses the TikTok OAuth2 endpoint: https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/
"""
import requests
import json
import argparse
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger('tiktok_token_generator')

# API Endpoint
TOKEN_URL = "https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/"

def generate_long_term_token(app_id, app_secret, auth_code):
    """
    Generate a long-term TikTok access token using OAuth2 flow.
    
    Args:
        app_id (str): Your TikTok app ID
        app_secret (str): Your TikTok app secret
        auth_code (str): Authorization code obtained from the OAuth2 flow
        
    Returns:
        dict: Response containing the access token information
    """
    logger.info("Generating long-term TikTok access token")
    
    # Prepare request body
    payload = {
        "app_id": app_id,
        "secret": app_secret,
        "auth_code": auth_code,
        "grant_type": "auth_code"
    }
    
    # Make the request
    try:
        logger.info("Making request to TikTok API")
        response = requests.post(TOKEN_URL, json=payload)
        response_data = response.json()
        
        # Log the response status
        logger.info(f"API Response Status: {response.status_code}")
        
        # Check for API error
        if response_data.get("code") != 0:
            error_message = response_data.get("message", "Unknown error")
            logger.error(f"API Error: {error_message}")
            logger.error(f"Full response: {json.dumps(response_data, indent=2)}")
            return response_data
        
        # Success case
        access_token = response_data.get("data", {}).get("access_token")
        scope = response_data.get("data", {}).get("scope")
        
        if access_token:
            # The API docs indicate that tokens created with this endpoint don't expire
            logger.info(f"Successfully generated long-term access token")
            logger.info(f"Token scopes: {scope}")
            
            # Save the token to a file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"tiktok_token_{timestamp}.json"
            
            with open(filename, 'w') as f:
                json.dump(response_data, f, indent=2)
            
            logger.info(f"Token saved to {filename}")
            
            # Display masked token for security
            masked_token = access_token[:8] + "*" * (len(access_token) - 16) + access_token[-8:]
            logger.info(f"Access Token: {masked_token}")
            
            return response_data
        else:
            logger.error("No access token found in response")
            logger.error(f"Full response: {json.dumps(response_data, indent=2)}")
            return response_data
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return {"error": str(e)}
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        return {"error": f"JSON decode error: {str(e)}"}
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        return {"error": str(e)}

def main():
    """Main function to run the script"""
    parser = argparse.ArgumentParser(description="Generate a long-term TikTok access token")
    parser.add_argument("--app-id", required=True, help="TikTok App ID")
    parser.add_argument("--app-secret", required=True, help="TikTok App Secret")
    parser.add_argument("--auth-code", required=True, help="Authorization code from OAuth flow")
    
    args = parser.parse_args()
    
    result = generate_long_term_token(args.app_id, args.app_secret, args.auth_code)
    
    if "data" in result and "access_token" in result["data"]:
        print("\nSuccess! Your long-term TikTok access token has been generated and saved.")
    else:
        print("\nFailed to generate token. See logs for details.")

if __name__ == "__main__":
    main()