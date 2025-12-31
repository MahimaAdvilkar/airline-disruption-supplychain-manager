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
    
    def close(self):
        self.http_client.close()


amadeus_client = AmadeusClient()
