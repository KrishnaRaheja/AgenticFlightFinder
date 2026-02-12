import logging
import json
from typing import Optional, Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool
from adapters.fast_flights_adapter import FastFlightsAdapter

# Set up logging
logging.basicConfig(
    # sets minimum severity of logging: only messages with this level or higher will be logged
    level=logging.INFO,
    # logger.info("Fetching flights") -> "INFO - Fetching flights"
    format="%(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Create server instance
server = Server("flight-search-mcp")

# Initialize adapter
adapter = FastFlightsAdapter()


@server.list_tools()
async def handle_list_tools() -> list[Tool]:
    """List available tools for the MCP server."""
    return [
        Tool(
            name="search_flights",
            description="Search for flights with the specified criteria. Returns a list of flight itineraries sorted by price.",
            inputSchema={
                "type": "object",
                "properties": {
                    "origin": {
                        "type": "string",
                        "description": "IATA code for departure airport (e.g., 'JFK', 'LAX')"
                    },
                    "destination": {
                        "type": "string",
                        "description": "IATA code for arrival airport (e.g., 'JFK', 'LAX')"
                    },
                    "departure_date": {
                        "type": "string",
                        "description": "ISO 8601 date string for departure (YYYY-MM-DD)"
                    },
                    "trip_type": {
                        "type": "string",
                        "enum": ["one-way", "round-trip"],
                        "description": "Type of trip: 'one-way' or 'round-trip' (default: 'one-way')"
                    },
                    "return_date": {
                        "type": "string",
                        "description": "ISO 8601 date string for return (YYYY-MM-DD), required for round-trip"
                    },
                    "seat_class": {
                        "type": "string",
                        "enum": ["economy", "premium_economy", "business", "first"],
                        "description": "Cabin class (default: 'economy')"
                    },
                    "max_stops": {
                        "type": "integer",
                        "description": "Maximum number of stops allowed (default: 2)"
                    }
                },
                "required": ["origin", "destination", "departure_date"]
            }
        )
    ]


@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls from the MCP client (AI agent)."""
    if name == "search_flights":
        try:
            # Extract parameters with defaults
            origin = arguments.get("origin", "").upper()
            destination = arguments.get("destination", "").upper()
            departure_date = arguments.get("departure_date", "")
            trip_type = arguments.get("trip_type", "one-way")
            return_date = arguments.get("return_date")
            seat_class = arguments.get("seat_class", "economy")
            max_stops = arguments.get("max_stops", 2)
            
            # Validate required parameters
            if not origin or not destination or not departure_date:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "error": "Missing required parameters",
                        "required": ["origin", "destination", "departure_date"]
                    })
                )]
            
            # Call the adapter
            logger.info(f"Calling search_flights with origin={origin}, destination={destination}, departure_date={departure_date}")
            
            # search_flights should return a list of FlightItinerary objects, impl in respective adapter
            itineraries = adapter.search_flights(
                origin=origin,
                destination=destination,
                departure_date=departure_date,
                trip_type=trip_type,
                return_date=return_date,
                seat_class=seat_class,
                max_stops=max_stops
            )
            
            # Convert results to JSON-serializable format
            results = [
                {
                    "outbound": {
                        "airline": flight.outbound.airline,
                        "price_usd": flight.outbound.price_usd,
                        "duration_minutes": flight.outbound.duration_minutes,
                        "stops": flight.outbound.stops,
                        "departure_datetime": flight.outbound.departure_datetime,
                        "arrival_datetime": flight.outbound.arrival_datetime,
                    },
                    "return_flight": {
                        "airline": flight.return_flight.airline,
                        "price_usd": flight.return_flight.price_usd,
                        "duration_minutes": flight.return_flight.duration_minutes,
                        "stops": flight.return_flight.stops,
                        "departure_datetime": flight.return_flight.departure_datetime,
                        "arrival_datetime": flight.return_flight.arrival_datetime,
                    } if flight.return_flight else None,
                    "total_price_usd": flight.total_price_usd,
                    "trip_type": flight.trip_type
                }
                for flight in itineraries
            ]
            
            response = {
                "status": "success",
                "count": len(results),
                "itineraries": results
            }
            
            return [TextContent(
                type="text",
                text=json.dumps(response, indent=2)
            )]
        
        # For all feataures not implemented in the adapter.
        except NotImplementedError as e:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "error": str(e),
                    "status": "not_implemented"
                })
            )]
        
        except Exception as e:
            logger.error(f"Error calling search_flights: {type(e).__name__}: {str(e)}", exc_info=True)
            return [TextContent(
                type="text",
                text=json.dumps({
                    "error": str(e),
                    "status": "error"
                })
            )]
    
    else:
        # When an unknown tool is called, return an error message
        return [TextContent(
            type="text",
            text=json.dumps({
                "error": f"Unknown tool: {name}"
            })
        )]


async def main():
    """Main async function to run the MCP server."""
    logger.info("Starting Flight Search MCP Server")

    async with stdio_server() as (read_stream, write_stream):
        logger.info("Server running on stdio")
        await server.run(
            # Use read_stream and write_stream for communication with the MCP client
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
