import logging
from typing import Optional, Dict, Any
import httpx
from datetime import datetime, timedelta
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import settings

logger = logging.getLogger(__name__)


class AmadeusClient:
    def __init__(self):
        self.base_url = settings.amadeus_api_base_url
        self.client_id = settings.amadeus_client_id
        self.client_secret = settings.amadeus_client_secret
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.http_client = httpx.Client(timeout=30.0)
    
    def _get_access_token(self) -> Optional[str]:
        if not self.client_id or not self.client_secret:
            logger.warning("Amadeus credentials not configured")
            return None
        
        if self.access_token and self.token_expires_at and datetime.now() < self.token_expires_at:
            return self.access_token
        
        try:
            response = self.http_client.post(
                f"{self.base_url}/v1/security/oauth2/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            response.raise_for_status()
            
            data = response.json()
            self.access_token = data["access_token"]
            expires_in = data.get("expires_in", 1799)
            self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)
            
            logger.info("Amadeus access token obtained successfully")
            return self.access_token
        except Exception as e:
            logger.error(f"Failed to get Amadeus access token: {e}")
            return None
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    def search_flight_offers(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        adults: int = 1,
        max_results: int = 5
    ) -> Optional[Dict[str, Any]]:
        token = self._get_access_token()
        if not token:
            return None
        
        try:
            response = self.http_client.get(
                f"{self.base_url}/v2/shopping/flight-offers",
                params={
                    "originLocationCode": origin,
                    "destinationLocationCode": destination,
                    "departureDate": departure_date,
                    "adults": adults,
                    "max": max_results,
                    "currencyCode": "USD"
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            
            logger.info(f"Successfully fetched flight offers: {origin} -> {destination}")
            return response.json()
        except Exception as e:
            logger.error(f"Failed to search flight offers: {e}")
            return None
    
    def get_flight_status(self, flight_number: str, scheduled_date: str) -> Optional[Dict[str, Any]]:
        token = self._get_access_token()
        if not token:
            return None
        
        try:
            carrier_code = flight_number[:2]
            flight_num = flight_number[2:]
            
            response = self.http_client.get(
                f"{self.base_url}/v2/schedule/flights",
                params={
                    "carrierCode": carrier_code,
                    "flightNumber": flight_num,
                    "scheduledDepartureDate": scheduled_date
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            
            logger.info(f"Successfully fetched flight status for {flight_number}")
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get flight status: {e}")
            return None
    
    def get_airline_codes(self) -> Optional[Dict[str, Any]]:
        token = self._get_access_token()
        if not token:
            return None
        
        try:
            response = self.http_client.get(
                f"{self.base_url}/v1/reference-data/airlines",
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            
            logger.info("Successfully fetched airline codes from Amadeus")
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get airline codes: {e}")
            return None
    
    def get_airport_by_code(self, airport_code: str) -> Optional[Dict[str, Any]]:
        """Fetch airport information including coordinates by IATA code"""
        token = self._get_access_token()
        if not token:
            return None
        
        try:
            response = self.http_client.get(
                f"{self.base_url}/v1/reference-data/locations",
                params={
                    "subType": "AIRPORT",
                    "keyword": airport_code,
                    "page[limit]": 1
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            
            data = response.json()
            if data.get("data") and len(data["data"]) > 0:
                airport = data["data"][0]
                logger.info(f"Successfully fetched airport data for {airport_code}")
                return airport
            
            logger.warning(f"No airport data found for {airport_code}")
            return None
        except Exception as e:
            logger.error(f"Failed to get airport data for {airport_code}: {e}")
            return None
    
    def get_airports_by_codes(self, airport_codes: list) -> Dict[str, Dict[str, Any]]:
        """Fetch multiple airports data in batch"""
        airports = {}
        for code in airport_codes:
            airport_data = self.get_airport_by_code(code)
            if airport_data:
                geo_code = airport_data.get("geoCode", {})
                airports[code] = {
                    "lat": geo_code.get("latitude", 0),
                    "lon": geo_code.get("longitude", 0),
                    "name": airport_data.get("name", code)
                }
        return airports
    
    def get_airline_routes(self, airline_code: str) -> Optional[Dict[str, Any]]:
        """Get all routes operated by a specific airline"""
        token = self._get_access_token()
        if not token:
            return None
        
        try:
            response = self.http_client.get(
                f"{self.base_url}/v1/airline/destinations",
                params={
                    "airlineCode": airline_code
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            
            logger.info(f"Successfully fetched routes for airline {airline_code}")
            return response.json()
        except Exception as e:
            logger.debug(f"Airline routes not available for {airline_code}: {e}")
            return None
    
    def get_airline_schedule(self, airline_code: str, departure_date: str) -> Optional[Dict[str, Any]]:
        """Get airline's full schedule for a specific date"""
        token = self._get_access_token()
        if not token:
            return None
        
        try:
            # Search for scheduled flights by carrier
            response = self.http_client.get(
                f"{self.base_url}/v2/schedule/flights",
                params={
                    "carrierCode": airline_code,
                    "scheduledDepartureDate": departure_date
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"Successfully fetched schedule for airline {airline_code} on {departure_date} - {len(result.get('data', []))} flights")
            return result
        except Exception as e:
            logger.warning(f"Schedule not available for {airline_code} on {departure_date}: {e}")
            return None
    
    def close(self):
        self.http_client.close()


amadeus_client = AmadeusClient()
