"""
Simple test script to verify Claude agent works end-to-end.
Tests the flight monitoring flow for SEA → BOS.
"""

import asyncio
import sys
from pathlib import Path

# Ensure project root is on sys.path for local imports
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.claude_service import call_claude_for_monitoring


async def test_simple():
    """Test Claude agent with hardcoded preference."""
    # Hardcoded test values
    user_id = "1ccb1d01-49ea-4bb9-acc4-efb89a3c3c5b"
    preference_id = "9bf3ca74-17f3-4293-9f1b-f02fe11f6a4a"
    
    print("=" * 60)
    print("Testing Claude Agent - SEA → BOS")
    print("=" * 60)
    print(f"User ID: {user_id}")
    print(f"Preference ID: {preference_id}")
    print()
    
    print("Calling Claude...")
    print("-" * 60)
    
    # Call Claude for monitoring
    result = await call_claude_for_monitoring(user_id, preference_id)
    
    print()
    print("=" * 60)
    print("RESULT")
    print("=" * 60)
    
    # Print results with clear formatting
    if "error" in result:
        print(f"❌ Error: {result['error']}")
    else:
        print("✅ Success!")
        print()
        print("Response:")
        print("-" * 60)
        print(result.get("response", "No response text"))
        print()
        
        if "tools_used" in result:
            print(f"Tools Used: {result['tools_used']}")
        
        if "conversation_turns" in result:
            print(f"Conversation Turns: {result['conversation_turns']}")
    
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_simple())
