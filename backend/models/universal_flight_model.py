"""
Universal Flight Data Model

Purpose:
    Provides a universal format for flight data across all API providers.
    This enables the Adapter Pattern, allowing the system to swap between
    different flight APIs (fast-flights, Duffel, Amadeus, etc.) without changing
    the Claude agent logic, database schema, or MCP tools.

Design Principle:
    Each API adapter transforms provider-specific data formats into this
    universal model, ensuring API-agnostic operations throughout the system.

Structure:
    - UniversalFlight: Represents a single flight leg (one direction only)
    - FlightItinerary: Container for complete trips (one-way or round-trip)

    This design supports:
        * One-way trips: 1 leg
        * Round-trip flights: 2 legs (outbound + return)
        * Future multi-city support: 3+ legs
"""

from dataclasses import dataclass
from typing import List, Optional


@dataclass
class UniversalFlight:
    """
    Represents a single flight leg (one direction only).

    This is the atomic unit of flight data. For complete trips (one-way or round-trip),
    see FlightItinerary which combines one or more UniversalFlight objects.

    Required Fields:
        price_usd: Flight cost in USD (price for this leg only)
        duration_minutes: Total travel time in minutes
        stops: Number of layovers (0 = direct, 1+ = connecting flights)
        departure_datetime: Departure time in ISO 8601 format (e.g., "2026-03-12T15:40:00")
        arrival_datetime: Arrival time in ISO 8601 format
        airline: Primary carrier name
        route: Origin-destination pair in format "ORIGIN-DESTINATION" (e.g., "SFO-DEL")
        leg_type: Type of leg - "one-way", "outbound", or "return"

    Optional Fields:
        price_indicator: Price assessment ("low"/"typical"/"high") from provider
        is_best: Whether the provider recommends this flight
        booking_url: Direct booking link for future integration
        baggage_info: Baggage allowance details for future integration
        route_path: Complete flight path including all layover airports
            - Format: List of airport codes (e.g., ["SEA", "AMS", "BOM"] for SEA→Amsterdam→Mumbai)
            - None for data sources that don't provide layover information (e.g., fast-flights)
            - Populated for data sources that do provide it (e.g., future Duffel adapter)
    """

    # Required fields
    price_usd: float
    duration_minutes: int
    stops: int
    departure_datetime: str
    arrival_datetime: str
    airline: str
    # SFO-DEL, BOS-SEA, etc. (origin-destination pair)
    route: str
    # one way, outbound, return (for round-trip legs)
    leg_type: str

    # Optional fields
    price_indicator: Optional[str] = None
    is_best: Optional[bool] = None
    booking_url: Optional[str] = None
    baggage_info: Optional[str] = None
    route_path: Optional[List[str]] = None


@dataclass
class FlightItinerary:
    """
    Container for a complete trip (one-way or round-trip).

    This is what adapters return and what the agent works with.
    UniversalFlight represents individual legs; FlightItinerary represents the complete journey.

    Examples:
        One-way trip: SFO→DEL
            - outbound: UniversalFlight(leg_type="one-way", price_usd=750.0, ...)
            - return_flight: None
            - total_price_usd: 750.0 (same as outbound price)
            - trip_type: "one-way"

        Round-trip: SFO→DEL→SFO
            - outbound: UniversalFlight(leg_type="outbound", price_usd=700.0, route="SFO-DEL", ...)
            - return_flight: UniversalFlight(leg_type="return", price_usd=500.0, route="DEL-SFO", ...)
            - total_price_usd: 1200.0 (combined price for both legs)
            - trip_type: "round-trip"

    Required Fields:
        outbound: The first/only flight leg
        total_price_usd: Total cost for entire trip (all legs combined)
        trip_type: Either "one-way" or "round-trip"

    Optional Fields:
        return_flight: The return leg (None for one-way, UniversalFlight for round-trip)
    """

    # Required fields

    # If one-way, then only outbound
    outbound: UniversalFlight
    total_price_usd: float
    trip_type: str  # "one-way" or "round-trip"
    # If round-trip, then there is a return_flight (Optional)
    return_flight: Optional[UniversalFlight] = None

    def validate(self) -> None:
        """
        Validate that the itinerary is internally consistent.

        Checks:
            - trip_type matches the presence/absence of return_flight
            - trip_type is one of the allowed values

        Raises:
            ValueError: If validation fails
        """
        if self.trip_type == "one-way" and self.return_flight is not None:
            raise ValueError("One-way trip cannot have a return flight")
        if self.trip_type == "round-trip" and self.return_flight is None:
            raise ValueError("Round-trip must have a return flight")
        if self.trip_type not in ["one-way", "round-trip"]:
            raise ValueError(f"Invalid trip_type: {self.trip_type}")
