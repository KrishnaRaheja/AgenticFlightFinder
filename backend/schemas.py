"""
Data Models Module

Defines Pydantic models for flight preferences including:
- FlightPreferenceCreate: Input model for creating new flight preferences
- FlightPreferenceResponse: Output model including database-generated fields

These models provide data validation, serialization, and OpenAPI documentation.
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional
from uuid import UUID

class FlightPreferenceCreate(BaseModel):
    """Data model for creating a new flight preference"""
    origin: str = Field(..., min_length=3, max_length=3)
    destination: str = Field(..., min_length=3, max_length=3)
    departure_period: str
    return_period: Optional[str] = None
    max_stops: int = Field(default=2, ge=0, le=3)
    # NOTE: allowed values below must stay in sync with PreferenceWizard.tsx (StepPreferences)
    cabin_class: Literal["economy", "premium_economy", "business", "first"] = "economy"
    budget: Optional[int] = Field(None, gt=0)
    nearby_airports: bool = Field(default=False)
    # NOTE: allowed values below must stay in sync with PreferenceWizard.tsx (StepPreferences)
    date_flexibility: Literal["exact", "plus_minus_2", "plus_minus_5", "flexible"] = "exact"
    # NOTE: allowed values below must stay in sync with PreferenceWizard.tsx (StepPreferences)
    priority: Literal["price", "balanced", "convenience"] = "balanced"
    prefer_non_work_days: bool = Field(default=False)
    # NOTE: allowed values below must stay in sync with PreferenceWizard.tsx (StepPreferences)
    alert_frequency: Literal["daily", "weekly"] = "daily"
    additional_context: Optional[str] = Field(None, max_length=500)  # NOTE: max_length must stay in sync with PreferenceWizard.tsx (StepContext, maxLength prop)

class FlightPreferenceResponse(FlightPreferenceCreate):
    """Response includes DB-generated fields"""
    id: UUID
    user_id: UUID
    is_active: bool
    created_at: str
    updated_at: str


class FlightPreferenceStatusUpdate(BaseModel):
    """Data model for toggling preference active status"""
    is_active: bool


class PreferencesListResponse(BaseModel):
    """Envelope for the preferences list — includes the active limit so the
    frontend never needs to hardcode it."""
    preferences: list[FlightPreferenceResponse]
    active_limit: int


class AlertResponse(BaseModel):
    """Response model for flight alerts"""
    id: UUID
    email_subject: str
    email_body_html: str
    sent_at: str
    reasoning: str
    reference_price: Optional[float] = None
    alert_type: str
