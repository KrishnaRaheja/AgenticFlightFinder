"""
Data Models Module

Defines Pydantic models for flight preferences including:
- FlightPreferenceCreate: Input model for creating new flight preferences
- FlightPreferenceResponse: Output model including database-generated fields

These models provide data validation, serialization, and OpenAPI documentation.
"""

from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class FlightPreferenceCreate(BaseModel):
    """Data model for creating a new flight preference"""
    origin: str = Field(..., min_length=3, max_length=3)
    destination: str = Field(..., min_length=3, max_length=3)
    departure_period: str
    return_period: Optional[str] = None
    max_stops: int = Field(default=2, ge=0, le=3)
    cabin_class: str = Field(default="economy")
    budget: Optional[int] = Field(None, gt=0)
    nearby_airports: bool = Field(default=False)
    date_flexibility: str = Field(default="exact")
    priority: str = Field(default="balanced")
    prefer_non_work_days: bool = Field(default=False)
    alert_frequency: str = Field(default="weekly")
    additional_context: Optional[str] = None

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


class AlertResponse(BaseModel):
    """Response model for flight alerts"""
    id: UUID
    email_subject: str
    email_body_html: str
    sent_at: str
    reasoning: str
    reference_price: Optional[float] = None
    alert_type: str
