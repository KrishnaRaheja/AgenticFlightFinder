"""
Base Adapter Class for Flight Data Sources

Purpose:
    Defines the contract that all flight data adapters must follow.
    This ensures interchangeability between different flight APIs.

Design Principle:
    Using the Abstract Base Class pattern, this module enforces that every
    concrete adapter implements the same interface, allowing seamless swapping
    between different flight APIs without changing MCP tools or agent logic.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from backend.models.universal_flight_model import FlightItinerary


class FlightAdapter(ABC):
    """
    Abstract base class for all flight data adapters.

    All concrete adapters must inherit from this class and implement
    _search_flights_impl(). Input validation is handled automatically
    by the base class.

    Example Concrete Adapters:
    - DuffelAdapter: Adapter for Duffel API
    - FastFlightsAdapter: Adapter for fast-flights library
    - AmadeusAdapter: Adapter for Amadeus API
    """

    def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        trip_type: str = "one-way",
        return_date: Optional[str] = None,
        seat_class: str = "economy",
        max_stops: int = 2,
    ) -> List[FlightItinerary]:
        """
        Search for flights with automatic input validation.

        This method validates inputs and delegates to _search_flights_impl()
        for adapter-specific implementation.

        Parameters:
        -----------
        origin : str
            Three-letter IATA airport code for departure city.
            Example: "SFO" (San Francisco), "DEL" (Delhi), "LHR" (London Heathrow)

        destination : str
            Three-letter IATA airport code for arrival city.
            Example: "DEL" (Delhi), "LHR" (London Heathrow), "CDG" (Paris)

        departure_date : str
            Flight departure date in ISO 8601 format (YYYY-MM-DD).
            Example: "2026-03-20" for March 20, 2026

        trip_type : str, optional
            Type of trip to search for. Default is "one-way".
            Allowed values: "one-way" or "round-trip"

        return_date : str or None, optional
            Return flight date in ISO 8601 format (YYYY-MM-DD).
            REQUIRED if trip_type is "round-trip", must be None for "one-way".
            Example: "2026-03-27" for March 27, 2026

        seat_class : str, optional
            Seat class preference. Default is "economy".
            Allowed values: "economy", "premium_economy", "business", "first"

        max_stops : int, optional
            Maximum number of stops allowed. Default is 2.
            0 = direct flights only, 1 = at most one stop, 2 = at most two stops

        Returns:
        --------
        List[FlightItinerary]
            List of flight itineraries matching search criteria.
            Each FlightItinerary contains:
            - outbound: UniversalFlight object
            - return_flight: UniversalFlight or None (for round-trip or one-way)
            - total_price_usd: Total cost for entire trip
            - trip_type: "one-way" or "round-trip"

            Returns empty list if no flights found.

        Raises:
        -------
        ValueError: If trip_type is invalid or return_date inconsistency detected
        """
        # Validate trip_type
        if trip_type not in ["one-way", "round-trip"]:
            raise ValueError(
                f"Invalid trip_type: '{trip_type}'. Must be 'one-way' or 'round-trip'"
            )

        # Validate return_date consistency
        if trip_type == "round-trip" and return_date is None:
            raise ValueError(
                "return_date is required when trip_type='round-trip'"
            )

        if trip_type == "one-way" and return_date is not None:
            raise ValueError(
                "return_date must be None when trip_type='one-way'"
            )

        # Validation complete - call adapter-specific implementation
        return self._search_flights_impl(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            trip_type=trip_type,
            return_date=return_date,
            seat_class=seat_class,
            max_stops=max_stops
        )

    @abstractmethod
    def _search_flights_impl(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        trip_type: str,
        return_date: Optional[str],
        seat_class: str,
        max_stops: int
    ) -> List[FlightItinerary]:
        """
        Adapter-specific implementation of flight search.

        Concrete adapters must implement this method. Input validation
        has already been performed by search_flights().

        Parameters are pre-validated:
        - trip_type is guaranteed to be "one-way" or "round-trip"
        - return_date consistency is guaranteed (present for round-trip, absent for one-way)

        Returns:
        --------
        List[FlightItinerary]
            List of flight itineraries in standardized format

        Implementation Notes:
        ---------------------
        - Transform provider-specific responses to FlightItinerary format
        - Handle provider-specific errors gracefully
        - Filter results according to max_stops parameter
        - Return results sorted by price (lowest first) when possible
        """
        pass
