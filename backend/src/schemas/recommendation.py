from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional


class DisruptionEvent(BaseModel):
    # Keep flexible for now — we’ll tighten later
    event_type: Optional[str] = None  # DELAY | CANCEL | WEATHER | etc.
    flight_number: Optional[str] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    scheduled_departure: Optional[str] = None  # ISO string
    estimated_departure: Optional[str] = None  # ISO string
    timestamp: Optional[str] = None  # ISO string
    raw: Dict[str, Any] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    disruption: DisruptionEvent = Field(default_factory=DisruptionEvent)

    passenger: Dict[str, Any] = Field(default_factory=dict)  # e.g., {"adults": 1}

    search: Dict[str, Any] = Field(
        default_factory=dict
    )  # e.g., {"origin":"SFO","destination":"ORD","date":"2025-12-31","max_results": 5}


class NormalizedOffer(BaseModel):
    offer_id: str
    total_price: float
    currency: str = "USD"
    total_duration: str  # ISO duration like PT8H12M
    stops: int
    route: List[str]  # e.g., ["SFO","SEA","ORD"]
    carriers: List[str] = Field(default_factory=list)  # e.g., ["AS"]
    raw: Dict[str, Any] = Field(default_factory=dict)


class RecommendedOffer(BaseModel):
    rank: int
    offer: NormalizedOffer
    score: float  # lower is better (we’ll define scoring rules)


class RecommendationResponse(BaseModel):
    trace_id: str
    severity_score: float
    recommended_offers: List[RecommendedOffer] = Field(default_factory=list)
    reasoning: List[str] = Field(default_factory=list)
    confidence: float
