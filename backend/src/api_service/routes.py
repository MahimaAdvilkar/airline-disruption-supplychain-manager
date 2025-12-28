from fastapi import APIRouter, HTTPException
from . import store

router = APIRouter()


@router.get("/disruptions")
def list_disruptions():
    return {"items": store.get_disruptions()}


@router.get("/disruptions/{disruption_id}")
def get_disruption(disruption_id: str):
    detail = store.get_disruption_detail(disruption_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return detail


@router.get("/disruptions/{disruption_id}/cohorts")
def get_cohorts(disruption_id: str):
    cohorts = store.get_cohorts(disruption_id)
    if not cohorts:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return cohorts


@router.get("/disruptions/{disruption_id}/actions")
def get_actions(disruption_id: str):
    actions = store.get_actions(disruption_id)
    if not actions:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return actions


@router.get("/disruptions/{disruption_id}/audit")
def get_audit(disruption_id: str):
    audit = store.get_audit(disruption_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Disruption not found")
    return audit
