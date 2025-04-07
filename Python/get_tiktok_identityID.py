from __future__ import print_function
import business_api_client
import requests

def initialize_api():
    """Initialize TikTok Ads API"""
    access_token = 'b8586d78d2a3d2ae1b542c1e8c99c0e3c82bdaaf'
    advertiser_id = '7470858554736525313'
    
    # Initialize the API configuration
    configuration = business_api_client.Configuration()
    configuration.access_token = access_token
    configuration.host = "https://business-api.tiktok.com"
    
    # Create API client
    api_client = business_api_client.ApiClient(configuration)
    
    return access_token, advertiser_id

def get_identities(access_token, advertiser_id):
    """Get list of identities for the advertiser"""
    try:
        url = "https://business-api.tiktok.com/open_api/v1.3/identity/get/"
        headers = {
            'Access-Token': access_token,
            'Content-Type': 'application/json'
        }
        
        params = {
            'advertiser_id': str(advertiser_id),
            'page_size': 100,
            'page': 1
        }
        
        print(f"Making request to {url}")
        print(f"Headers: {headers}")
        print(f"Params: {params}")
        
        response = requests.get(url, headers=headers, params=params)
        print(f"Response Status Code: {response.status_code}")
        response_data = response.json()
        print(f"Full API Response: {response_data}")
        
        if response_data.get('code') == 0:
            data = response_data.get('data', {})
            identities = data.get('identity_list', [])
            
            if not identities:
                print("\nNo identities found. This could mean:")
                print("1. The access token might have expired")
                print("2. The advertiser ID might not have any identities")
                print("3. The access token might not have sufficient permissions")
                print(f"\nAdvertiser ID being used: {advertiser_id}")
            else:
                print(f"\nFound {len(identities)} identities:")
                for identity in identities:
                    print(f"\nIdentity ID: {identity.get('identity_id')}")
                    print(f"Display Name: {identity.get('display_name')}")
                    print(f"Identity Type: {identity.get('identity_type')}")
                    if identity.get('profile_image'):
                        print(f"Profile Image: {identity.get('profile_image')}")
                    print("-" * 50)
            return identities
        else:
            print(f"API Error Response: {response_data}")
            raise Exception(f"Failed to get identities: {response_data.get('message')}")
            
    except Exception as e:
        print(f"Error getting identities: {str(e)}")
        raise

def main():
    # Initialize the API
    access_token, advertiser_id = initialize_api()
    
    try:
        # Get list of identities
        identities = get_identities(access_token, advertiser_id)
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")

if __name__ == "__main__":
    main() 