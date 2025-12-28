from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime


class Metrics(BaseModel):
    delayed_flights_count: int
    cancelled_flights_count: int
    passengers_impacted_est: int
    connections_at_risk_est: int
    avg_delay_minutes: Optional[int] = None


class DisruptionSummary(BaseModel):
    disruption_id: str
    severity: str
    airport: str
    region: str
    primary_flight_number: str
    metrics: Metrics
    last_updated: datetime


class DisruptionListResponse(BaseModel):
    items: List[DisruptionSummary]


class Scope(BaseModel):
    airport: str
    region: str
    primary_flight_number: str


class CohortSummary(BaseModel):
    cohort_id: str
    priority: str
    reason: str
    passenger_count: int


class DisruptionDetail(BaseModel):
    disruption_id: str
    severity: str
    scope: Scope
    metrics: Metrics
    cohorts: List[CohortSummary]
    last_updated: datetime


class PassengerItinerary(BaseModel):
    flight_number: str
    origin_airport: str
    destination_airport: str
    scheduled_departure: str
    connection_flight_number: Optional[str]


class Passenger(BaseModel):
    passenger_id: str
    pnr: str
    loyalty_tier: Optional[str]
    special_assistance: bool
    itinerary: PassengerItinerary


class CohortDetail(BaseModel):
    cohort_id: str
    priority: str
    reason: str
    passengers: List[Passenger]


class PassengerCohortsResponse(BaseModel):
    disruption_id: str
    cohorts: List[CohortDetail]


class RecoveryAction(BaseModel):
    action_id: str
    action_type: str
    priority: str
    target: dict
    details: dict
    status: str
    created_at: str


class RecoveryActionsResponse(BaseModel):
    disruption_id: str
    actions: List[RecoveryAction]


class AuditTrail(BaseModel):
    disruption_id: str
    model: dict
    decision_summary: dict
    safety_and_guardrails: dict
    performance: dict
    created_at: str
