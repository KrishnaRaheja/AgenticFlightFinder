"""
Claude API Service Module

This module provides integration with Anthropic's Claude API for autonomous
flight deal monitoring and alert generation with tool use capabilities.

Functions:
    call_claude_for_monitoring: Calls Claude to analyze user flight preferences,
        execute flight searches, store data, and generate monitoring decisions
"""

import os
import json
import uuid
from anthropic import Anthropic
from dotenv import load_dotenv
from typing import Dict, Any, List
from pathlib import Path
from datetime import datetime, timezone, timedelta
import logging

from backend.database import get_supabase
from backend.email_service import send_email
from backend.adapters.flights.fast_flights_adapter import FastFlightsAdapter

# Set up logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get API key from environment
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in environment")

# Create Anthropic client
client = Anthropic(api_key=ANTHROPIC_API_KEY)

# Initialize flight search adapter
flight_adapter = FastFlightsAdapter()


# ============================================================================
# TOOL DEFINITIONS
# ============================================================================

def get_tool_definitions() -> List[Dict[str, Any]]:
    """
    Define all available tools for Claude to use.
    
    Returns:
        List of tool definitions in Anthropic API format
    """
    return [
        {
            "name": "search_flights",
            "description": "Search for flights using FastFlightsAdapter. Returns a list of flight itineraries with price, duration, stops, airline, and departure/arrival times.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "origin": {
                        "type": "string",
                        "description": "3-letter IATA airport code for departure (e.g., 'SFO', 'DEL', 'JFK')"
                    },
                    "destination": {
                        "type": "string",
                        "description": "3-letter IATA airport code for arrival (e.g., 'DEL', 'LHR', 'CDG')"
                    },
                    "departure_date": {
                        "type": "string",
                        "description": "Departure date in YYYY-MM-DD format (e.g., '2026-03-15')"
                    },
                    "trip_type": {
                        "type": "string",
                        "enum": ["one-way", "round-trip"],
                        "description": "Trip type. Use 'round-trip' only when return_date is also provided. Default: 'one-way'"
                    },
                    "return_date": {
                        "type": "string",
                        "description": "Return date in YYYY-MM-DD format. Required when trip_type is 'round-trip'"
                    },
                    "max_stops": {
                        "type": "integer",
                        "description": "Maximum number of stops allowed (0-3). Default: 2"
                    },
                    "cabin_class": {
                        "type": "string",
                        "enum": ["economy", "premium_economy", "business", "first"],
                        "description": "Cabin class preference. Default: 'economy'"
                    }
                },
                "required": ["origin", "destination", "departure_date"]
            }
        },
        {
            "name": "store_price_history",
            "description": "Store flight search results in the price_history table for historical analysis and deal comparison.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "User's UUID"
                    },
                    "preference_id": {
                        "type": "string",
                        "description": "Flight preference UUID"
                    },
                    "flights": {
                        "type": "array",
                        "description": "Array of flight objects from search results",
                        "items": {
                            "type": "object"
                        }
                    },
                    "search_session_id": {
                        "type": "string",
                        "description": "UUID to group flights from the same search (will be auto-generated if not provided)"
                    }
                },
                "required": ["user_id", "preference_id", "flights"]
            }
        },
        {
            "name": "get_price_history",
            "description": "Query historical prices for a route to identify deals and price trends.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "User's UUID"
                    },
                    "origin": {
                        "type": "string",
                        "description": "3-letter IATA code for origin"
                    },
                    "destination": {
                        "type": "string",
                        "description": "3-letter IATA code for destination"
                    },
                    "days_back": {
                        "type": "integer",
                        "description": "How many days back to search price history. Default: 30"
                    }
                },
                "required": ["user_id", "origin", "destination"]
            }
        },
        {
            "name": "send_alert",
            "description": "Create a complete formatted email alert. Provide email_subject and email_body_html which will be queued for scheduled delivery. Also provide a brief reasoning summary for database records.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "User's UUID"
                    },
                    "preference_id": {
                        "type": "string",
                        "description": "Flight preference UUID"
                    },
                    "alert_type": {
                        "type": "string",
                        "enum": ["multi_flight_summary", "exceptional_deal"],
                        "description": "Type of alert"
                    },
                    "email_subject": {
                        "type": "string",
                        "description": "Complete email subject line"
                    },
                    "email_body_html": {
                        "type": "string",
                        "description": "Complete HTML email body with inline CSS"
                    },
                    "reference_price": {
                        "type": "number",
                        "description": "Historical average for comparison"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Brief summary for database/logging"
                    }
                },
                "required": ["user_id", "preference_id", "alert_type", "email_subject", "email_body_html", "reference_price", "reasoning"]
            }
        },
        {
            "name": "log_activity",
            "description": "Record agent decisions and actions in the activity log for audit trail and optimization.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "user_id": {
                        "type": "string",
                        "description": "User's UUID"
                    },
                    "preference_id": {
                        "type": "string",
                        "description": "Flight preference UUID"
                    },
                    "activity_type": {
                        "type": "string",
                        "enum": ["searched", "alerted", "skipped_search", "no_results_found"],
                        "description": "Type of activity performed"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Claude's explanation for the decision"
                    }
                },
                "required": ["user_id", "preference_id", "activity_type", "reasoning"]
            }
        }
    ]


# ============================================================================
# TOOL EXECUTION FUNCTIONS
# ============================================================================

async def execute_search_flights(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute flight search using FastFlightsAdapter.
    
    Args:
        arguments: Tool arguments containing origin, destination, departure_date, etc.
    
    Returns:
        Dict with search results or error message
    """
    try:
        origin = arguments.get("origin", "").upper()
        destination = arguments.get("destination", "").upper()
        departure_date = arguments.get("departure_date", "")
        trip_type = arguments.get("trip_type", "one-way")
        return_date = arguments.get("return_date")
        max_stops = arguments.get("max_stops", 2)
        cabin_class = arguments.get("cabin_class", "economy")
        
        # Validate required parameters
        if not origin or not destination or not departure_date:
            return {"error": "Missing required parameters: origin, destination, departure_date"}

        if trip_type not in ["one-way", "round-trip"]:
            return {"error": "Invalid trip_type. Must be 'one-way' or 'round-trip'"}

        if trip_type == "round-trip" and not return_date:
            return {"error": "return_date is required when trip_type='round-trip'"}

        if trip_type == "one-way":
            return_date = None
        
        logger.info(
            f"Searching flights: {origin} → {destination}, departure={departure_date}, "
            f"trip_type={trip_type}, return_date={return_date}"
        )
        
        # Call adapter
        itineraries = flight_adapter.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            trip_type=trip_type,
            return_date=return_date,
            seat_class=cabin_class,
            max_stops=max_stops
        )
        
        if not itineraries:
            return {
                "success": False,
                "flights": [],
                "message": f"No flights found for {origin} → {destination} on {departure_date}"
            }
        
        # Convert FlightItinerary objects to JSON-serializable dicts
        flights_data = []
        for itinerary in itineraries:
            flight_dict = {
                "origin": origin,
                "destination": destination,
                "price_usd": itinerary.total_price_usd,
                "duration_minutes": itinerary.outbound.duration_minutes,
                "stops": itinerary.outbound.stops,
                "airline": itinerary.outbound.airline,
                "departure_datetime": itinerary.outbound.departure_datetime,
                "arrival_datetime": itinerary.outbound.arrival_datetime,
                "price_indicator": itinerary.outbound.price_indicator,
                "trip_type": itinerary.trip_type,
                "route_path": itinerary.outbound.route_path,
                "return_flight": {
                    "duration_minutes": itinerary.return_flight.duration_minutes,
                    "stops": itinerary.return_flight.stops,
                    "airline": itinerary.return_flight.airline,
                    "departure_datetime": itinerary.return_flight.departure_datetime,
                    "arrival_datetime": itinerary.return_flight.arrival_datetime,
                    "price_indicator": itinerary.return_flight.price_indicator,
                    "route_path": itinerary.return_flight.route_path,
                } if itinerary.return_flight else None
            }
            flights_data.append(flight_dict)
        
        return {
            "success": True,
            "flights": flights_data,
            "count": len(flights_data),
            "message": f"Found {len(flights_data)} flights"
        }
    
    except Exception as e:
        logger.error(f"Flight search error: {str(e)}", exc_info=True)
        return {"error": f"Flight search failed: {str(e)}"}


async def execute_store_price_history(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Store flight search results in price_history table.
    
    Args:
        arguments: Tool arguments containing user_id, preference_id, flights, search_session_id
    
    Returns:
        Dict with confirmation and count of rows inserted
    """
    try:
        user_id = arguments.get("user_id")
        preference_id = arguments.get("preference_id")
        flights = arguments.get("flights", [])
        
        # Generate a new UUID for this search session (don't trust Claude's format)
        search_session_id = str(uuid.uuid4())
        
        if not user_id or not preference_id:
            return {"error": "Missing required parameters: user_id, preference_id"}
        
        if not flights:
            return {"success": True, "inserted_count": 0, "message": "No flights to store"}
        
        supabase = get_supabase()
        now_iso = datetime.now(timezone.utc).isoformat()
        inserted_count = 0
        
        # Insert each flight into price_history
        for flight in flights:
            try:
                # Extract departure date from ISO datetime string (YYYY-MM-DDTHH:MM:SS -> YYYY-MM-DD)
                departure_datetime = flight.get("departure_datetime", "")
                departure_date = departure_datetime.split("T")[0] if departure_datetime else None
                
                if not departure_date:
                    logger.warning(f"Could not extract date from {departure_datetime}, skipping")
                    continue
                
                # Validate price (required field)
                price = flight.get("price_usd")
                if price is None:
                    logger.warning(f"Missing price_usd for flight {flight}, skipping")
                    continue
                
                # Prepare row data
                row_data = {
                    "user_id": user_id,
                    "preference_id": preference_id,
                    "origin": flight.get("origin", ""),
                    "destination": flight.get("destination", ""),
                    "departure_date": departure_date,
                    "price": price,
                    "duration_minutes": flight.get("duration_minutes"),
                    "stops": flight.get("stops"),
                    "airline": flight.get("airline", ""),
                    "price_indicator": flight.get("price_indicator"),
                    "search_session_id": search_session_id,
                    "searched_at": now_iso
                }
                
                # Insert into Supabase
                supabase.table("price_history").insert(row_data).execute()
                inserted_count += 1
                
            except Exception as e:
                logger.warning(f"Failed to insert individual flight: {str(e)}")
                continue
        
        return {
            "success": True,
            "inserted_count": inserted_count,
            "message": f"Stored {inserted_count} flight prices"
        }
    
    except Exception as e:
        logger.error(f"Price history storage error: {str(e)}", exc_info=True)
        return {"error": f"Failed to store price history: {str(e)}"}


async def execute_get_price_history(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Query historical prices for a route to identify deals.
    
    Args:
        arguments: Tool arguments containing user_id, origin, destination, days_back
    
    Returns:
        Dict with price statistics and recent searches
    """
    try:
        user_id = arguments.get("user_id")
        origin = arguments.get("origin", "").upper()
        destination = arguments.get("destination", "").upper()
        days_back = arguments.get("days_back", 30)
        
        if not user_id or not origin or not destination:
            return {"error": "Missing required parameters: user_id, origin, destination"}
        
        supabase = get_supabase()
        
        # Calculate date range
        cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        # Query price history
        response = supabase.table("price_history").select("*").eq(
            "user_id", user_id
        ).eq("origin", origin).eq(
            "destination", destination
        ).gte("departure_date", cutoff_date).order("searched_at", desc=True).execute()
        
        prices = response.data if response.data else []
        
        if not prices:
            return {
                "success": True,
                "average_price": None,
                "min_price": None,
                "max_price": None,
                "recent_searches": [],
                "message": f"No price history found for {origin} → {destination} in the last {days_back} days"
            }
        
        # Calculate statistics
        price_values = [p.get("price") for p in prices if p.get("price")]
        average_price = sum(price_values) / len(price_values) if price_values else None
        min_price = min(price_values) if price_values else None
        max_price = max(price_values) if price_values else None
        
        # Get last 5 searches
        recent = []
        seen_dates = set()
        for price_record in prices[:10]:  # Check up to 10 to get 5 unique dates
            search_date = price_record.get("searched_at", "")[:10]  # Extract just the date
            if search_date not in seen_dates:
                seen_dates.add(search_date)
                recent.append({
                    "date": search_date,
                    "price": price_record.get("price"),
                    "airline": price_record.get("airline")
                })
                if len(recent) >= 5:
                    break
        
        return {
            "success": True,
            "average_price": average_price,
            "min_price": min_price,
            "max_price": max_price,
            "recent_searches": recent,
            "message": f"Found price history for {origin} → {destination}"
        }
    
    except Exception as e:
        logger.error(f"Price history query error: {str(e)}", exc_info=True)
        return {"error": f"Failed to get price history: {str(e)}"}


async def execute_send_alert(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Record a formatted email alert in the database for delivery.
    If this is the first alert for the preference, send email immediately.
    Otherwise, keep in supabase table, will be sent during scheduled delivery.
    
    Args:
        arguments: Tool arguments containing user_id, preference_id, alert_type, email_subject, email_body_html, reference_price, reasoning
    
    Returns:
        Dict with confirmation and alert_id
    """
    try:
        user_id = arguments.get("user_id")
        preference_id = arguments.get("preference_id")
        alert_type = arguments.get("alert_type")
        email_subject = arguments.get("email_subject")
        email_body_html = arguments.get("email_body_html")
        reference_price = arguments.get("reference_price")
        reasoning = arguments.get("reasoning")
        
        required_fields = ["user_id", "preference_id", "alert_type", "email_subject", "email_body_html", "reference_price", "reasoning"]
        if not all(arguments.get(field) for field in required_fields):
            return {"error": f"Missing required parameters: {', '.join(required_fields)}"}
        
        supabase = get_supabase()
        alert_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Check if this is the first alert for this preference
        previous_alerts = supabase.table("alerts_sent")\
            .select("id", count="exact")\
            .eq("preference_id", preference_id)\
            .execute()
        
        is_first_alert = (previous_alerts.count == 0)
        
        # Insert alert record with formatted email content
        alert_data = {
            "id": alert_id,
            "user_id": user_id,
            "preference_id": preference_id,
            "alert_type": alert_type,
            "email_subject": email_subject,
            "email_body_html": email_body_html,
            "reference_price": reference_price,
            "score": None,  # Can be NULL for now
            "reasoning": reasoning,
            "sent_at": now_iso
        }
        
        supabase.table("alerts_sent").insert(alert_data).execute()
        
        # If this is the first alert, send email immediately
        if is_first_alert:
            try:
                # Fetch user's email from auth
                user_response = supabase.auth.admin.get_user_by_id(user_id)
                user_email = user_response.user.email if user_response and user_response.user else None
                
                if user_email:
                    # Send email immediately
                    email_result = await send_email(user_email, email_subject, email_body_html)
                    if email_result.get("success"):
                        logger.info(f"Sent immediate welcome email for preference {preference_id} to {user_email}")
                    else:
                        logger.error(f"Failed to send immediate email: {email_result.get('error')}")
                else:
                    logger.error(f"Could not fetch email for user {user_id}")
            except Exception as email_error:
                # Don't fail the whole operation if email sending fails
                logger.error(f"Error sending immediate email: {str(email_error)}", exc_info=True)
        
        return {
            "success": True,
            "alert_id": alert_id,
            "message": f"Alert recorded: {alert_type}" + (" (sent immediately)" if is_first_alert else " (queued for scheduled delivery)")
        }
    
    except Exception as e:
        logger.error(f"Send alert error: {str(e)}", exc_info=True)
        return {"error": f"Failed to send alert: {str(e)}"}


async def execute_log_activity(arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Record agent decisions in the activity log.
    
    Args:
        arguments: Tool arguments containing user_id, preference_id, activity_type, reasoning
    
    Returns:
        Dict with confirmation and log_id
    """
    try:
        user_id = arguments.get("user_id")
        preference_id = arguments.get("preference_id")
        activity_type = arguments.get("activity_type")
        reasoning = arguments.get("reasoning")
        
        required_fields = ["user_id", "preference_id", "activity_type", "reasoning"]
        if not all(arguments.get(field) for field in required_fields):
            return {"error": f"Missing required parameters: {', '.join(required_fields)}"}
        
        supabase = get_supabase()
        log_id = str(uuid.uuid4())
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Insert activity log record
        log_data = {
            "id": log_id,
            "user_id": user_id,
            "preference_id": preference_id,
            "activity_type": activity_type,
            "reasoning": reasoning,
            "timestamp": now_iso
        }
        
        supabase.table("agent_activity_log").insert(log_data).execute()
        
        return {
            "success": True,
            "log_id": log_id,
            "message": f"Activity logged: {activity_type}"
        }
    
    except Exception as e:
        logger.error(f"Log activity error: {str(e)}", exc_info=True)
        return {"error": f"Failed to log activity: {str(e)}"}


# ============================================================================
# TOOL EXECUTION DISPATCHER
# ============================================================================

async def execute_tool(tool_name: str, tool_input: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a tool by name.
    
    Args:
        tool_name: Name of the tool to execute
        tool_input: Arguments for the tool
    
    Returns:
        Tool execution result
    """
    if tool_name == "search_flights":
        return await execute_search_flights(tool_input)
    elif tool_name == "store_price_history":
        return await execute_store_price_history(tool_input)
    elif tool_name == "get_price_history":
        return await execute_get_price_history(tool_input)
    elif tool_name == "send_alert":
        return await execute_send_alert(tool_input)
    elif tool_name == "log_activity":
        return await execute_log_activity(tool_input)
    else:
        return {"error": f"Unknown tool: {tool_name}"}


# ============================================================================
# MAIN MONITORING FUNCTION WITH TOOL USE
# ============================================================================

async def call_claude_for_monitoring(
    user_id: str, preference_id: str
) -> Dict[str, Any]:
    """
    Calls Claude to monitor a specific user's flight preference with tool use.
    
    This function:
    1. Retrieves user flight preferences from the database
    2. Sends preference to Claude with tools defined
    3. Executes any tools Claude requests (search flights, store data, send alerts)
    4. Continues multi-turn conversation until Claude finishes
    5. Returns final analysis with metadata about tool usage

    Args:
        user_id: The UUID of the user
        preference_id: The UUID of the flight preference to monitor

    Returns:
        Dict containing:
        - {"response": final_analysis, "tools_used": [...], "conversation_turns": count} on success
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

        preference = response.data[0]

        # Get recent agent activity
        recent_activity = supabase.table("agent_activity_log")\
            .select("activity_type, reasoning, timestamp")\
            .eq("user_id", user_id)\
            .eq("preference_id", preference_id)\
            .order("timestamp", desc=True)\
            .limit(10)\
            .execute()

        # Get recent alerts
        recent_alerts = supabase.table("alerts_sent")\
            .select("sent_at, reference_price, reasoning, alert_type")\
            .eq("user_id", user_id)\
            .eq("preference_id", preference_id)\
            .order("sent_at", desc=True)\
            .limit(3)\
            .execute()

        # Load system prompt from backend/system_prompt.md
        system_prompt_path = Path(__file__).parent / "system_prompt.md"
        with open(system_prompt_path, "r", encoding="utf-8") as f:
            system_prompt = f.read()

        # Build initial user message context with preference details
        initial_message = f"""User Preference (JSON format):
{json.dumps(preference, indent=2)}

Current date: {datetime.now(timezone.utc).strftime('%Y-%m-%d')}

Recent Activity (Last 10 actions):
{json.dumps(recent_activity.data if recent_activity.data else [], indent=2)}

Recent Alerts (Last 3):
{json.dumps(recent_alerts.data if recent_alerts.data else [], indent=2)}

Refer to system prompt for instructions."""

        # Initialize conversation
        messages = [{"role": "user", "content": initial_message}]
        tools = get_tool_definitions()
        
        tools_used = []
        conversation_turns = 0
        max_turns = 7
        
        logger.info(f"Starting Claude monitoring for user {user_id}, preference {preference_id}")
        
        # Multi-turn conversation loop
        while conversation_turns < max_turns:
            conversation_turns += 1
            logger.info(f"Conversation turn {conversation_turns}")
            
            # Call Claude with tools
            response = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=5000,
                system=system_prompt,
                tools=tools,
                messages=messages
            )
            
            # Check if Claude wants to use tools or is done
            if response.stop_reason == "end_turn":
                # Claude is done, extract final response
                final_text = ""
                for content in response.content:
                    if hasattr(content, "text"):
                        final_text = content.text
                        break
                
                logger.info(f"Claude finished monitoring after {conversation_turns} turns")
                return {
                    "response": final_text,
                    "tools_used": tools_used,
                    "conversation_turns": conversation_turns
                }
            
            # Claude wants to use tools
            if response.stop_reason == "tool_use":
                # Add Claude's response to messages
                messages.append({"role": "assistant", "content": response.content})
                
                # Process each tool use request
                tool_results = []
                for content in response.content:
                    if content.type == "tool_use":
                        tool_name = content.name
                        tool_input = content.input
                        tool_use_id = content.id
                        
                        logger.info(f"Claude requested tool: {tool_name}")

                        if tool_name not in tools_used:
                            tools_used.append(tool_name)

                        # Override user_id/preference_id with authoritative values from
                        # call context to prevent prompt injection or hallucination from
                        # accessing/writing data for other users.
                        tool_input_safe = dict(tool_input)
                        if "user_id" in tool_input_safe:
                            tool_input_safe["user_id"] = user_id
                        if "preference_id" in tool_input_safe:
                            tool_input_safe["preference_id"] = preference_id

                        # Execute the tool
                        try:
                            tool_result = await execute_tool(tool_name, tool_input_safe)
                            logger.info(f"Tool {tool_name} executed: {tool_result}")
                        except Exception as e:
                            tool_result = {"error": f"Tool execution failed: {str(e)}"}
                            logger.error(f"Tool {tool_name} failed: {str(e)}", exc_info=True)
                        
                        # Add tool result
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tool_use_id,
                            "content": json.dumps(tool_result)
                        })
                
                # Add tool results to messages
                messages.append({"role": "user", "content": tool_results})
            else:
                # Unexpected stop reason
                logger.warning(f"Unexpected stop reason: {response.stop_reason}")
                break
        
        # Max turns reached
        logger.warning(f"Max conversation turns ({max_turns}) reached")
        return {
            "error": f"Claude monitoring exceeded maximum conversation turns ({max_turns})",
            "tools_used": tools_used,
            "conversation_turns": conversation_turns
        }

    except Exception as e:
        logger.error(f"Claude monitoring error: {str(e)}", exc_info=True)
        return {"error": str(e)}
