from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from src.common.events.envelope import EventEnvelope
from src.common.events.topics import FLIGHT_OPS_EVENTS_V1
from . import store
from .kafka_client import kafka_producer

router = APIRouter()
logger = logging.getLogger(__name__)


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
