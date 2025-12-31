from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
import logging

from ..common.events.envelope import EventEnvelope
from ..common.events.topics import FLIGHT_OPS_EVENTS_V1
from . import store
from .kafka_client import kafka_producer

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/simulate/activate-crisis")
def activate_crisis(payload: Dict[str, Any] = None):
    """Activate a crisis scenario that progressively cancels flights"""
    if payload is None:
        payload = {}
    
    crisis_type = payload.get("crisis_type", "SEVERE_WEATHER")
    affected_airlines = payload.get("affected_airlines", ["AA", "DL", "UA"])
    
    crisis_data = store.activate_crisis_scenario(crisis_type, affected_airlines)
    
    logger.info(f"Crisis activated: {crisis_type} affecting {affected_airlines}")
    
    return {
        "status": "crisis_activated",
        "crisis": crisis_data
    }


@router.get("/simulate/crisis-status")
def get_crisis_status():
    """Get current crisis simulation status"""
    return store.get_crisis_status()


@router.post("/simulate/deactivate-crisis")
def deactivate_crisis():
    """Deactivate crisis simulation"""
    result = store.deactivate_crisis()
    logger.info("Crisis simulation deactivated")
    return result


@router.post("/simulate/flight-disruption")
def simulate_flight_disruption(payload: Dict[str, Any]):
    required_fields = ["flight_number", "airport", "delay_minutes"]
    if not all(field in payload for field in required_fields):
        raise HTTPException(status_code=400, detail=f"Missing required fields: {required_fields}")

    store.upsert_disruption_from_flight_event(payload)

    event = EventEnvelope.create(
        event_type="FLIGHT_DISRUPTION",
        source="simulator",
        payload=payload,
    )

    kafka_success = kafka_producer.produce(
        topic=FLIGHT_OPS_EVENTS_V1,
        key=payload["flight_number"],
        value=event.model_dump(mode="json")
    )

    return {
        "status": "published" if kafka_success else "stored_locally",
        "topic": FLIGHT_OPS_EVENTS_V1,
        "event": event.model_dump(),
        "kafka_enabled": kafka_success
    }
