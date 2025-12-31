from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from datetime import datetime, timedelta

from .amadeus_client import amadeus_client
from .kafka_client import kafka_producer
from backend.src.common.events.envelope import EventEnvelope
from backend.src.common.events.topics import FLIGHT_OPS_EVENTS_V1

router = APIRouter(prefix="/amadeus", tags=["Amadeus"])
logger = logging.getLogger(__name__)


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
