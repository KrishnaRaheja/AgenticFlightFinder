"""
Test script to verify authentication works with the API.
"""

import sys
from pathlib import Path
import requests
import json

# Add workspace root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from testing.get_token import get_test_token


def test_authentication():
    """
    Test authentication by making an authenticated API request.
    """
    print("\n" + "="*60)
    print("Testing Authentication")
    print("="*60 + "\n")
    
    # Get authentication token
    print("Step 1: Obtaining authentication token...")
    token = get_test_token()
    
    if not token:
        print("Failed to obtain token. Exiting.")
        return
    
    # Setup API endpoint
    api_url = "http://localhost:8000/api/preferences/"
    
    # Create headers with Bearer token
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Create test preference data
    test_data = {
        "origin": "JFK",
        "destination": "LAX",
        "timeframe": "next_month",
        "max_stops": 1,
        "cabin_class": "economy",
        "budget": 500,
        "nearby_airports": True,
        "date_flexibility": "flexible",
        "priority": "price",
        "prefer_non_work_days": False,
        "alert_frequency": "daily",
        "additional_context": "Test preference for authentication verification"
    }
    
    # Make POST request
    print(f"\nStep 2: Making POST request to {api_url}")
    print(f"Sending test preference: {json.dumps(test_data, indent=2)}\n")
    
    try:
        response = requests.post(api_url, json=test_data, headers=headers)
        
        print("="*60)
        print(f"Response Status Code: {response.status_code}")
        print("="*60)
        print(f"Response Body:\n{json.dumps(response.json(), indent=2)}\n")
        
        if response.status_code == 401:
            print("✗ Authentication failed - received 401 Unauthorized")
            print("Please verify:")
            print("  - Token is valid")
            print("  - Bearer token is correctly formatted in headers")
            print("  - Backend server is running")
            
        elif response.status_code == 200 or response.status_code == 201:
            print("✓ Success! Authentication is working correctly")
            print("API accepted the authenticated request and created the preference")
            
        else:
            print(f"✓ Request was authenticated (not 401)")
            print(f"Response status: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("✗ Connection Error: Unable to connect to http://localhost:8000")
        print("Please ensure the backend server is running:")
        print("  python backend/main.py")
        
    except Exception as e:
        print(f"✗ Error during request: {str(e)}")


if __name__ == "__main__":
    test_authentication()
