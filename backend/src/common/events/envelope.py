from typing import Any, Dict
from datetime import datetime, timezone
from uuid import uuid4
from pydantic import BaseModel


class EventEnvelope(BaseModel):
    event_id: str
    event_type: str
    source: str
    occurred_at: datetime
    payload: Dict[str, Any]

    @staticmethod
    def create(event_type: str, source: str, payload: Dict[str, Any]):
        return EventEnvelope(
            event_id=str(uuid4()),
            event_type=event_type,
            source=source,
            occurred_at=datetime.now(timezone.utc),
            payload=payload,
        )
