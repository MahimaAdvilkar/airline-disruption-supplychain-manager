from fastapi import APIRouter
from typing import Dict, Any

from src.common.events.envelope import EventEnvelope
from src.common.events.topics import FLIGHT_OPS_EVENTS_V1

router = APIRouter()


@router.post("/simulate/flight-disruption")
def simulate_flight_disruption(payload: Dict[str, Any]):
    event = EventEnvelope.create(
        event_type="FLIGHT_DISRUPTION",
        source="simulator",
        payload=payload,
    )

    return {
        "topic": FLIGHT_OPS_EVENTS_V1,
        "event": event.model_dump(),
    }
