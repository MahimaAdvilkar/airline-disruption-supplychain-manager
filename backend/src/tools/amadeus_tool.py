from __future__ import annotations

from typing import Any, Dict, List

from ..api_service.amadeus_client import AmadeusClient
from ..schemas.recommendation import NormalizedOffer


def _count_stops(itinerary: Dict[str, Any]) -> int:
    segments = itinerary.get("segments") or []
    return max(0, len(segments) - 1)


def _route(itinerary: Dict[str, Any]) -> List[str]:
    segments = itinerary.get("segments") or []
    if not segments:
        return []

    route: List[str] = []

    first_dep = segments[0].get("departure", {}).get("iataCode")
    if first_dep:
        route.append(first_dep)

    for seg in segments:
        arr = seg.get("arrival", {}).get("iataCode")
        if arr:
            route.append(arr)

    cleaned: List[str] = []
    for x in route:
        if not cleaned or cleaned[-1] != x:
            cleaned.append(x)

    return cleaned


def _carriers(itinerary: Dict[str, Any]) -> List[str]:
    carriers: List[str] = []
    for seg in itinerary.get("segments") or []:
        code = seg.get("carrierCode")
        if code and code not in carriers:
            carriers.append(code)
    return carriers


class AmadeusTool:
    """
    Tool wrapper:
    - calls AmadeusClient.search_flight_offers(...)
    - normalizes response into NormalizedOffer objects
    """

    def normalize_offers(self, amadeus_json: Dict[str, Any]) -> List[NormalizedOffer]:
        offers = amadeus_json.get("offers") or amadeus_json.get("data") or []
        normalized: List[NormalizedOffer] = []

        for off in offers:
            offer_id = str(off.get("id", ""))

            price = off.get("price", {}) or {}
            total_str = price.get("grandTotal") or price.get("total") or "0"
            currency = price.get("currency") or "USD"

            try:
                total_price = float(total_str)
            except Exception:
                total_price = 0.0

            itineraries = off.get("itineraries") or []
            if itineraries:
                it0 = itineraries[0]
                total_duration = it0.get("duration") or ""
                stops = _count_stops(it0)
                route = _route(it0)
                carriers = _carriers(it0)
            else:
                total_duration = ""
                stops = 0
                route = []
                carriers = []

            normalized.append(
                NormalizedOffer(
                    offer_id=offer_id,
                    total_price=total_price,
                    currency=currency,
                    total_duration=total_duration,
                    stops=stops,
                    route=route,
                    carriers=carriers,
                    raw=off,
                )
            )

        return normalized

    def search_offers(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        adults: int = 1,
        max_results: int = 5,
    ) -> List[NormalizedOffer]:
        client = AmadeusClient()

        data = client.search_flight_offers(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            adults=adults,
            max_results=max_results,
        )

        return self.normalize_offers(data)
