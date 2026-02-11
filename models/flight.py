"""

NEEDS MAJOR CHANGES - ACCOUNT FOR ROUND TRIP? HOW WOULD THAT WORK?
---------------------------------------------------------------------



Universal Flight Data Model

Purpose:
    Provides a universal format for flight data across all API providers.
    This enables the Adapter Pattern, allowing the system to swap between
    different flight APIs (fast-flights, Amadeus, etc.) without changing
    the Claude agent logic, database schema, or MCP tools.

Design Principle:
    Each API adapter transforms provider-specific data formats into this
    universal model, ensuring API-agnostic operations throughout the system.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class UniversalFlight:
    """
    Universal flight data structure used across all components of the system.
    
    Required Fields:
        price_usd: Flight cost in USD
        duration_minutes: Total travel time in minutes
        stops: Number of layovers (0 = direct, 1+ = connecting flights)
        departure_datetime: Departure time in ISO 8601 format (e.g., "2026-03-12T15:40:00")
        arrival_datetime: Arrival time in ISO 8601 format
        airline: Primary carrier name
        route: Origin-destination pair in format "ORIGIN-DESTINATION" (e.g., "SFO-DEL")
    
    Optional Fields:
        price_indicator: Price assessment ("low"/"typical"/"high") from provider
        is_best: Whether the provider recommends this flight
        booking_url: Direct booking link for future integration
        baggage_info: Baggage allowance details for future integration
    """
    
    # Required fields
    price_usd: float
    duration_minutes: int
    stops: int
    departure_datetime: str
    arrival_datetime: str
    airline: str
    route: str
    
    # Optional fields
    price_indicator: Optional[str] = None
    is_best: Optional[bool] = None
    booking_url: Optional[str] = None
    baggage_info: Optional[str] = None
