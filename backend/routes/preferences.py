
"""
Flight preference API routes for managing user flight search preferences and alerts.

This module exposes REST endpoints for creating, updating, deleting, and retrieving flight preferences.
All routes are protected by authentication and operate only on the current user's data.
Business logic is delegated to PreferenceService and MonitoringService.

Key features:
- Enforces maximum active preferences per user
- Triggers immediate monitoring on preference creation
- Supports soft delete (pausing preference via status update)
- Returns alerts for each preference
"""

from fastapi import APIRouter, Depends, HTTPException
from backend.auth import AuthContext, get_current_user
from backend.database import get_user_supabase
from backend.limits import MAX_ACTIVE_PREFERENCES_PER_USER
from backend.schemas import (
    FlightPreferenceCreate,
    FlightPreferenceResponse,
    FlightPreferenceStatusUpdate,
    PreferencesListResponse,
    AlertResponse,
)
from backend.services import MonitoringService, PreferenceNotFoundError, PreferenceService, PreferenceServiceError
from uuid import UUID

router = APIRouter(prefix="/api/preferences", tags=["preferences"])
monitoring_service = MonitoringService()


def get_preference_service(auth: AuthContext = Depends(get_current_user)) -> PreferenceService:
    """
    Per-request PreferenceService backed by a user-scoped Supabase client.
    PostgREST will enforce RLS for all queries made by this service instance.
    """
    return PreferenceService(supabase_factory=lambda: get_user_supabase(auth.token))



@router.post("/", response_model=FlightPreferenceResponse)
async def create_preference(
    preference: FlightPreferenceCreate,
    auth: AuthContext = Depends(get_current_user),
    preference_service: PreferenceService = Depends(get_preference_service),
):
    """
    Create a new flight preference for the authenticated user.

    - Validates input and active preference limit
    - Inserts preference into database
    - Triggers immediate monitoring (Claude agent)
    - Returns created preference

    Raises 400 if validation fails or limit exceeded.
    """
    try:
        created = await preference_service.create_preference(preference, auth.user_id)
        monitoring_service.trigger_immediate_monitoring(auth.user_id, created["id"])
        return created
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc



@router.get("/", response_model=PreferencesListResponse)
async def get_preferences(
    auth: AuthContext = Depends(get_current_user),
    preference_service: PreferenceService = Depends(get_preference_service),
):
    """
    Retrieve all flight preferences for the authenticated user.

    - Returns preferences ordered by newest first
    - Includes the current active preference limit (for frontend logic)

    Raises 500 if database error occurs.
    """
    try:
        prefs = preference_service.get_preferences(auth.user_id)
        return {"preferences": prefs, "active_limit": MAX_ACTIVE_PREFERENCES_PER_USER}
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@router.get("/{preference_id}", response_model=FlightPreferenceResponse)
async def get_preference(
    preference_id: UUID,
    auth: AuthContext = Depends(get_current_user),
    preference_service: PreferenceService = Depends(get_preference_service),
):
    """
    Retrieve a specific flight preference by ID for the authenticated user.

    Raises 404 if not found, 500 if database error.
    """
    try:
        return preference_service.get_preference(preference_id, auth.user_id)
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@router.put("/{preference_id}", response_model=FlightPreferenceResponse)
async def update_preference(
    preference_id: UUID,
    preference: FlightPreferenceCreate,
    auth: AuthContext = Depends(get_current_user),
    preference_service: PreferenceService = Depends(get_preference_service),
):
    """
    Update an existing flight preference for the authenticated user.

    - Validates input
    - Updates preference fields in database

    Raises 404 if not found, 500 if database error.
    """
    try:
        return preference_service.update_preference(
            preference_id,
            preference,
            auth.user_id,
        )
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@router.patch("/{preference_id}/status", response_model=FlightPreferenceResponse)
async def update_preference_status(
    preference_id: UUID,
    status_update: FlightPreferenceStatusUpdate,
    auth: AuthContext = Depends(get_current_user),
    preference_service: PreferenceService = Depends(get_preference_service),
):
    """
    Update only the active status (is_active) of a flight preference.

    - Used for activating/deactivating preferences (soft delete)
    - Does not modify other fields

    Raises 404 if not found, 500 if database error.
    """
    try:
        return preference_service.update_preference_status(
            preference_id,
            status_update,
            auth.user_id,
        )
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@router.delete("/{preference_id}")
async def delete_preference(
    preference_id: UUID,
    auth: AuthContext = Depends(get_current_user),
    preference_service: PreferenceService = Depends(get_preference_service),
):
    """
    Deactivate (soft delete) a flight preference for the authenticated user.

    - Sets is_active to False (preference remains in DB)
    - Used for user-initiated removal

    Raises 404 if not found, 500 if database error.
    """
    try:
        return preference_service.delete_preference(preference_id, auth.user_id)
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc



@router.get("/{preference_id}/alerts", response_model=list[AlertResponse])
async def get_preference_alerts(
    preference_id: UUID,
    auth: AuthContext = Depends(get_current_user),
    preference_service: PreferenceService = Depends(get_preference_service),
):
    """
    Retrieve all alerts sent for a specific flight preference.

    - Returns alerts ordered by most recent first
    - Each alert includes email subject, HTML body, send timestamp, reasoning, reference price, and alert type

    Raises 404 if preference not found, 500 if database error.
    """
    try:
        return preference_service.get_preference_alerts(preference_id, auth.user_id)
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
