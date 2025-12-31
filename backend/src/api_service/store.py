from datetime import datetime, timezone
from typing import Dict, Any, List

_STATE: List[Dict[str, Any]] = []


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_seed_data():
    global _STATE
    if _STATE:
        return

    t = now_utc()
    _STATE = [
        {
            "disruption_id": "dsp_123",
            "severity": "HIGH",
            "airport": "SFO",
            "region": "US-WEST",
            "primary_flight_number": "UA123",
            "metrics": {
                "delayed_flights_count": 14,
                "cancelled_flights_count": 3,
                "passengers_impacted_est": 640,
                "connections_at_risk_est": 120,
            },
            "last_updated": t,
        },
        {
            "disruption_id": "dsp_456",
            "severity": "MEDIUM",
            "airport": "LAX",
            "region": "US-WEST",
            "primary_flight_number": "DL410",
            "metrics": {
                "delayed_flights_count": 6,
                "cancelled_flights_count": 1,
                "passengers_impacted_est": 180,
                "connections_at_risk_est": 30,
            },
            "last_updated": t,
        },
    ]


def get_disruptions(
    airport: str | None = None,
    severity: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    _ensure_seed_data()

    items = list(_STATE)

    if airport:
        items = [d for d in items if d.get("airport") == airport]

    if severity:
        items = [d for d in items if d.get("severity") == severity]

    return items[offset : offset + limit]


def get_disruption_by_id(disruption_id: str):
    _ensure_seed_data()
    for d in _STATE:
        if d.get("disruption_id") == disruption_id:
            return d
    return None


def get_disruption_detail(disruption_id: str):
    base = get_disruption_by_id(disruption_id)
    if not base:
        return None

    detail = {
        "disruption_id": base["disruption_id"],
        "severity": base["severity"],
        "scope": {
            "airport": base["airport"],
            "region": base["region"],
            "primary_flight_number": base["primary_flight_number"],
        },
        "metrics": {
            **base["metrics"],
            "avg_delay_minutes": 52 if base["severity"] in ("HIGH", "CRITICAL") else 25,
        },
        "cohorts": [
            {"cohort_id": "c_001", "priority": "P0", "reason": "SPECIAL_ASSISTANCE", "passenger_count": 18},
            {"cohort_id": "c_002", "priority": "P1", "reason": "TIGHT_CONNECTION", "passenger_count": 64},
            {"cohort_id": "c_003", "priority": "P2", "reason": "LOYALTY_PREMIUM", "passenger_count": 40},
        ],
        "last_updated": base["last_updated"],
    }
    return detail


def get_cohorts(disruption_id: str):
    detail = get_disruption_detail(disruption_id)
    if not detail:
        return None

    return {
        "disruption_id": disruption_id,
        "cohorts": [
            {
                "cohort_id": "c_001",
                "priority": "P0",
                "reason": "SPECIAL_ASSISTANCE",
                "passengers": [
                    {
                        "passenger_id": "p_9001",
                        "pnr": "AB12CD",
                        "loyalty_tier": "GOLD",
                        "special_assistance": True,
                        "itinerary": {
                            "flight_number": detail["scope"]["primary_flight_number"],
                            "origin_airport": detail["scope"]["airport"],
                            "destination_airport": "ORD",
                            "scheduled_departure": "2025-12-28T01:10:00Z",
                            "connection_flight_number": "UA456",
                        },
                    }
                ],
            }
        ],
    }


def get_actions(disruption_id: str):
    detail = get_disruption_detail(disruption_id)
    if not detail:
        return None

    return {
        "disruption_id": disruption_id,
        "actions": [
            {
                "action_id": "a_001",
                "action_type": "REBOOK",
                "priority": "P0",
                "target": {"pnr": "AB12CD", "passenger_id": "p_9001"},
                "details": {"recommended_option": "UA789 SFO→ORD 03:10Z", "notes": "Auto-protect under policy"},
                "status": "VALIDATED",
                "created_at": "2025-12-28T00:02:00Z",
            },
            {
                "action_id": "a_002",
                "action_type": "HOTEL_OFFER",
                "priority": "P1",
                "target": {"pnr": "ZX98YU", "passenger_id": "p_8122"},
                "details": {"hotel": "Airport Inn", "nights": 1, "cap_usd": 180},
                "status": "VALIDATED",
                "created_at": "2025-12-28T00:02:10Z",
            },
        ],
    }


def get_audit(disruption_id: str):
    detail = get_disruption_detail(disruption_id)
    if not detail:
        return None

    return {
        "disruption_id": disruption_id,
        "model": {"provider": "vertex_ai", "name": "gemini", "version": "tbd"},
        "decision_summary": {
            "severity": detail["severity"],
            "total_actions": 2,
            "key_reasons": ["high cancellations", "connection risk", "limited capacity"],
        },
        "safety_and_guardrails": {
            "validated": True,
            "blocked_actions": 1,
            "notes": "Blocked hotel for non-overnight delays (policy guardrail)",
        },
        "performance": {"end_to_end_latency_ms": 1240, "model_latency_ms": 680},
        "created_at": "2025-12-28T00:02:01Z",
    }


def upsert_disruption_from_flight_event(payload: Dict[str, Any]):
    _ensure_seed_data()
    global _STATE

    flight_number = payload.get("flight_number", "UNKNOWN")
    airport = payload.get("airport", "UNK")
    delay_minutes = int(payload.get("delay_minutes", 0))
    reason = payload.get("reason", "UNKNOWN")

    severity = "LOW"
    if delay_minutes >= 120:
        severity = "HIGH"
    elif delay_minutes >= 60:
        severity = "MEDIUM"

    for d in _STATE:
        if d.get("primary_flight_number") == flight_number:
            d["severity"] = severity
            d["airport"] = airport
            d["metrics"]["delayed_flights_count"] += 1
            d["metrics"]["passengers_impacted_est"] += 25
            d["metrics"]["connections_at_risk_est"] += 5
            d["last_updated"] = now_utc()
            d["reason"] = reason
            return d

    new_item = {
        "disruption_id": f"dsp_{len(_STATE) + 1000}",
        "severity": severity,
        "airport": airport,
        "region": "US-WEST",
        "primary_flight_number": flight_number,
        "metrics": {
            "delayed_flights_count": 1,
            "cancelled_flights_count": 0,
            "passengers_impacted_est": 80,
            "connections_at_risk_est": 15,
        },
        "last_updated": now_utc(),
        "reason": reason,
    }
    _STATE.append(new_item)
    return new_item

def get_current_state():
    _ensure_seed_data()
    return _STATE
