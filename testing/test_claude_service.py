"""
Test script for Claude Service Module

Tests the claude_service.call_claude_for_monitoring function
to verify Claude API integration is working correctly.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path to import backend modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.claude_service import call_claude_for_monitoring
from backend.database import get_supabase


async def test_claude_service():
    """Test the claude_service module with a real preference from the database"""
    
    print("\n" + "="*60)
    print("Claude Service Test")
    print("="*60)
    
    try:
        # Get supabase client
        print("\n[1/3] Connecting to Supabase...")
        supabase = get_supabase()
        print("✓ Supabase connection successful")
        
        # Fetch the first flight preference from the database
        print("\n[2/3] Fetching flight preferences from database...")
        response = supabase.table("flight_preferences").select("id, user_id").limit(1).execute()
        
        if not response.data or len(response.data) == 0:
            print("✗ No flight preferences found in database")
            print("   Please create a flight preference first")
            return
        
        preference = response.data[0]
        user_id = preference["user_id"]
        preference_id = preference["id"]
        
        print(f"✓ Found preference:")
        print(f"  - user_id: {user_id}")
        print(f"  - preference_id: {preference_id}")
        
        # Call claude_service
        print("\n[3/3] Calling Claude API...")
        print("     Sending preference to Claude for analysis...")
        
        result = await call_claude_for_monitoring(user_id, preference_id)
        
        if "error" in result:
            print(f"✗ Claude API error: {result['error']}")
            return
        
        print("✓ Claude API call successful!")
        print("\n" + "-"*60)
        print("Claude Response:")
        print("-"*60)
        print(result["response"])
        print("-"*60)
        
        print("\n" + "="*60)
        print("✓ Test completed successfully!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        print(f"   Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    print("\nRunning Claude Service Integration Test...")
    asyncio.run(test_claude_service())
