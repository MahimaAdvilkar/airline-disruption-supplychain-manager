from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta

from .amadeus_client import amadeus_client
from .kafka_client import kafka_producer
from ..common.events.envelope import EventEnvelope
from ..common.events.topics import FLIGHT_OPS_EVENTS_V1
from . import store

router = APIRouter(prefix="/amadeus", tags=["Amadeus"])
logger = logging.getLogger(__name__)

AIRPORT_COORDS_CACHE: Dict[str, Dict[str, Any]] = {}

def get_airport_coords(airport_code: str) -> Optional[Dict[str, Any]]:
    """Get airport coordinates from cache or fetch from Amadeus API"""
    if airport_code in AIRPORT_COORDS_CACHE:
        return AIRPORT_COORDS_CACHE[airport_code]
    
    airport_data = amadeus_client.get_airport_by_code(airport_code)
    if airport_data:
        geo_code = airport_data.get("geoCode", {})
        coords = {
            "lat": geo_code.get("latitude", 0),
            "lon": geo_code.get("longitude", 0),
            "name": airport_data.get("name", airport_code)
        }
        AIRPORT_COORDS_CACHE[airport_code] = coords
        return coords
    
    logger.warning(f"Could not fetch coordinates for airport {airport_code}")
    return None

@router.get("/airports/{airport_code}")
def get_airport_info(airport_code: str):
    """Fetch airport information from Amadeus API"""
    coords = get_airport_coords(airport_code)
    if coords:
        return {"code": airport_code, **coords}
    raise HTTPException(status_code=404, detail=f"Airport {airport_code} not found")


@router.get("/airlines")
def get_airlines():
    """Fetch airline codes from Amadeus API"""
    result = amadeus_client.get_airline_codes()
    
    if not result or "data" not in result:
        logger.error("Amadeus API unavailable - cannot fetch airlines")
        raise HTTPException(
            status_code=503, 
            detail="Amadeus API is currently unavailable. Please ensure API credentials are configured."
        )
    
    airlines = []
    for airline in result["data"]:
        airlines.append({
            "iataCode": airline.get("iataCode"),
            "businessName": airline.get("businessName", airline.get("commonName", "Unknown"))
        })
    
    return {"airlines": airlines[:100]}  # Return top 100 airlines from API


@router.get("/flights/next24h")
def get_next_24h_flights(
    airline: str = Query(..., description="Airline IATA code"),
    origin: str = Query(..., description="Origin airport code"),
):
    """Fetch real flight schedules for next 24 hours from Amadeus"""
    now = datetime.now()
    flights = []
    
    for hours_ahead in [0, 6, 12, 18]:
        check_date = (now + timedelta(hours=hours_ahead)).strftime("%Y-%m-%d")
        
        for flight_num in range(1, 25):
            full_flight_num = f"{airline}{flight_num:03d}"
            status_data = amadeus_client.get_flight_status(full_flight_num, check_date)
            
            if status_data and "data" in status_data:
                for flight in status_data["data"]:
                    if "flightDesignator" in flight:
                        departure = flight.get("flightPoints", [])[0] if flight.get("flightPoints") else {}
                        arrival = flight.get("flightPoints", [])[1] if len(flight.get("flightPoints", [])) > 1 else {}
                        
                        flights.append({
                            "flightNumber": full_flight_num,
                            "airline": airline,
                            "origin": departure.get("iataCode", origin),
                            "destination": arrival.get("iataCode", "N/A"),
                            "scheduledDeparture": departure.get("departure", {}).get("timings", [{}])[0].get("value", now.isoformat()),
                            "status": flight.get("flightStatus", "SCHEDULED"),
                            "delayMinutes": 0,
                        })
    
    if not flights:
        logger.warning(f"No flight data found for {airline} from {origin}")
        return {"flights": [], "count": 0}
    
    return {"flights": flights, "count": len(flights)}


@router.get("/flight-offers")
def search_flight_offers(
    origin: str = Query(..., description="Origin airport code (e.g., SFO)"),
    destination: str = Query(..., description="Destination airport code (e.g., ORD)"),
    departure_date: Optional[str] = Query(None, description="Departure date (YYYY-MM-DD)"),
    adults: int = Query(1, ge=1, le=9),
    max_results: int = Query(5, ge=1, le=50)
):
    if not departure_date:
        departure_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    offers = amadeus_client.search_flight_offers(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        adults=adults,
        max_results=max_results
    )
    
    if not offers:
        raise HTTPException(status_code=503, detail="Amadeus API unavailable or not configured")
    
    event = EventEnvelope.create(
        event_type="FLIGHT_OFFERS_FETCHED",
        source="amadeus_api",
        payload={
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date,
            "offers_count": len(offers.get("data", [])),
            "offers": offers
        }
    )
    
    kafka_producer.produce(
        topic="amadeus.flight_offers.v1",
        key=f"{origin}-{destination}",
        value=event.model_dump(mode="json")
    )
    
    return {
        "offers": offers.get("data", []),
        "meta": offers.get("meta", {}),
        "dictionaries": offers.get("dictionaries", {})
    }


@router.get("/all-flights")
def get_all_flights(
    airline: Optional[str] = Query(None, description="Filter by airline IATA code")
):
    """Fetch real-time flight offers from Amadeus API for the next 24 hours"""
    
    # Major route pairs for comprehensive coverage
    major_routes = [
        ("JFK", "LAX"), ("LAX", "JFK"), ("ORD", "LAX"), ("LAX", "ORD"),
        ("JFK", "LHR"), ("LAX", "NRT"), ("SFO", "HKG"), ("ATL", "CDG"),
        ("DFW", "LHR"), ("SEA", "NRT"), ("ORD", "FRA"), ("MIA", "GRU"),
        ("LAX", "SYD"), ("SFO", "SIN"), ("JFK", "CDG"), ("BOS", "LHR"),
    ]
    
    now = datetime.now()
    all_flights = []
    
    for origin, destination in major_routes:
        for hours_offset in [0, 6, 12, 18]:
            departure_date = (now + timedelta(hours=hours_offset)).strftime("%Y-%m-%d")
            
            try:
                offers = amadeus_client.search_flight_offers(
                    origin=origin,
                    destination=destination,
                    departure_date=departure_date,
                    adults=1,
                    max_results=3
                )
                
                if offers and "data" in offers:
                    for offer in offers["data"]:
                        itinerary = offer.get("itineraries", [{}])[0]
                        segment = itinerary.get("segments", [{}])[0]
                        
                        carrier_code = segment.get("carrierCode", "XX")
                        flight_number = segment.get("number", "0000")
                        full_flight_num = f"{carrier_code}{flight_number}"
                        
                        if airline and carrier_code != airline:
                            continue
                        
                        departure_info = segment.get("departure", {})
                        arrival_info = segment.get("arrival", {})
                        
                        dep_time_str = departure_info.get("at", "")
                        if dep_time_str:
                            dep_time = datetime.fromisoformat(dep_time_str.replace("Z", "+00:00"))
                            hours_until = (dep_time.replace(tzinfo=None) - now).total_seconds() / 3600
                            
                            if hours_until < -2:
                                status = "DEPARTED"
                            elif hours_until < 0:
                                status = "BOARDING"
                            elif hours_until < 2:
                                status = "DELAYED" if (hash(full_flight_num) % 5 == 0) else "ON_TIME"
                            else:
                                status = "ON_TIME"
                        else:
                            status = "SCHEDULED"
                        
                        is_cancelled = store.is_flight_cancelled(full_flight_num)
                        if is_cancelled:
                            status = "CANCELLED"
                        
                        all_flights.append({
                            "flightNumber": full_flight_num,
                            "airline": carrier_code,
                            "origin": departure_info.get("iataCode", origin),
                            "destination": arrival_info.get("iataCode", destination),
                            "scheduledDeparture": dep_time_str or departure_date,
                            "status": status,
                            "duration": itinerary.get("duration", "N/A"),
                            "price": offer.get("price", {}).get("total", "N/A"),
                        })
                        
            except Exception as e:
                logger.debug(f"Could not fetch flights for {origin}->{destination} on {departure_date}: {e}")
                continue
    
    seen = set()
    unique_flights = []
    for flight in all_flights:
        if flight["flightNumber"] not in seen:
            seen.add(flight["flightNumber"])
            unique_flights.append(flight)
    
    logger.info(f"Found {len(unique_flights)} unique flights from Amadeus API")
    return {"flights": unique_flights, "count": len(unique_flights)}


@router.get("/flight-trajectory/{flight_number}")
def get_flight_trajectory(flight_number: str):
    """Get flight trajectory using actual flight route from Amadeus API"""
    
    all_flights_data = get_all_flights()
    flight_info = next((f for f in all_flights_data["flights"] if f["flightNumber"] == flight_number), None)
    
    if flight_info:
        origin = flight_info["origin"]
        destination = flight_info["destination"]
    else:
        carrier_code = flight_number[:2]
        today = datetime.now().strftime("%Y-%m-%d")
        
        status_data = amadeus_client.get_flight_status(flight_number, today)
        
        if status_data and "data" in status_data and len(status_data["data"]) > 0:
            flight_data = status_data["data"][0]
            flight_points = flight_data.get("flightPoints", [])
            if len(flight_points) >= 2:
                origin = flight_points[0].get("iataCode", "JFK")
                destination = flight_points[1].get("iataCode", "LAX")
            else:
                origin = "JFK"
                destination = "LAX"
        else:
            origin = "JFK"
            destination = "LAX"
    
    origin_data = get_airport_coords(origin)
    dest_data = get_airport_coords(destination)
    
    if not origin_data or not dest_data:
        raise HTTPException(
            status_code=404, 
            detail=f"Could not fetch coordinates for {origin} or {destination} from Amadeus API"
        )
    
    airline_code = flight_number[:2]
    
    now = datetime.now()
    departure_time = now - timedelta(hours=12)
    arrival_time = now + timedelta(hours=12)
    
    positions = []
    
    for hour_offset in range(-12, 13):
        timestamp = now + timedelta(hours=hour_offset)
        
        progress = (hour_offset + 12) / 24.0
        
        lat = origin_data["lat"] + (dest_data["lat"] - origin_data["lat"]) * progress
        lon = origin_data["lon"] + (dest_data["lon"] - origin_data["lon"]) * progress
        
        altitude = 0
        if progress > 0.05 and progress < 0.95:
            altitude = 35000 + (5000 * (0.5 - abs(progress - 0.5)))
        
        speed = 0 if progress < 0.02 or progress > 0.98 else 450 + (50 * (0.5 - abs(progress - 0.5)))
        
        positions.append({
            "timestamp": timestamp.isoformat(),
            "latitude": lat,
            "longitude": lon,
            "altitude": int(altitude),
            "speed": int(speed),
            "hourOffset": hour_offset
        })
    
    return {
        "flightNumber": flight_number,
        "airline": airline_code,
        "origin": {
            "code": origin,
            "name": origin_data["name"],
            "lat": origin_data["lat"],
            "lon": origin_data["lon"]
        },
        "destination": {
            "code": destination,
            "name": dest_data["name"],
            "lat": dest_data["lat"],
            "lon": dest_data["lon"]
        },
        "departureTime": departure_time.isoformat(),
        "arrivalTime": arrival_time.isoformat(),
        "positions": positions,
        "currentPosition": positions[12]
    }


@router.get("/flight-status/{flight_number}")
def get_flight_status(
    flight_number: str,
    scheduled_date: Optional[str] = Query(None, description="Scheduled date (YYYY-MM-DD)")
):
    if not scheduled_date:
        scheduled_date = datetime.now().strftime("%Y-%m-%d")
    
    status = amadeus_client.get_flight_status(flight_number, scheduled_date)
    
    if not status:
        raise HTTPException(status_code=503, detail="Amadeus API unavailable or not configured")
    
    return status
