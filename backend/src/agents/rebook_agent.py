from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from ..schemas.recommendation import NormalizedOffer
from ..tools.amadeus_tool import AmadeusTool


@dataclass
class RebookResult:
    offers: List[NormalizedOffer]
    notes: str


def _get_int(d: Dict[str, Any], key: str, default: int) -> int:
    v = d.get(key, default)
    try:
        return int(v)
    except Exception:
        return default


def filter_offers_by_constraints(
    offers: List[NormalizedOffer], constraints: Dict[str, Any]
) -> List[NormalizedOffer]:
    max_stops = _get_int(constraints, "max_stops", 2)

    filtered: List[NormalizedOffer] = []
    for o in offers:
        if o.stops > max_stops:
            continue
        filtered.append(o)

    return filtered


def rebook(
    *,
    origin: str,
    destination: str,
    departure_date: str,
    adults: int,
    max_results: int,
    constraints: Dict[str, Any],
    tool: Optional[AmadeusTool] = None,
) -> RebookResult:
    tool = tool or AmadeusTool()

    normalized = tool.search_offers(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        adults=adults,
        max_results=max_results,
    )

    filtered = filter_offers_by_constraints(normalized, constraints)
    notes = f"normalized={len(normalized)}, after_constraints={len(filtered)}"
    return RebookResult(offers=filtered, notes=notes)
