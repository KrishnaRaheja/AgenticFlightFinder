"""
Fast-Flights Adapter

Purpose:
    Adapts the fast-flights library API to the universal FlightItinerary format.
    Handles one-way flight searches only (round-trip support planned for Duffel API).

Fast-Flights Specifics:
    - Returns Result object with flights list
    - Each flight appears twice (duplicate removal required)
    - Price is string format: "$181" or "$1,234"
    - Time format: "9:45 PM on Thu, Mar 12"
    - Duration format: "2 hr 13 min"
    - Arrival may be next day (indicated by arrival_time_ahead: "+1", "+2", etc.)

Design Considerations:
    - Robust parsing of string formats with error recovery
    - Graceful handling of malformed data
    - Duplicate removal using price+departure+airline signature
    - Ready for round-trip support addition via Duffel adapter
"""

from fast_flights import get_flights, FlightData, Passengers, Result
from adapters.adapter_interface import FlightAdapter
from models.universal_flight_model import UniversalFlight, FlightItinerary
from typing import List, Optional, Set, Tuple
from datetime import datetime, timedelta
import re
import logging

logger = logging.getLogger(__name__)


class FastFlightsAdapter(FlightAdapter):
    """
    Adapter for fast-flights library.
    
    Currently supports one-way flights only. Round-trip support will be added
    when switching to DuffelAdapter for better API capabilities.
    
    Handles:
        - Duplicate flight removal
        - String format parsing (price, duration, datetime)
        - Timezone-aware date calculations
        - Robust error handling with per-flight recovery
    """

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
        Search for flights using fast-flights library.
        
        Parameters:
        -----------
        origin : str
            IATA code for departure airport
        destination : str
            IATA code for arrival airport
        departure_date : str
            ISO 8601 date string (YYYY-MM-DD)
        trip_type : str
            "one-way" or "round-trip"
        return_date : Optional[str]
            Return date for round-trip (None for one-way)
        seat_class : str
            Cabin class: "economy", "premium_economy", "business", "first"
        max_stops : int
            Maximum number of stops allowed
        
        Returns:
        --------
        List[FlightItinerary]
            List of matching flight itineraries, sorted by price
        
        Raises:
        -------
        NotImplementedError
            If trip_type is "round-trip" (not yet supported)
        """
        
        # PHASE 1: One-way only
        if trip_type == "round-trip":
            raise NotImplementedError(
                "Round-trip searches not yet supported with fast-flights adapter. "
                "Use one-way searches or switch to DuffelAdapter for round-trip support."
            )
        
        try:
            logger.info(
                f"Searching flights: {origin} → {destination} on {departure_date} "
                f"(class={seat_class}, max_stops={max_stops})"
            )
            
            # Call fast-flights API
            result: Result = get_flights(
                flight_data=[
                    FlightData(
                        date=departure_date,
                        from_airport=origin,
                        to_airport=destination
                    )
                ],
                trip="one-way",
                seat=seat_class,
                passengers=Passengers(
                    adults=1,
                    children=0,
                    infants_in_seat=0,
                    infants_on_lap=0
                ),
                fetch_mode="fallback"
            )
            
            if not result or not result.flights:
                logger.info(
                    f"No flights found for {origin} → {destination} on {departure_date}"
                )
                return []
            
            # Process flights and remove duplicates
            itineraries = self._process_flights(
                result=result,
                origin=origin,
                destination=destination,
                departure_date=departure_date,
                max_stops=max_stops,
                price_indicator=result.current_price
            )
            
            logger.info(
                f"Found {len(itineraries)} unique flights "
                f"({len(result.flights)} total raw responses)"
            )
            
            # Sort by price (lowest first). More complex sorting/filtering done by Agent.
            itineraries.sort(key=lambda x: x.total_price_usd)
            
            return itineraries
        
        except NotImplementedError:
            # Re-raise NotImplementedError as-is
            raise
        
        except Exception as e:
            logger.error(
                f"API call failed for {origin} → {destination}: {type(e).__name__}: {str(e)}",
                exc_info=True
            )
            return []

    def _process_flights(
        self,
        result: Result,
        origin: str,
        destination: str,
        departure_date: str,
        max_stops: int,
        price_indicator: Optional[str] = None
    ) -> List[FlightItinerary]:
        """
        Process raw fast-flights results into universal format.
        
        Handles:
            - Duplicate removal (fast-flights returns each flight twice)
            - Filtering by max_stops
            - Parsing of all string formats
            - Per-flight error recovery
        
        Parameters:
        -----------
        result : Result
            Fast-flights Result object
        origin : str
            Departure airport IATA code
        destination : str
            Arrival airport IATA code
        departure_date : str
            ISO 8601 departure date
        max_stops : int
            Maximum stops filter
        price_indicator : Optional[str]
            Google's price assessment ("low", "typical", "high")
        
        Returns:
        --------
        List[FlightItinerary]
            Processed itineraries (duplicates removed)
        """
        
        seen_flights: Set[Tuple[str, str, str]] = set()
        itineraries: List[FlightItinerary] = []
        
        for flight in result.flights:
            try:
                # Skip if already processed (duplicate removal)
                flight_signature = (
                    self._parse_price(flight.price),
                    flight.departure,
                    flight.name
                )
                
                if flight_signature in seen_flights:
                    continue
                
                seen_flights.add(flight_signature)
                
                # Filter by max_stops
                if flight.stops > max_stops:
                    logger.debug(
                        f"Skipping flight with {flight.stops} stops "
                        f"(max_stops={max_stops})"
                    )
                    continue
                
                # Parse all fields
                price_usd = self._parse_price(flight.price)
                duration_minutes = self._parse_duration(flight.duration)
                departure_datetime = self._parse_datetime(
                    flight.departure,
                    departure_date,
                    days_ahead=""  # Outbound is always on departure_date
                )
                arrival_datetime = self._parse_datetime(
                    flight.arrival,
                    departure_date,
                    days_ahead=flight.arrival_time_ahead
                )
                
                # Create UniversalFlight
                universal_flight = UniversalFlight(
                    price_usd=price_usd,
                    duration_minutes=duration_minutes,
                    stops=flight.stops,
                    departure_datetime=departure_datetime,
                    arrival_datetime=arrival_datetime,
                    airline=flight.name,
                    route=f"{origin}-{destination}",
                    leg_type="one-way",
                    price_indicator=price_indicator,
                    is_best=flight.is_best,
                    booking_url=None,  # Will be added when booking integration added
                    baggage_info=None   # Will be added when baggage data available
                )
                
                # Create FlightItinerary
                itinerary = FlightItinerary(
                    outbound=universal_flight,
                    return_flight=None,
                    total_price_usd=price_usd,
                    trip_type="one-way"
                )
                
                # Validate structure
                itinerary.validate()
                
                itineraries.append(itinerary)
            
            except Exception as e:
                # Log and skip individual flight errors
                logger.warning(
                    f"Failed to parse flight from {origin} → {destination}: "
                    f"{type(e).__name__}: {str(e)}",
                    exc_info=False
                )
                continue
        
        return itineraries

    def _parse_price(self, price_str: str) -> float:
        """
        Parse price string to float.
        
        Examples:
            "$181" → 181.0
            "$1,234" → 1234.0
            "1234.56" → 1234.56
        
        Parameters:
        -----------
        price_str : str
            Price string from fast-flights
        
        Returns:
        --------
        float
            Parsed price, or 0.0 if parsing fails
        """
        try:
            # Remove $ and , characters, then convert to float
            cleaned = price_str.replace("$", "").replace(",", "").strip()
            return float(cleaned)
        except (ValueError, AttributeError) as e:
            logger.warning(
                f"Failed to parse price '{price_str}': {type(e).__name__}"
            )
            return 0.0

    def _parse_duration(self, duration_str: str) -> int:
        """
        Parse duration string to minutes.
        
        Handles:
            "2 hr 13 min" → 133
            "45 min" → 45
            "5 hr" → 300
        
        Parameters:
        -----------
        duration_str : str
            Duration string from fast-flights (e.g., "2 hr 13 min")
        
        Returns:
        --------
        int
            Total duration in minutes, or 0 if parsing fails
        """
        try:
            total_minutes = 0
            
            # Extract hours
            hours_match = re.search(r'(\d+)\s*hr', duration_str)
            if hours_match:
                total_minutes += int(hours_match.group(1)) * 60
            
            # Extract minutes
            minutes_match = re.search(r'(\d+)\s*min', duration_str)
            if minutes_match:
                total_minutes += int(minutes_match.group(1))
            
            return total_minutes if total_minutes > 0 else 0
        
        except Exception as e:
            logger.warning(
                f"Failed to parse duration '{duration_str}': {type(e).__name__}"
            )
            return 0

    def _parse_datetime(
        self,
        time_str: str,
        base_date_str: str,
        days_ahead: str = ""
    ) -> str:
        """
        Parse fast-flights datetime format to ISO 8601.
        
        Examples:
            ("9:45 PM on Thu, Mar 12", "2026-03-12", "") 
            → "2026-03-12T21:45:00"
            
            ("11:58 PM on Thu, Mar 12", "2026-03-12", "+1") 
            → "2026-03-13T23:58:00"
            
            ("2:30 AM on Fri, Mar 13", "2026-03-12", "+1")
            → "2026-03-13T02:30:00"
        
        Parameters:
        -----------
        time_str : str
            Time string from flight (e.g., "9:45 PM on Thu, Mar 12")
        base_date_str : str
            Base date in ISO 8601 format (YYYY-MM-DD)
        days_ahead : str
            Days offset (e.g., "", "+1", "+2")
        
        Returns:
        --------
        str
            ISO 8601 datetime string (YYYY-MM-DDTHH:MM:SS)
        """
        try:
            # Month abbreviation to number mapping
            month_map = {
                "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
                "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
            }
            
            # Extract time (e.g., "9:45 PM")
            time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)', time_str)
            if not time_match:
                raise ValueError(f"Could not extract time from '{time_str}'")
            
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            am_pm = time_match.group(3)
            
            # Convert to 24-hour format
            if am_pm == "PM" and hour != 12:
                hour += 12
            elif am_pm == "AM" and hour == 12:
                hour = 0
            
            # Parse base date
            base_date = datetime.fromisoformat(base_date_str)
            
            # Parse days_ahead offset
            days_offset = 0
            if days_ahead:
                days_match = re.search(r'([+-]\d+)', days_ahead)
                if days_match:
                    days_offset = int(days_match.group(1))
            
            # Create final datetime
            final_date = base_date + timedelta(days=days_offset)
            result_datetime = final_date.replace(hour=hour, minute=minute, second=0)
            
            # Return ISO 8601 format
            return result_datetime.strftime("%Y-%m-%dT%H:%M:%S")
        
        except Exception as e:
            logger.warning(
                f"Failed to parse datetime '{time_str}' with base_date='{base_date_str}', "
                f"days_ahead='{days_ahead}': {type(e).__name__}",
                exc_info=False
            )
            # Fallback: return base date at midnight
            return f"{base_date_str}T00:00:00"
