from fastapi import APIRouter
from typing import Dict, Any

from src.common.events.envelope import EventEnvelope
from src.common.events.topics import FLIGHT_OPS_EVENTS_V1
from . import store

router = APIRouter()


@router.post("/simulate/flight-disruption")
def simulate_flight_disruption(payload: Dict[str, Any]):
    """
    Simulates a real-time flight operations disruption event.
    For now: updates in-memory state.
    Later: publish to Confluent Kafka + have a consumer update state.
    """
    # Update "live" disruption state (simulating stream processing)
    store.upsert_disruption_from_flight_event(payload)

    # Emit an event envelope (what will later be produced to Kafka)
    event = EventEnvelope.create(
        event_type="FLIGHT_DISRUPTION",
        source="simulator",
        payload=payload,
    )

    return {
        "topic": FLIGHT_OPS_EVENTS_V1,
        "event": event.model_dump(),
    }
