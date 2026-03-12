"""Flight preference routes backed by the service layer."""

from fastapi import APIRouter, Depends, HTTPException
from backend.auth import get_current_user
from backend.schemas import (
    FlightPreferenceCreate,
    FlightPreferenceResponse,
    FlightPreferenceStatusUpdate,
    AlertResponse,
)
from backend.services import MonitoringService, PreferenceNotFoundError, PreferenceService, PreferenceServiceError
from uuid import UUID

router = APIRouter(prefix="/api/preferences", tags=["preferences"])
preference_service = PreferenceService()
monitoring_service = MonitoringService()


@router.post("/", response_model=FlightPreferenceResponse)
async def create_preference(
    preference: FlightPreferenceCreate,
    current_user: str = Depends(get_current_user),
):
    """
    Create a new flight preference for a user. Runs monitoring as soon as preference is created.
    """
    try:
        created = await preference_service.create_preference(preference, current_user)
        monitoring_service.trigger_immediate_monitoring(current_user, created["id"])
        return created
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/", response_model=list[FlightPreferenceResponse])
async def get_preferences(current_user: str = Depends(get_current_user)):
    """
    Get all flight preferences for the current user, ordered by newest first
    """
    try:
        return preference_service.get_preferences(current_user)
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{preference_id}", response_model=FlightPreferenceResponse)
async def get_preference(
    preference_id: UUID,
    current_user: str = Depends(get_current_user),
):
    """
    Get a specific flight preference by ID
    """
    try:
        return preference_service.get_preference(preference_id, current_user)
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
        return preference_service.update_preference(
            preference_id,
            preference,
            current_user,
        )
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.patch("/{preference_id}/status", response_model=FlightPreferenceResponse)
async def update_preference_status(
    preference_id: UUID,
    status_update: FlightPreferenceStatusUpdate,
    current_user: str = Depends(get_current_user),
):
    """
    Update only the active status of an existing flight preference
    """
    try:
        return preference_service.update_preference_status(
            preference_id,
            status_update,
            current_user,
        )
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/{preference_id}")
async def delete_preference(
    preference_id: UUID,
    current_user: str = Depends(get_current_user),
):
    """
    Deactivate a flight preference (soft delete - sets is_active to false)
    """
    try:
        return preference_service.delete_preference(preference_id, current_user)
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/{preference_id}/alerts", response_model=list[AlertResponse])
async def get_preference_alerts(
    preference_id: UUID,
    current_user: str = Depends(get_current_user),
):
    """
    Get all alerts sent for a specific flight preference
    
    Returns alerts ordered by most recent first, including:
    - Email subject and HTML body
    - Send timestamp and reasoning
    - Reference price and alert type
    """
    try:
        return preference_service.get_preference_alerts(preference_id, current_user)
    except PreferenceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PreferenceServiceError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
