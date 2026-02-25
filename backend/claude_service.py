"""
Claude API Service Module

This module provides integration with Anthropic's Claude API for autonomous
flight deal monitoring and alert generation.

Functions:
    call_claude_for_monitoring: Calls Claude to analyze user flight preferences
        and generate monitoring and alert recommendations
"""

import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv
from typing import Dict, Any
from pathlib import Path
from datetime import datetime, timezone

from backend.database import get_supabase

# Load environment variables
load_dotenv()

# Get API key from environment
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in environment")

# Create Anthropic client
client = Anthropic(api_key=ANTHROPIC_API_KEY)


async def call_claude_for_monitoring(
    user_id: str, preference_id: str
) -> Dict[str, Any]:
    """
    Calls Claude to monitor a specific user's flight preference and generate
    recommendations for flight deal monitoring and alerts.

    This function retrieves user flight preferences from the database, builds
    a context message with the preference details, and sends it to Claude for
    analysis. Claude evaluates the preferences and provides monitoring guidance.

    Args:
        user_id: The UUID of the user
        preference_id: The UUID of the flight preference to monitor

    Returns:
        Dict containing either:
        - {"response": response_text} on success
        - {"error": error_message} on failure
    """
    try:
        # Get supabase client
        supabase = get_supabase()

        # Query flight_preferences for the given preference_id and user_id
        response = supabase.table("flight_preferences").select("*").eq(
            "id", preference_id
        ).eq("user_id", user_id).execute()

        # Check if preference was found
        if not response.data or len(response.data) == 0:
            return {"error": "Preference not found"}

        # Careful 0 this depends on structure of supabase response
        preference = response.data[0]

        # Load system prompt from backend/system_prompt.md
        system_prompt_path = Path(__file__).parent / "system_prompt.md"
        with open(system_prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()

        # Build user message context with preference details
        context = f"""User Preference (JSON format):
{json.dumps(preference, indent=2)}

Current date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}

Please analyze this user's flight preference and decide:
1. Should you search for flights now based on their alert_frequency?
2. If yes, which specific dates should you search?
3. What's your reasoning?
"""

        # Call Claude API
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4000,
            system=system_prompt,
            messages=[{"role": "user", "content": context}],
        )

        # Extract response text
        response_text = response.content[0].text

        return {"response": response_text}

    except Exception as e:
        return {"error": str(e)}
