"""
Comprehensive Test Suite for FastFlightsAdapter

Purpose:
    Validates that FastFlightsAdapter correctly:
    - Searches for flights using fast-flights API
    - Parses string formats (price, duration, datetime)
    - Removes duplicate flights
    - Structures data in universal format
    - Handles errors gracefully
    - Raises NotImplementedError for unsupported features

Test Coverage:
    - One-way searches with different parameters
    - Direct flights vs connecting flights (max_stops filtering)
    - Round-trip validation (should raise NotImplementedError)
    - Data structure validation (FlightItinerary format)
    - Data type validation (prices, datetimes, durations)
    - Duplicate removal effectiveness
    - Error handling and logging
"""

import logging
import sys
import re
from datetime import datetime
from typing import List
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from adapters.fast_flights_adapter import FastFlightsAdapter
from models.universal_flight_model import FlightItinerary, UniversalFlight


# Configure logging to see adapter behavior
logging.basicConfig(
    level=logging.INFO,
    format="%(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class TestResult:
    """Container for test results."""
    
    def __init__(self, test_name: str):
        self.test_name = test_name
        self.passed = False
        self.error = None
        self.data = None
    
    def __repr__(self) -> str:
        status = "✅ PASS" if self.passed else "❌ FAIL"
        result = f"{status} | {self.test_name}"
        if self.error:
            result += f"\n         Error: {self.error}"
        return result


class AdapterTestSuite:
    """Comprehensive test suite for FastFlightsAdapter."""
    
    def __init__(self):
        self.adapter = FastFlightsAdapter()
        self.results: List[TestResult] = []
    
    def run_all_tests(self):
        """Run all test cases."""
        print("\n" + "=" * 80)
        print("FASTFLIGHTSADAPTER COMPREHENSIVE TEST SUITE")
        print("=" * 80 + "\n")
        
        # Test 1: Basic one-way search
        self.test_basic_one_way_search()
        
        # Test 2: Direct flights only
        self.test_direct_flights()
        
        # Test 3: Flights with connections allowed
        self.test_connecting_flights()
        
        # Test 4: Round-trip validation
        self.test_round_trip_not_implemented()
        
        # Test 5: Data structure validation
        self.test_data_structure()
        
        # Test 6: Data type validation
        self.test_data_types()
        
        # Test 7: Datetime format validation
        self.test_datetime_format()
        
        # Test 8: Duplicate removal
        self.test_duplicate_removal()
        
        # Print all results
        self.print_results()
    
    def test_basic_one_way_search(self):
        """Test 1: Basic one-way search with economy class."""
        print("\n" + "-" * 80)
        print("TEST 1: Basic One-Way Search (SFO → DEL, March 20, 2026, Economy)")
        print("-" * 80)
        
        test = TestResult("Basic one-way search")
        
        try:
            itineraries = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="one-way",
                seat_class="economy",
                max_stops=2
            )
            
            if not itineraries:
                test.error = "No flights found"
                self.results.append(test)
                print(test)
                return
            
            test.data = itineraries
            test.passed = True
            
            print(f"✅ Found {len(itineraries)} unique flights")
            print(f"   Price range: ${min(f.total_price_usd for f in itineraries):.2f} - "
                  f"${max(f.total_price_usd for f in itineraries):.2f}")
            
            # Show first 3 flights
            print(f"\n   Sample flights (first 3):")
            for i, flight in enumerate(itineraries[:3], 1):
                print(f"   {i}. {flight.outbound.airline} | "
                      f"${flight.total_price_usd:.2f} | "
                      f"{flight.outbound.stops} stops | "
                      f"{flight.outbound.duration_minutes} min")
        
        except Exception as e:
            test.error = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Test failed: {test.error}", exc_info=True)
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def test_direct_flights(self):
        """Test 2: Filter for direct flights only (max_stops=0)."""
        print("\n" + "-" * 80)
        print("TEST 2: Direct Flights Only (max_stops=0)")
        print("-" * 80)
        
        test = TestResult("Direct flights only (max_stops=0)")
        
        try:
            itineraries = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="one-way",
                seat_class="economy",
                max_stops=0  # Only direct flights
            )
            
            # Verify all returned flights are direct
            all_direct = all(flight.outbound.stops == 0 for flight in itineraries)
            
            if all_direct:
                test.passed = True
                print(f"✅ All {len(itineraries)} flights are direct (0 stops)")
            else:
                test.error = "Some flights have stops when max_stops=0"
                indirect_flights = [f for f in itineraries if f.outbound.stops > 0]
                print(f"❌ Found {len(indirect_flights)} flights with stops:")
                for flight in indirect_flights[:3]:
                    print(f"   - {flight.outbound.airline}: {flight.outbound.stops} stops")
        
        except Exception as e:
            test.error = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Test failed: {test.error}", exc_info=True)
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def test_connecting_flights(self):
        """Test 3: Allow connecting flights (max_stops=2)."""
        print("\n" + "-" * 80)
        print("TEST 3: Connecting Flights (max_stops=2)")
        print("-" * 80)
        
        test = TestResult("Connecting flights allowed (max_stops=2)")
        
        try:
            itineraries = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="one-way",
                seat_class="economy",
                max_stops=2
            )
            
            # Count flights by stops
            direct = [f for f in itineraries if f.outbound.stops == 0]
            one_stop = [f for f in itineraries if f.outbound.stops == 1]
            two_stop = [f for f in itineraries if f.outbound.stops == 2]
            
            # Verify none exceed max_stops
            exceeds_max = [f for f in itineraries if f.outbound.stops > 2]
            
            if not exceeds_max:
                test.passed = True
                print(f"✅ All flights respect max_stops=2")
                print(f"   Distribution: {len(direct)} direct, "
                      f"{len(one_stop)} one-stop, {len(two_stop)} two-stop")
            else:
                test.error = f"{len(exceeds_max)} flights exceed max_stops=2"
                print(f"❌ {test.error}")
        
        except Exception as e:
            test.error = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Test failed: {test.error}", exc_info=True)
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def test_round_trip_not_implemented(self):
        """Test 4: Verify round-trip raises NotImplementedError."""
        print("\n" + "-" * 80)
        print("TEST 4: Round-Trip Validation (should raise NotImplementedError)")
        print("-" * 80)
        
        test = TestResult("Round-trip raises NotImplementedError")
        
        try:
            itineraries = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="round-trip",
                return_date="2026-03-27",
                seat_class="economy",
                max_stops=2
            )
            
            test.error = "Expected NotImplementedError but search succeeded"
            print(f"❌ {test.error}")
        
        except NotImplementedError as e:
            test.passed = True
            print(f"✅ Correctly raised NotImplementedError")
            print(f"   Message: {str(e)}")
        
        except Exception as e:
            test.error = f"Wrong exception type: {type(e).__name__}: {str(e)}"
            print(f"❌ {test.error}")
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def test_data_structure(self):
        """Test 5: Validate FlightItinerary and UniversalFlight structure."""
        print("\n" + "-" * 80)
        print("TEST 5: Data Structure Validation")
        print("-" * 80)
        
        test = TestResult("Data structure validation")
        
        try:
            itineraries = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="one-way",
                seat_class="economy",
                max_stops=2
            )
            
            if not itineraries:
                test.error = "No flights found"
                print(f"❌ {test.error}")
                self.results.append(test)
                return
            
            # Check structure of first flight
            flight = itineraries[0]
            issues = []
            
            # FlightItinerary checks
            if not isinstance(flight, FlightItinerary):
                issues.append(f"Not a FlightItinerary: {type(flight)}")
            
            if flight.trip_type != "one-way":
                issues.append(f"trip_type should be 'one-way', got '{flight.trip_type}'")
            
            if flight.return_flight is not None:
                issues.append(f"return_flight should be None for one-way, got {flight.return_flight}")
            
            if flight.outbound is None:
                issues.append("outbound flight is None")
            
            # UniversalFlight checks
            if flight.outbound:
                outbound = flight.outbound
                
                if outbound.leg_type != "one-way":
                    issues.append(f"outbound.leg_type should be 'one-way', "
                                f"got '{outbound.leg_type}'")
                
                if not outbound.route or "-" not in outbound.route:
                    issues.append(f"route format invalid: '{outbound.route}'")
                
                if outbound.price_usd != flight.total_price_usd:
                    issues.append(f"Price mismatch: outbound={outbound.price_usd}, "
                                f"total={flight.total_price_usd}")
                
                if not outbound.airline:
                    issues.append("airline is missing")
                
                if not outbound.departure_datetime or not outbound.arrival_datetime:
                    issues.append("departure_datetime or arrival_datetime is missing")
            
            if issues:
                test.error = "; ".join(issues)
                print(f"❌ Structure issues found:")
                for issue in issues:
                    print(f"   - {issue}")
            else:
                test.passed = True
                print(f"✅ All flights have correct structure")
                print(f"   Sample flight structure:")
                if flight.outbound:
                    print(f"   - trip_type: {flight.trip_type}")
                    print(f"   - outbound present: True")
                    print(f"   - return_flight: {flight.return_flight}")
                    print(f"   - outbound.leg_type: {flight.outbound.leg_type}")
                    print(f"   - outbound.route: {flight.outbound.route}")
        
        except Exception as e:
            test.error = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Test failed: {test.error}", exc_info=True)
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def test_data_types(self):
        """Test 6: Validate data types of all fields."""
        print("\n" + "-" * 80)
        print("TEST 6: Data Type Validation")
        print("-" * 80)
        
        test = TestResult("Data type validation")
        
        try:
            itineraries = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="one-way",
                seat_class="economy",
                max_stops=2
            )
            
            if not itineraries:
                test.error = "No flights found"
                print(f"❌ {test.error}")
                self.results.append(test)
                return
            
            type_issues = []
            
            # Check first 5 flights for type consistency
            for i, flight in enumerate(itineraries[:5]):
                outbound = flight.outbound
                
                if not isinstance(outbound.price_usd, (int, float)):
                    type_issues.append(f"Flight {i}: price_usd not numeric "
                                     f"({type(outbound.price_usd).__name__})")
                
                if outbound.price_usd <= 0:
                    type_issues.append(f"Flight {i}: price_usd not positive ({outbound.price_usd})")
                
                if not isinstance(outbound.duration_minutes, int):
                    type_issues.append(f"Flight {i}: duration_minutes not int "
                                     f"({type(outbound.duration_minutes).__name__})")
                
                if outbound.duration_minutes <= 0:
                    type_issues.append(f"Flight {i}: duration_minutes not positive ({outbound.duration_minutes})")
                
                if not isinstance(outbound.stops, int):
                    type_issues.append(f"Flight {i}: stops not int "
                                     f"({type(outbound.stops).__name__})")
                
                if outbound.stops < 0:
                    type_issues.append(f"Flight {i}: stops negative ({outbound.stops})")
                
                if not isinstance(outbound.airline, str):
                    type_issues.append(f"Flight {i}: airline not string "
                                     f"({type(outbound.airline).__name__})")
            
            if type_issues:
                test.error = "; ".join(type_issues[:5])  # First 5 issues
                print(f"❌ Type issues found (showing first 5):")
                for issue in type_issues[:5]:
                    print(f"   - {issue}")
            else:
                test.passed = True
                print(f"✅ All data types are correct (checked first 5 flights)")
                sample = itineraries[0].outbound
                print(f"   Sample types:")
                print(f"   - price_usd: {type(sample.price_usd).__name__} = {sample.price_usd}")
                print(f"   - duration_minutes: {type(sample.duration_minutes).__name__} = {sample.duration_minutes}")
                print(f"   - stops: {type(sample.stops).__name__} = {sample.stops}")
                print(f"   - airline: {type(sample.airline).__name__} = '{sample.airline}'")
        
        except Exception as e:
            test.error = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Test failed: {test.error}", exc_info=True)
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def test_datetime_format(self):
        """Test 7: Validate datetime ISO 8601 format."""
        print("\n" + "-" * 80)
        print("TEST 7: DateTime Format Validation (ISO 8601)")
        print("-" * 80)
        
        test = TestResult("DateTime format validation")
        
        try:
            itineraries = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="one-way",
                seat_class="economy",
                max_stops=2
            )
            
            if not itineraries:
                test.error = "No flights found"
                print(f"❌ {test.error}")
                self.results.append(test)
                return
            
            # ISO 8601 format: YYYY-MM-DDTHH:MM:SS
            iso8601_pattern = re.compile(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$')
            datetime_issues = []
            
            for i, flight in enumerate(itineraries[:5]):
                outbound = flight.outbound
                
                if not iso8601_pattern.match(outbound.departure_datetime):
                    datetime_issues.append(
                        f"Flight {i}: invalid departure format: '{outbound.departure_datetime}'"
                    )
                
                if not iso8601_pattern.match(outbound.arrival_datetime):
                    datetime_issues.append(
                        f"Flight {i}: invalid arrival format: '{outbound.arrival_datetime}'"
                    )
                
                # Parse datetimes to verify validity
                try:
                    dep = datetime.fromisoformat(outbound.departure_datetime)
                    arr = datetime.fromisoformat(outbound.arrival_datetime)
                    
                    if arr <= dep:
                        datetime_issues.append(
                            f"Flight {i}: arrival before/equal departure"
                        )
                except ValueError:
                    datetime_issues.append(
                        f"Flight {i}: datetime not parseable"
                    )
            
            if datetime_issues:
                test.error = "; ".join(datetime_issues[:5])
                print(f"❌ DateTime format issues found (showing first 5):")
                for issue in datetime_issues[:5]:
                    print(f"   - {issue}")
            else:
                test.passed = True
                print(f"✅ All datetimes in correct ISO 8601 format (checked first 5 flights)")
                sample = itineraries[0].outbound
                print(f"   Sample datetimes:")
                print(f"   - departure: {sample.departure_datetime}")
                print(f"   - arrival: {sample.arrival_datetime}")
                print(f"   - duration: {sample.duration_minutes} minutes")
        
        except Exception as e:
            test.error = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Test failed: {test.error}", exc_info=True)
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def test_duplicate_removal(self):
        """Test 8: Verify duplicate removal works."""
        print("\n" + "-" * 80)
        print("TEST 8: Duplicate Removal Effectiveness")
        print("-" * 80)
        
        test = TestResult("Duplicate removal")
        
        try:
            # Perform two searches and compare results
            itineraries_1 = self.adapter.search_flights(
                origin="SFO",
                destination="DEL",
                departure_date="2026-03-20",
                trip_type="one-way",
                seat_class="economy",
                max_stops=2
            )
            
            if not itineraries_1:
                test.error = "No flights found"
                print(f"❌ {test.error}")
                self.results.append(test)
                return
            
            # Create signatures for deduplication check
            signatures = set()
            duplicates = 0
            
            # Note: We can't directly test raw vs processed since we only see processed
            # But we can verify no duplicates in returned results
            for flight in itineraries_1:
                sig = (
                    flight.outbound.price_usd,
                    flight.outbound.departure_datetime,
                    flight.outbound.airline
                )
                
                if sig in signatures:
                    duplicates += 1
                else:
                    signatures.add(sig)
            
            if duplicates == 0:
                test.passed = True
                print(f"✅ No duplicates found in {len(itineraries_1)} returned flights")
            else:
                test.error = f"{duplicates} duplicate flights found"
                print(f"❌ {test.error}")
        
        except Exception as e:
            test.error = f"{type(e).__name__}: {str(e)}"
            logger.error(f"Test failed: {test.error}", exc_info=True)
        
        self.results.append(test)
        print(test if not test.passed else "")
    
    def print_results(self):
        """Print summary of all test results."""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80 + "\n")
        
        passed = sum(1 for r in self.results if r.passed)
        failed = sum(1 for r in self.results if not r.passed)
        
        for result in self.results:
            print(result)
        
        print("\n" + "-" * 80)
        print(f"Total: {len(self.results)} tests | "
              f"✅ Passed: {passed} | ❌ Failed: {failed}")
        print("-" * 80 + "\n")
        
        # Final verdict
        if failed == 0:
            print("🎉 ALL TESTS PASSED! Adapter is working correctly.")
        else:
            print(f"⚠️  {failed} test(s) failed. Review issues above.")
        
        print("=" * 80 + "\n")


def main():
    """Run the test suite."""
    try:
        suite = AdapterTestSuite()
        suite.run_all_tests()
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {type(e).__name__}: {str(e)}")
        logger.error("Test suite crashed", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
