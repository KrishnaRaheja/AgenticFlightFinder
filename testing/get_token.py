"""
Script to obtain an authentication token for testing API endpoints.
"""

import sys
from pathlib import Path

# Add workspace root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.database import get_supabase


def get_test_token():
    """
    Get authentication token for testing using test credentials.
    
    Returns:
        str: Authentication access token
    """
    try:
        supabase = get_supabase()
        
        # Sign in with test credentials
        response = supabase.auth.sign_in_with_password({
            "email": "--------------------------------------------",
            "password": "--------------------------------------------"
        })
        
        # Extract access token
        access_token = response.session.access_token
        
        print("\n" + "="*60)
        print("✓ Authentication successful!")
        print("="*60)
        print(f"\nAccess Token:\n{access_token}\n")
        print("="*60 + "\n")
        
        return access_token
        
    except Exception as e:
        print("\n" + "="*60)
        print("✗ Authentication failed!")
        print("="*60)
        print(f"\nError: {str(e)}")
        print("\nPlease ensure:")
        print("  - Test user exists in Supabase with email: test@example.com")
        print("  - Password is set to: testpassword123")
        print("  - Supabase credentials are configured in your environment")
        print("="*60 + "\n")
        return None


if __name__ == "__main__":
    token = get_test_token()
    
    if token:
        print("\nInstructions:")
        print("1. Copy the token above")
        print("2. Go to http://localhost:8000/docs (Swagger UI)")
        print("3. Click the 'Authorize' button")
        print("4. Paste the token in the Bearer token field")
        print("5. Click 'Authorize' and test the endpoints\n")
