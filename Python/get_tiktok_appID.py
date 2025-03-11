import requests
import json

def get_app_list():
    """Retrieve the list of apps and their IDs from TikTok API"""
    access_token = 'b8586d78d2a3d2ae1b542c1e8c99c0e3c82bdaaf'
    advertiser_id = '7470858554736525313'
    
    url = "https://business-api.tiktok.com/open_api/v1.3/app/list/"
    headers = {
        "Access-Token": access_token,
        "Content-Type": "application/json"
    }
    params = {
        "advertiser_id": advertiser_id
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {response.headers}")
        print(f"Raw Response: {response.text}")
        
        response.raise_for_status()
        data = response.json()
        
        if not data.get('data', {}).get('list'):
            print("\nNo apps found in the response")
            print(f"Full response: {json.dumps(data, indent=2)}")
            return
            
        print("\nAll Apps:")
        for app in data.get('data', {}).get('list', []):
            print(f"App Name: {app.get('app_name')}")
            print(f"Package Name: {app.get('package_name')}")
            print(f"App ID: {app.get('app_id')}")
            print(f"Platform: {app.get('platform')}")
            print("-" * 50)
            
            if app.get('package_name') == 'com.okx.tr':
                print("\nFound OKX App:")
                print(f"App ID for com.okx.tr: {app.get('app_id')}")
                
    except requests.exceptions.RequestException as e:
        print(f"Error retrieving app list: {str(e)}")
        if hasattr(e, 'response'):
            print(f"Error Response: {e.response.text}")
        raise

if __name__ == "__main__":
    get_app_list() 