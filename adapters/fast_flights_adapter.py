# """
# FastFlights API Adapter

# Transforms fast-flights library data into UniversalFlight format.
# Handles parsing of inconsistent string formats (prices, durations, datetimes)
# into standardized types.
# """

# from fast_flights import get_flights, FlightData, Passengers, Result
# from models.flight import UniversalFlight
# from typing import List
# from datetime import datetime, timedelta
# import re
# import logging

# logger = logging.getLogger(__name__)


# class FastFlightsAdapter:
#     """
#     Adapter for the fast-flights library.
    
#     Converts fast-flights Flight objects (with string-based data)
#     into UniversalFlight objects (with typed, standardized data).
#     """
    
#     def search_flights(
#         self,
#         origin: str,
#         destination: str,
#         date: str,
#         seat_class: str = "economy",
#         max_stops: int = 2
#     ) -> List[UniversalFlight]:
#         """
#         Search flights and return in universal format.
        
#         Args:
#             origin: 3-letter airport code (e.g., "SFO")
#             destination: 3-letter airport code (e.g., "DEL")
#             date: Date string in format "YYYY-MM-DD"
#             seat_class: "economy", "premium-economy", "business", or "first"
#             max_stops: Maximum number of layovers
        
#         Returns:
#             List of UniversalFlight objects in standardized format
            
#         Raises:
#             Exception: If the flight search API call fails
#         """
#         try:
#             # Call fast-flights API
#             result: Result = get_flights(
#                 FlightData(
#                     date=date,
#                     from_airport=origin,
#                     to_airport=destination,
#                     trip_class=seat_class
#                 ),
#                 fetch_mode="fallback"
#             )
            
#             if not result or not result.flights:
#                 logger.warning(f"No flights found for {origin} -> {destination} on {date}")
#                 return []
            
#             universal_flights = []
            
#             for flight in result.flights:
#                 try:
#                     # Filter by max stops
#                     if flight.stops > max_stops:
#                         continue
                    
#                     # Parse price
#                     price_usd = self._parse_price(flight.price)
                    
#                     # Parse duration
#                     duration_minutes = self._parse_duration(flight.duration)
                    
#                     # Parse datetimes (handle arrival_time_ahead for date offsets)
#                     departure_datetime = self._parse_datetime(flight.departure, date)
                    
#                     # Handle arrival date offset if present
#                     arrival_date = date
#                     if hasattr(flight, 'arrival_time_ahead') and flight.arrival_time_ahead:
#                         days_ahead = int(flight.arrival_time_ahead.replace('+', ''))
#                         base_date = datetime.strptime(date, "%Y-%m-%d")
#                         arrival_date_obj = base_date + timedelta(days=days_ahead)
#                         arrival_date = arrival_date_obj.strftime("%Y-%m-%d")
                    
#                     arrival_datetime = self._parse_datetime(flight.arrival, arrival_date)
                    
#                     # Construct route
#                     route = f"{origin}-{destination}"
                    
#                     # Create UniversalFlight object
#                     universal_flight = UniversalFlight(
#                         price_usd=price_usd,
#                         duration_minutes=duration_minutes,
#                         stops=flight.stops,
#                         departure_datetime=departure_datetime,
#                         arrival_datetime=arrival_datetime,
#                         airline=flight.name,
#                         route=route,
#                         price_indicator=result.current_price if hasattr(result, 'current_price') else None,
#                         is_best=flight.is_best if hasattr(flight, 'is_best') else None
#                     )
                    
#                     universal_flights.append(universal_flight)
                    
#                 except Exception as e:
#                     logger.warning(f"Failed to parse flight {flight.name}: {e}. Skipping.")
#                     continue
            
#             logger.info(f"Successfully converted {len(universal_flights)} flights to universal format")
#             return universal_flights
            
#         except Exception as e:
#             raise Exception(f"Failed to search flights from {origin} to {destination}: {str(e)}")
    
#     def _parse_price(self, price_str: str) -> float:
#         """
#         Parse price string to float.
        
#         Examples:
#             "$460" -> 460.0
#             "$1,234" -> 1234.0
#             "$2,500.50" -> 2500.5
        
#         Args:
#             price_str: Price string from fast-flights (e.g., "$460")
        
#         Returns:
#             Price as float in USD
#         """
#         # Remove dollar sign and commas
#         cleaned = price_str.replace('$', '').replace(',', '')
#         return float(cleaned)
    
#     def _parse_duration(self, duration_str: str) -> int:
#         """
#         Parse duration string to total minutes.
        
#         Examples:
#             "21 hr 20 min" -> 1280
#             "25 hr 5 min" -> 1505
#             "2 hr 30 min" -> 150
#             "45 min" -> 45
#             "5 hr" -> 300
        
#         Args:
#             duration_str: Duration string from fast-flights (e.g., "21 hr 20 min")
        
#         Returns:
#             Total duration in minutes
#         """
#         total_minutes = 0
        
#         # Extract hours
#         hr_match = re.search(r'(\d+)\s*hr', duration_str)
#         if hr_match:
#             total_minutes += int(hr_match.group(1)) * 60
        
#         # Extract minutes
#         min_match = re.search(r'(\d+)\s*min', duration_str)
#         if min_match:
#             total_minutes += int(min_match.group(1))
        
#         return total_minutes
    
#     def _parse_datetime(self, time_str: str, date_str: str) -> str:
#         """
#         Parse datetime from fast-flights format to ISO 8601.
        
#         Examples:
#             ("3:40 PM on Thu, Mar 12", "2026-03-12") -> "2026-03-12T15:40:00"
#             ("1:30 AM on Sat, Mar 14", "2026-03-14") -> "2026-03-14T01:30:00"
        
#         Args:
#             time_str: Time string from fast-flights (e.g., "3:40 PM on Thu, Mar 12")
#             date_str: Date in YYYY-MM-DD format to extract year
        
#         Returns:
#             ISO 8601 formatted datetime string
#         """
#         # Extract time component (e.g., "3:40 PM")
#         time_match = re.search(r'(\d{1,2}):(\d{2})\s*(AM|PM)', time_str)
#         if not time_match:
#             raise ValueError(f"Could not parse time from: {time_str}")
        
#         hour = int(time_match.group(1))
#         minute = int(time_match.group(2))
#         period = time_match.group(3)
        
#         # Convert to 24-hour format
#         if period == "PM" and hour != 12:
#             hour += 12
#         elif period == "AM" and hour == 12:
#             hour = 0
        
#         # Extract month and day (e.g., "Mar 12")
#         date_match = re.search(r'([A-Za-z]+)\s+(\d{1,2})', time_str)
#         if not date_match:
#             raise ValueError(f"Could not parse date from: {time_str}")
        
#         month_str = date_match.group(1)
#         day = int(date_match.group(2))
        
#         # Map month abbreviation to number
#         month_map = {
#             'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
#             'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
#         }
#         month = month_map.get(month_str)
#         if not month:
#             raise ValueError(f"Unknown month: {month_str}")
        
#         # Extract year from date_str parameter
#         year = int(date_str.split('-')[0])
        
#         # Create datetime object and format as ISO 8601
#         dt = datetime(year, month, day, hour, minute)
#         return dt.strftime("%Y-%m-%dT%H:%M:%S")
