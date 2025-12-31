from datetime import datetime, timezone
from typing import Dict, Any, List
import random

_STATE: List[Dict[str, Any]] = []
_CRISIS_SIMULATION: Dict[str, Any] = {
    "active": False,
    "start_time": None,
    "cancelled_flights": [],
    "affected_airlines": [],
    "crisis_type": None,
    "severity": "CRITICAL"
}


def now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_disruptions(
    airport: str | None = None,
    severity: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    """Get disruptions filtered by airport and severity"""
    items = list(_STATE)

    if airport:
        items = [d for d in items if d.get("airport") == airport]

    if severity:
        items = [d for d in items if d.get("severity") == severity]

    return items[offset : offset + limit]


def get_disruption_by_id(disruption_id: str):
    """Get a specific disruption by ID"""
    for d in _STATE:
        if d.get("disruption_id") == disruption_id:
            return d
    return None


def get_disruption_detail(disruption_id: str):
    """Get detailed information about a disruption"""
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
        "cohorts": base.get("cohorts", []),
        "last_updated": base["last_updated"],
    }
    return detail


def activate_crisis_scenario(crisis_type: str = "SEVERE_WEATHER", affected_airlines: List[str] = None):
    """Activate a crisis simulation that progressively cancels flights"""
    global _CRISIS_SIMULATION
    
    if affected_airlines is None:
        affected_airlines = ["AA", "DL", "UA"]
    
    _CRISIS_SIMULATION = {
        "active": True,
        "start_time": now_utc(),
        "cancelled_flights": [],
        "affected_airlines": affected_airlines,
        "crisis_type": crisis_type,
        "severity": "CRITICAL",
        "total_cancelled": 0,
        "cancellation_rate": 0.75
    }
    
    return _CRISIS_SIMULATION


def get_crisis_status():
    """Get current crisis simulation status"""
    return _CRISIS_SIMULATION


def is_flight_cancelled(flight_number: str) -> bool:
    """Check if a flight should be cancelled based on crisis simulation"""
    if not _CRISIS_SIMULATION["active"]:
        return False
    
    airline_code = flight_number[:2]
    if airline_code not in _CRISIS_SIMULATION["affected_airlines"]:
        return False
    
    if flight_number in _CRISIS_SIMULATION["cancelled_flights"]:
        return True
    
    if random.random() < _CRISIS_SIMULATION["cancellation_rate"]:
        _CRISIS_SIMULATION["cancelled_flights"].append(flight_number)
        _CRISIS_SIMULATION["total_cancelled"] = len(_CRISIS_SIMULATION["cancelled_flights"])
        return True
    
    return False


def deactivate_crisis():
    """Deactivate crisis simulation"""
    global _CRISIS_SIMULATION
    _CRISIS_SIMULATION = {
        "active": False,
        "start_time": None,
        "cancelled_flights": [],
        "affected_airlines": [],
        "crisis_type": None,
        "severity": "CRITICAL"
    }
    return {"status": "deactivated"}


def get_cohorts(disruption_id: str):
    """Get passenger cohorts for a disruption"""
    detail = get_disruption_detail(disruption_id)
    if not detail:
        return None

    return {
        "disruption_id": disruption_id,
        "cohorts": detail.get("cohorts", [])
    }


def get_actions(disruption_id: str):
    """Get recovery actions for a disruption"""
    detail = get_disruption_detail(disruption_id)
    if not detail:
        return None

    return {
        "disruption_id": disruption_id,
        "actions": []
    }


def get_audit(disruption_id: str):
    """Get audit trail for a disruption"""
    detail = get_disruption_detail(disruption_id)
    if not detail:
        return None

    return {
        "disruption_id": disruption_id,
        "model": {"provider": "vertex_ai", "name": "gemini", "version": "1.0"},
        "decision_summary": {
            "severity": detail["severity"],
            "total_actions": 0,
            "key_reasons": []
        },
        "safety_and_guardrails": {
            "validated": True,
            "blocked_actions": 0,
            "notes": "All actions validated"
        },
        "performance": {"end_to_end_latency_ms": 0, "model_latency_ms": 0},
        "created_at": now_utc()
    }


def upsert_disruption_from_flight_event(payload: Dict[str, Any]):
    """Create or update disruption from flight event"""
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
        "cohorts": [],
        "last_updated": now_utc(),
        "reason": reason,
    }
    _STATE.append(new_item)
    return new_item

def get_current_state():
    """Get current disruption state"""
    return _STATE
