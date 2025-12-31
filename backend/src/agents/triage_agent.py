from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional
from ..common.llm_client import ClaudeClient



@dataclass
class TriageResult:
    severity_score: float                 # 0.0 (low) -> 1.0 (high)
    cause: str                            # DELAY / CANCEL / WEATHER / UNKNOWN
    constraints: Dict[str, Any]           # rules for rebooking
    notes: str                            # short explanation


def _parse_iso(dt: Optional[str]) -> Optional[datetime]:
    if not dt:
        return None
    try:
        # Works for "2025-12-31T14:50:00"
        return datetime.fromisoformat(dt)
    except Exception:
        return None


def _delay_minutes(scheduled: Optional[str], estimated: Optional[str]) -> Optional[int]:
    a = _parse_iso(scheduled)
    b = _parse_iso(estimated)
    if not a or not b:
        return None
    return int((b - a).total_seconds() // 60)


def triage(disruption: Dict[str, Any]) -> TriageResult:
    """
    disruption can be your DisruptionEvent.dict() OR raw dict.
    Keep it forgiving.
    """
    event_type = (disruption.get("event_type") or disruption.get("type") or "UNKNOWN").upper()

    # Try to compute delay-based severity when possible
    scheduled = disruption.get("scheduled_departure") or disruption.get("scheduledDeparture")
    estimated = disruption.get("estimated_departure") or disruption.get("estimatedDeparture")
    mins = _delay_minutes(scheduled, estimated)

    # Base severity from type
    if event_type in {"CANCEL", "CANCELLATION"}:
        base = 0.95
        cause = "CANCEL"
    elif event_type in {"WEATHER"}:
        base = 0.75
        cause = "WEATHER"
    elif event_type in {"DELAY", "LATE"}:
        base = 0.55
        cause = "DELAY"
    else:
        base = 0.40
        cause = "UNKNOWN"

    # Adjust severity using delay minutes (if present)
    if mins is not None:
        if mins >= 180:
            base = max(base, 0.90)
        elif mins >= 120:
            base = max(base, 0.80)
        elif mins >= 60:
            base = max(base, 0.65)
        elif mins >= 30:
            base = max(base, 0.55)
        else:
            base = max(base, 0.35)

    # Constraints: simple and practical
    # (You can tune later. These are solid defaults.)
    constraints: Dict[str, Any] = {
        "min_layover_minutes": 45 if base >= 0.75 else 35,
        "max_stops": 1 if base >= 0.75 else 2,
        "avoid_overnight": True if base >= 0.75 else False,
    }

    note_parts = [f"type={event_type}", f"severity={base:.2f}"]
    if mins is not None:
        note_parts.append(f"delay_minutes={mins}")
    notes = ", ".join(note_parts)

    return TriageResult(
        severity_score=round(base, 2),
        cause=cause,
        constraints=constraints,
        notes=notes,
    )



_TRIAGE_SCHEMA = """
{
  "severity_score": 0.0,
  "cause": "DELAY|CANCEL|WEATHER|CREW|ATC|MAINTENANCE|UNKNOWN",
  "constraints": {
    "min_layover_minutes": 30,
    "max_stops": 2,
    "avoid_overnight": false
  },
  "notes": "string"
}
"""


def triage_llm(disruption: dict) -> TriageResult:
    claude = ClaudeClient()

    system = (
        "You are an airline operations disruption triage agent. "
        "You analyze flight disruptions and produce operational constraints."
    )

    user = f"""
Disruption event:
{disruption}

Rules:
- severity_score must be between 0 and 1
- Cancellations and long delays increase severity
- Higher severity → stricter constraints
"""

    data = claude.json_response(
        system=system,
        user=user,
        schema_hint=_TRIAGE_SCHEMA,
    )

    return TriageResult(
        severity_score=float(data["severity_score"]),
        cause=data["cause"],
        constraints=data["constraints"],
        notes=data["notes"],
    )
