"""Simple smoke test for the fast-flights library."""

from fast_flights import FlightData, Passengers, Result, get_flights


def main() -> None:
	result: Result = get_flights(
		flight_data=[
			FlightData(date="2026-03-12", from_airport="SEA", to_airport="OAK"),
			FlightData(date="2026-03-19", from_airport="OAK", to_airport="SEA"),  # return flight
		],
		trip="round-trip",
		seat="economy",
		passengers=Passengers(adults=1, children=0, infants_in_seat=0, infants_on_lap=0),
		fetch_mode="fallback",
	)

	print(result)


if __name__ == "__main__":
	main()
