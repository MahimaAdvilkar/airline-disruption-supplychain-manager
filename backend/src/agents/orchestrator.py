from __future__ import annotations

from uuid import uuid4

from ..schemas.recommendation import RecommendationRequest, RecommendationResponse
from .triage_agent import triage_llm
from .rebook_agent import rebook
from .decision_agent import decide_llm


def run_recommendation_pipeline(req: RecommendationRequest) -> RecommendationResponse:
    """
    Claude brain:
      - triage_llm() generates severity + constraints
      - decide_llm() ranks offers + produces reasoning

    Tools:
      - rebook() calls AmadeusTool.search_offers() and filters offers
    """
    trace_id = str(uuid4())

    # 1) LLM triage (Claude)
    t = triage_llm(req.disruption.model_dump())

    # 2) Tool rebook (Amadeus) + constraints filtering
    origin = req.search.get("origin")
    destination = req.search.get("destination")
    departure_date = req.search.get("departure_date") or req.search.get("date")
    adults = int(req.passenger.get("adults", 1))
    max_results = int(req.search.get("max_results", 5))

    r = rebook(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        adults=adults,
        max_results=max_results,
        constraints=t.constraints,
    )

    # 3) LLM decision (Claude)
    d = decide_llm(r.offers, t.notes, top_k=3)

    return RecommendationResponse(
        trace_id=trace_id,
        severity_score=t.severity_score,
        recommended_offers=d.recommended,
        reasoning=d.reasoning,
        confidence=d.confidence,
    )
