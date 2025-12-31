from fastapi import APIRouter, HTTPException

from . import store
from .models import (
    DisruptionListResponse,
    DisruptionDetail,
    PassengerCohortsResponse,
    RecoveryActionsResponse,
    AuditTrail,
)

router = APIRouter()


@router.get("/disruptions", response_model=DisruptionListResponse)
def list_disruptions(
    airport: str | None = None,
    severity: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    items = store.get_disruptions(
        airport=airport,
        severity=severity,
        limit=limit,
        offset=offset,
    )
    return {"items": items}


@router.get("/disruptions/{disruption_id}", response_model=DisruptionDetail)
def get_disruption(disruption_id: str):
    detail = store.get_disruption_detail(disruption_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return detail


@router.get(
    "/disruptions/{disruption_id}/cohorts",
    response_model=PassengerCohortsResponse,
)
def get_cohorts(disruption_id: str):
    cohorts = store.get_cohorts(disruption_id)
    if not cohorts:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return cohorts


@router.get(
    "/disruptions/{disruption_id}/actions",
    response_model=RecoveryActionsResponse,
)
def get_actions(disruption_id: str):
    actions = store.get_actions(disruption_id)
    if not actions:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return actions


@router.get("/disruptions/{disruption_id}/audit",
    response_model=AuditTrail,
)
def get_audit(disruption_id: str):
    audit = store.get_audit(disruption_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return audit

@router.get("/disruptions/{disruption_id}/recommendations")
def get_recommendations(disruption_id: str):
    """Get AI-generated recommendations for a disruption"""
    detail = store.get_disruption_detail(disruption_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Disruption not found")
    
    return {
        "disruption_id": disruption_id,
        "recommendations": []
    }

@router.get("/simulator/state")
def get_simulator_state():
    return {"state": store.get_current_state()}
