"""
Test script to verify Supabase database connection and query flight preferences.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client

def main():
    # Load environment variables from .env file
    load_dotenv()
    
    # Get Supabase credentials from environment
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    # Validate environment variables
    if not supabase_url or not supabase_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables")
        print("   Please ensure your .env file contains these variables")
        return
    
    try:
        # Connect to Supabase
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Query the flight_preferences table
        response = supabase.table('flight_preferences').select('*').execute()
        
        print("Database connection successful!")
        print()
        
        # Get the data from response
        preferences = response.data
        
        # Print number of preferences found
        print(f"Found {len(preferences)} flight preference(s)")
        print("=" * 60)
        print()
        
        # Print each preference in a readable format
        for i, pref in enumerate(preferences, 1):
            print(f"Preference #{i}")
            print(f"  Preference ID: {pref.get('id', 'N/A')}")
            print(f"  Route: {pref.get('origin', 'N/A')} → {pref.get('destination', 'N/A')}")
            print(f"  Budget: {pref.get('budget', 'N/A')}")
            print(f"  Timeframe: {pref.get('timeframe', 'N/A')}")
            print(f"  Additional Context: {pref.get('additional_context', 'N/A')}")
            print("-" * 60)
            print()
            
    except Exception as e:
        print("Database connection failed!")
        print(f"   Error: {str(e)}")
        print()
        print("   Troubleshooting tips:")
        print("   - Check that your .env file exists in the project root")
        print("   - Verify SUPABASE_URL and SUPABASE_SERVICE_KEY are correct")
        print("   - Ensure you have internet connectivity")
        print("   - Confirm the flight_preferences table exists in your Supabase database")

if __name__ == "__main__":
    main()
