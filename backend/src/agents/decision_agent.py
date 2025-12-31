from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

from backend.src.schemas.recommendation import NormalizedOffer, RecommendedOffer


@dataclass
class DecisionResult:
    recommended: List[RecommendedOffer]
    reasoning: List[str]
    confidence: float
    notes: str


def _parse_duration_to_minutes(iso_duration: str) -> int:
    """
    Parse very common ISO-8601 durations like 'PT7H9M' into minutes.
    Lightweight, no external deps.
    """
    if not iso_duration or not iso_duration.startswith("PT"):
        return 10**9

    h = 0
    m = 0
    s = iso_duration[2:]  # after PT

    num = ""
    for ch in s:
        if ch.isdigit():
            num += ch
            continue
        if ch == "H":
            h = int(num or "0")
            num = ""
        elif ch == "M":
            m = int(num or "0")
            num = ""
        else:
            # ignore seconds etc.
            num = ""
    return h * 60 + m


def score_offer(offer: NormalizedOffer) -> float:
    duration_min = _parse_duration_to_minutes(offer.total_duration)
    # weights tuned for simple behavior:
    # duration matters most, stops is big penalty, price is mild
    return (duration_min * 1.0) + (offer.stops * 90.0) + (offer.total_price * 0.15)


def decide(
    offers: List[NormalizedOffer],
    triage_notes: str,
    *,
    top_k: int = 3,
) -> DecisionResult:
    if not offers:
        return DecisionResult(
            recommended=[],
            reasoning=["No available rebooking offers after applying constraints."],
            confidence=0.2,
            notes="no_offers",
        )

    scored: List[Tuple[NormalizedOffer, float]] = [(o, score_offer(o)) for o in offers]
    scored.sort(key=lambda x: x[1])  # lower score is better

    top = scored[:top_k]
    recommended: List[RecommendedOffer] = []
    for i, (off, sc) in enumerate(top, start=1):
        recommended.append(RecommendedOffer(rank=i, offer=off, score=round(sc, 2)))

    # basic reasoning — we’ll improve later
    best = recommended[0].offer
    reasoning = [
        f"Chosen best overall score (duration + stops + price).",
        f"Best option route: {' → '.join(best.route) if best.route else 'N/A'}",
        f"Triage: {triage_notes}",
    ]

    # confidence heuristic
    confidence = 0.75 if len(offers) >= 2 else 0.6

    return DecisionResult(
        recommended=recommended,
        reasoning=reasoning,
        confidence=confidence,
        notes=f"offers_in={len(offers)}, recommended={len(recommended)}",
    )

from backend.src.common.llm_client import ClaudeClient
from backend.src.schemas.recommendation import RecommendedOffer


_DECISION_SCHEMA = """
{
  "recommended_offer_ids": ["string"],
  "reasoning": ["string"],
  "confidence": 0.0
}
"""


def decide_llm(offers, triage_notes: str, top_k: int = 3):
    claude = ClaudeClient()

    system = (
        "You are an airline rebooking decision agent. "
        "Choose the best rebooking options based on risk and passenger experience."
    )

    offer_summaries = [
        {
            "offer_id": o.offer_id,
            "price": o.total_price,
            "duration": o.total_duration,
            "stops": o.stops,
            "route": o.route,
            "carriers": o.carriers,
        }
        for o in offers
    ]

    user = f"""
Triage notes:
{triage_notes}

Available offers:
{offer_summaries}

Choose the best {min(top_k, len(offers))} offers.
Prefer fewer stops, shorter duration, and reliable connections.
"""

    data = claude.json_response(
        system=system,
        user=user,
        schema_hint=_DECISION_SCHEMA,
    )

    id_map = {o.offer_id: o for o in offers}
    recommended = []

    for i, oid in enumerate(data["recommended_offer_ids"][:top_k], start=1):
        off = id_map.get(oid)
        if off:
            recommended.append(RecommendedOffer(rank=i, offer=off, score=0.0))

    return DecisionResult(
        recommended=recommended,
        reasoning=data["reasoning"],
        confidence=float(data["confidence"]),
        notes="llm_decision",
    )
