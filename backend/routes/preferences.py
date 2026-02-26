"""
Flight Preferences Routes Module

Defines API endpoints for managing user flight preferences.

All endpoints require Bearer token authentication.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from backend.auth import get_current_user
from backend.models import FlightPreferenceCreate, FlightPreferenceResponse
from backend.database import get_supabase
from backend.claude_service import call_claude_for_monitoring
import uuid
from uuid import UUID
from datetime import datetime, timezone

router = APIRouter(prefix="/api/preferences", tags=["preferences"])
logger = logging.getLogger(__name__)


async def run_immediate_monitoring(user_id: str, preference_id: str) -> None:
    try:
        await call_claude_for_monitoring(user_id, preference_id)
        logger.info(
            "Immediate monitoring succeeded for user %s preference %s",
            user_id,
            preference_id,
        )
    except Exception as exc:
        logger.error(
            "Immediate monitoring failed for user %s preference %s: %s",
            user_id,
            preference_id,
            str(exc),
            exc_info=True,
        )


@router.post("/", response_model=FlightPreferenceResponse)
async def create_preference(
    preference: FlightPreferenceCreate,
    current_user: str = Depends(get_current_user),
):
    """
    Create a new flight preference for a user.
    Currently uses a hardcoded user_id until authentication is implemented.
    """
    try:
        supabase = get_supabase()
        
        # Get current timestamp (timezone-aware, UTC)
        current_timestamp = datetime.now(timezone.utc).isoformat()
        
        # Convert Pydantic model to dict automatically
        preference_dict = preference.model_dump()
        
        # Add database-generated fields
        preference_dict.update({
            "id": str(uuid.uuid4()),
            "user_id": current_user,
            "is_active": True,
            "created_at": current_timestamp,
            "updated_at": current_timestamp
        })
        
        # Insert into Supabase
        response = supabase.table("flight_preferences").insert(preference_dict).execute()
        
        created_preference = response.data[0]

        asyncio.create_task(
            run_immediate_monitoring(current_user, created_preference["id"])
        )

        # Return the created preference data
        return created_preference
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create preference: {str(e)}")


@router.get("/", response_model=list[FlightPreferenceResponse])
async def get_preferences(current_user: str = Depends(get_current_user)):
    """
    Get all flight preferences for the current user, ordered by newest first
    """
    try:
        supabase = get_supabase()
        
        # Query preferences for the current user
        response = supabase.table("flight_preferences").select("*").eq("user_id", current_user).order("created_at", desc=True).execute()
        
        # Return the preferences
        return response.data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve preferences: {str(e)}")


@router.get("/{preference_id}", response_model=FlightPreferenceResponse)
async def get_preference(
    preference_id: UUID,
    current_user: str = Depends(get_current_user),
):
    """
    Get a specific flight preference by ID
    """
    try:
        supabase = get_supabase()
        
        # Query for the specific preference
        response = supabase.table("flight_preferences").select("*").eq("id", str(preference_id)).eq("user_id", current_user).execute()
        
        # Check if preference was found
        if not response.data:
            raise HTTPException(status_code=404, detail="Preference not found")
        
        # Return the preference
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve preference: {str(e)}")


@router.put("/{preference_id}", response_model=FlightPreferenceResponse)
async def update_preference(
    preference_id: UUID,
    preference: FlightPreferenceCreate,
    current_user: str = Depends(get_current_user),
):
    """
    Update an existing flight preference
    """
    try:
        supabase = get_supabase()
        
        # First verify the preference exists
        verify_response = supabase.table("flight_preferences").select("*").eq("id", str(preference_id)).eq("user_id", current_user).execute()
        
        if not verify_response.data:
            raise HTTPException(status_code=404, detail="Preference not found")
        
        # Create update dictionary from preference data
        update_dict = preference.model_dump()
        
        # Add updated_at timestamp
        update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update the preference
        response = supabase.table("flight_preferences").update(update_dict).eq("id", str(preference_id)).eq("user_id", current_user).execute()
        
        # Return the updated preference
        return response.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update preference: {str(e)}")


@router.delete("/{preference_id}")
async def delete_preference(
    preference_id: UUID,
    current_user: str = Depends(get_current_user),
):
    """
    Deactivate a flight preference (soft delete - sets is_active to false)
    """
    try:
        supabase = get_supabase()
        
        # First verify the preference exists
        verify_response = supabase.table("flight_preferences").select("*").eq("id", str(preference_id)).eq("user_id", current_user).execute()
        
        if not verify_response.data:
            raise HTTPException(status_code=404, detail="Preference not found")
        
        # Deactivate the preference (soft delete)
        supabase.table("flight_preferences").update({"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(preference_id)).eq("user_id", current_user).execute()
        
        # Return success message
        return {"message": "Preference deactivated successfully", "id": str(preference_id)}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete preference: {str(e)}")
