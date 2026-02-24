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
    timeframe: str
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