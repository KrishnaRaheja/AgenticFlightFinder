"""
FlightAPI.io Adapter

Purpose:
    Adapts the flightapi.io REST API to the universal FlightItinerary format.
    Serves as a drop-in replacement for FastFlightsAdapter if it breaks.
    Supports one-way flight searches only (matching FastFlightsAdapter scope).

FlightAPI.io Specifics:
    - GET request to: https://api.flightapi.io/onewaytrip/<key>/<origin>/<dest>/<date>/<adults>/<children>/<infants>/<class>/<currency>
    - Each request costs 2 credits
    - Response uses a normalized/relational structure: itineraries → legs → segments
    - Leg duration is already in minutes (no string parsing needed)
    - Departure/arrival datetimes are already ISO 8601 (no string parsing needed)
    - Carrier info is in a separate `carriers` list, looked up by ID
    - Booking URL is embedded in pricing_options[].items[].url

Design Considerations:
    - API key loaded from FLIGHTAPI_KEY env variable
    - Retry with exponential backoff (matching FastFlightsAdapter behavior)
    - Graceful per-itinerary error recovery
    - Response is denormalized on read: builds lookup dicts for legs/carriers
    - Defaults: 1 adult, 0 children, 0 infants, USD currency
    - Round-trip not supported by this endpoint (separate endpoint exists)

Limitations:
    - API may paginate for high-traffic routes; only first response is processed
    - Region parameter is accepted but not forwarded (flightapi.io URL schema omits it)
"""

import os
import logging
import requests
from typing import List, Optional, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log

from backend.adapters.flights.adapter_interface import FlightAdapter
from backend.models.universal_flight_model import UniversalFlight, FlightItinerary

logger = logging.getLogger(__name__)

BASE_URL = "https://api.flightapi.io/onewaytrip"

# Map adapter interface seat classes → flightapi.io cabin class strings
SEAT_CLASS_MAP = {
    "economy": "Economy",
    "premium_economy": "Premium_Economy",
    "business": "Business",
    "first": "First",
}


class FlightAPIAdapter(FlightAdapter):
    """
    Adapter for flightapi.io REST API.

    Drop-in replacement for FastFlightsAdapter. Implements the same
    FlightAdapter interface so it can be swapped in with no changes
    to MCP tools or agent logic.

    Currently supports one-way flights only (matching FastFlightsAdapter).

    Usage:
        adapter = FlightAPIAdapter()
        flights = adapter.search_flights(
            origin="SEA",
            destination="JFK",
            departure_date="2026-06-01",
        )
    """

    def __init__(self, currency: str = "USD"):
        """
        Parameters:
        -----------
        currency : str
            ISO 4217 currency code for prices. Default: "USD".
        """
        self._api_key = os.environ.get("FLIGHTAPI_KEY")
        if not self._api_key:
            raise EnvironmentError(
                "FLIGHTAPI_KEY environment variable not set. "
                "Add it to your .env file."
            )
        self._currency = currency

    def _search_flights_impl(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        trip_type: str,
        return_date: Optional[str],
        seat_class: str,
        max_stops: int,
    ) -> List[FlightItinerary]:
        """
        Search for one-way flights via flightapi.io.

        Parameters:
        -----------
        origin : str
            IATA departure airport code (e.g. "SEA")
        destination : str
            IATA arrival airport code (e.g. "JFK")
        departure_date : str
            ISO 8601 date string (YYYY-MM-DD)
        trip_type : str
            Must be "one-way" (round-trip not supported by this endpoint)
        return_date : Optional[str]
            Unused; must be None for one-way
        seat_class : str
            One of: "economy", "premium_economy", "business", "first"
        max_stops : int
            Maximum layovers allowed (0 = direct only)

        Returns:
        --------
        List[FlightItinerary]
            Parsed itineraries sorted by price ascending.

        Raises:
        -------
        NotImplementedError
            If trip_type is "round-trip".
        ValueError
            If seat_class is not a recognized value.
        """
        if trip_type == "round-trip":
            raise NotImplementedError(
                "Round-trip searches not supported by FlightAPIAdapter. "
                "Use one-way searches or switch to another adapter."
            )

        cabin_class = SEAT_CLASS_MAP.get(seat_class)
        if cabin_class is None:
            raise ValueError(
                f"Invalid seat_class: '{seat_class}'. "
                f"Must be one of: {list(SEAT_CLASS_MAP.keys())}"
            )

        try:
            logger.info(
                f"Searching flights via flightapi.io: {origin} → {destination} "
                f"on {departure_date} (class={seat_class}, max_stops={max_stops})"
            )

            raw = self._fetch_with_retry(
                origin=origin,
                destination=destination,
                departure_date=departure_date,
                cabin_class=cabin_class,
            )

            if not raw:
                logger.info(f"Empty response for {origin} → {destination}")
                return []

            itineraries = self._parse_response(
                raw=raw,
                origin=origin,
                destination=destination,
                max_stops=max_stops,
            )

            logger.info(
                f"Found {len(itineraries)} itineraries for "
                f"{origin} → {destination} on {departure_date}"
            )

            itineraries.sort(key=lambda x: x.total_price_usd)
            return itineraries

        except NotImplementedError:
            raise
        except Exception as e:
            logger.error(
                f"FlightAPI search failed for {origin} → {destination}: "
                f"{type(e).__name__}: {str(e)}",
                exc_info=True,
            )
            return []

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True,
    )
    def _fetch_with_retry(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        cabin_class: str,
        adults: int = 1,
        children: int = 0,
        infants: int = 0,
    ) -> Dict[str, Any]:
        """
        Make GET request to flightapi.io with exponential backoff retry.

        URL format:
            /onewaytrip/<key>/<origin>/<dest>/<date>/<adults>/<children>/<infants>/<class>/<currency>

        Retries up to 3 times with delays of ~2s, ~4s on failure.
        Raises the last exception if all attempts are exhausted.

        Parameters:
        -----------
        origin : str
            IATA departure code
        destination : str
            IATA arrival code
        departure_date : str
            YYYY-MM-DD
        cabin_class : str
            API-formatted class (e.g. "Economy", "Business")
        adults : int
            Number of adult passengers
        children : int
            Number of child passengers
        infants : int
            Number of infant passengers

        Returns:
        --------
        Dict[str, Any]
            Parsed JSON response body
        """
        url = (
            f"{BASE_URL}/{self._api_key}"
            f"/{origin}/{destination}/{departure_date}"
            f"/{adults}/{children}/{infants}"
            f"/{cabin_class}/{self._currency}"
        )

        logger.debug(f"GET {BASE_URL}/***/{origin}/{destination}/{departure_date}/...")

        response = requests.get(url, timeout=30)
        response.raise_for_status()
        return response.json()

    def _parse_response(
        self,
        raw: Dict[str, Any],
        origin: str,
        destination: str,
        max_stops: int,
    ) -> List[FlightItinerary]:
        """
        Parse flightapi.io response into universal FlightItinerary format.

        The response uses a normalized structure where itineraries reference
        legs by ID, and legs reference carriers by ID. This method builds
        lookup dicts to denormalize on read.

        Parameters:
        -----------
        raw : Dict[str, Any]
            Raw JSON response from flightapi.io
        origin : str
            IATA departure code (used in route field)
        destination : str
            IATA arrival code (used in route field)
        max_stops : int
            Skip itineraries with more stops than this

        Returns:
        --------
        List[FlightItinerary]
            Parsed itineraries (errors per-itinerary are skipped, not fatal)
        """
        # Build lookup dicts from the relational arrays
        legs_by_id: Dict[str, Dict] = {
            leg["id"]: leg for leg in raw.get("legs", [])
        }
        carriers_by_id: Dict[int, Dict] = {
            c["id"]: c for c in raw.get("carriers", [])
        }

        itineraries: List[FlightItinerary] = []

        for item in raw.get("itineraries", []):
            try:
                # Get pricing - use cheapest available option
                pricing_options = item.get("pricing_options", [])
                if not pricing_options:
                    logger.debug(f"Skipping itinerary with no pricing options: {item.get('id')}")
                    continue

                # Sort by price and take the cheapest
                pricing_options_sorted = sorted(
                    pricing_options,
                    key=lambda p: p.get("price", {}).get("amount", float("inf")),
                )
                best_price_option = pricing_options_sorted[0]
                price_usd = float(best_price_option["price"]["amount"])

                # Booking URL from first item in the cheapest option
                booking_url: Optional[str] = None
                items = best_price_option.get("items", [])
                if items:
                    raw_url = items[0].get("url", "")
                    # URL may be a relative path - store as-is for now
                    booking_url = raw_url if raw_url else None

                # Get the outbound leg (one-way = exactly 1 leg)
                leg_ids = item.get("leg_ids", [])
                if not leg_ids:
                    logger.debug(f"Skipping itinerary with no leg_ids: {item.get('id')}")
                    continue

                leg = legs_by_id.get(leg_ids[0])
                if not leg:
                    logger.debug(f"Leg {leg_ids[0]} not found in legs list")
                    continue

                # Filter by stops
                stop_count = leg.get("stop_count", 0)
                if stop_count > max_stops:
                    logger.debug(
                        f"Skipping itinerary with {stop_count} stops (max={max_stops})"
                    )
                    continue

                # Duration is already in minutes
                duration_minutes = int(leg.get("duration", 0))

                # Datetimes are already ISO 8601 (e.g. "2024-05-20T06:00:00")
                departure_dt = leg.get("departure", "")
                arrival_dt = leg.get("arrival", "")

                # Resolve carrier name
                carrier_ids = leg.get("marketing_carrier_ids", [])
                airline = self._resolve_carrier_name(carrier_ids, carriers_by_id)

                universal_flight = UniversalFlight(
                    price_usd=price_usd,
                    duration_minutes=duration_minutes,
                    stops=stop_count,
                    departure_datetime=departure_dt,
                    arrival_datetime=arrival_dt,
                    airline=airline,
                    route=f"{origin}-{destination}",
                    leg_type="one-way",
                    price_indicator=None,  # flightapi.io does not provide this
                    is_best=None,          # flightapi.io does not provide this
                    booking_url=booking_url,
                    baggage_info=None,
                )

                itinerary = FlightItinerary(
                    outbound=universal_flight,
                    return_flight=None,
                    total_price_usd=price_usd,
                    trip_type="one-way",
                )

                itinerary.validate()
                itineraries.append(itinerary)

            except Exception as e:
                logger.warning(
                    f"Failed to parse itinerary {item.get('id', '?')}: "
                    f"{type(e).__name__}: {str(e)}",
                    exc_info=False,
                )
                continue

        return itineraries

    def _resolve_carrier_name(
        self,
        carrier_ids: List[int],
        carriers_by_id: Dict[int, Dict],
    ) -> str:
        """
        Resolve a list of carrier IDs to a human-readable airline name.

        Returns the name of the first resolved carrier, or "Unknown" if
        no carrier can be resolved.

        Parameters:
        -----------
        carrier_ids : List[int]
            Marketing carrier IDs from the leg object
        carriers_by_id : Dict[int, Dict]
            Lookup dict built from the response's `carriers` array

        Returns:
        --------
        str
            Airline name (e.g. "Finnair") or "Unknown"
        """
        for cid in carrier_ids:
            carrier = carriers_by_id.get(cid)
            if carrier:
                return carrier.get("name", "Unknown")
        return "Unknown"
