# Setup Guide: Airline Disruption Backend Integration

## What We Integrated
✅ Confluent Kafka Producer (event streaming)
✅ Amadeus Flight API (flight offers & status)
✅ CORS, logging, error handling
✅ Environment configuration management

## Prerequisites
- Python 3.10+
- Confluent Cloud account with Kafka cluster
- Amadeus API credentials

## Step 1: Install Dependencies

```bash
cd backend
pip install fastapi==0.115.6 uvicorn[standard]==0.32.1 pydantic-settings==2.6.1 python-dotenv==1.0.1 confluent-kafka==2.6.1 httpx==0.28.1 tenacity==9.0.0
```

Or use requirements.txt:
```bash
pip install -r requirements.txt
```

## Step 2: Create Environment File

Create `backend/.env`:
```env
ENVIRONMENT=development
API_PORT=8000
LOG_LEVEL=INFO

CONFLUENT_BOOTSTRAP_SERVERS=pkc-921jm.us-east-2.aws.confluent.cloud:9092
CONFLUENT_API_KEY=GSEQTWJJF45R35EH
CONFLUENT_API_SECRET=cfltNLBtSVrMXBf6b6N7mRMDKVYTNq7VudJg++9FDIEXQK51fnMvvOg+7q/KP4ZA

AMADEUS_CLIENT_ID=VpslyxLqAF43HhuwcSfkBJ7jEGkAeia1
AMADEUS_CLIENT_SECRET=H8JDUHE3GdApsB4y
AMADEUS_API_BASE_URL=https://test.api.amadeus.com
```

## Step 3: Create New Files

### `backend/src/api_service/config.py`
```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    environment: str = "development"
    api_port: int = 8000
    log_level: str = "INFO"
    
    confluent_bootstrap_servers: str = ""
    confluent_api_key: str = ""
    confluent_api_secret: str = ""
    
    amadeus_client_id: str = ""
    amadeus_client_secret: str = ""
    amadeus_api_base_url: str = "https://test.api.amadeus.com"


settings = Settings()
```

### `backend/src/api_service/kafka_client.py`
```python
import json
import logging
from typing import Optional, Dict, Any
from confluent_kafka import Producer, KafkaError
from confluent_kafka.admin import AdminClient, NewTopic

from .config import settings

logger = logging.getLogger(__name__)


class KafkaProducerClient:
    def __init__(self):
        self.producer: Optional[Producer] = None
        self._initialize()
    
    def _initialize(self):
        if not settings.confluent_bootstrap_servers or not settings.confluent_api_key:
            logger.warning("Kafka credentials not configured, producer disabled")
            return
        
        config = {
            'bootstrap.servers': settings.confluent_bootstrap_servers,
            'security.protocol': 'SASL_SSL',
            'sasl.mechanisms': 'PLAIN',
            'sasl.username': settings.confluent_api_key,
            'sasl.password': settings.confluent_api_secret,
            'client.id': 'airline-disruption-api',
        }
        
        try:
            self.producer = Producer(config)
            logger.info("Kafka producer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {e}")
    
    def produce(self, topic: str, key: str, value: Dict[str, Any]) -> bool:
        if not self.producer:
            logger.warning(f"Kafka producer not available, skipping message to {topic}")
            return False
        
        try:
            self.producer.produce(
                topic=topic,
                key=key.encode('utf-8'),
                value=json.dumps(value).encode('utf-8'),
                callback=self._delivery_callback
            )
            self.producer.poll(0)
            return True
        except Exception as e:
            logger.error(f"Failed to produce message to {topic}: {e}")
            return False
    
    def flush(self):
        if self.producer:
            self.producer.flush()
    
    @staticmethod
    def _delivery_callback(err, msg):
        if err:
            logger.error(f'Message delivery failed: {err}')
        else:
            logger.info(f'Message delivered to {msg.topic()} [{msg.partition()}]')


kafka_producer = KafkaProducerClient()
```

### `backend/src/api_service/amadeus_client.py`
```python
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
```

### `backend/src/api_service/amadeus_routes.py`
```python
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from datetime import datetime, timedelta

from .amadeus_client import amadeus_client
from .kafka_client import kafka_producer
from src.common.events.envelope import EventEnvelope
from src.common.events.topics import FLIGHT_OPS_EVENTS_V1

router = APIRouter(prefix="/amadeus", tags=["Amadeus"])
logger = logging.getLogger(__name__)


@router.get("/flight-offers")
def search_flight_offers(
    origin: str = Query(..., description="Origin airport code (e.g., SFO)"),
    destination: str = Query(..., description="Destination airport code (e.g., ORD)"),
    departure_date: Optional[str] = Query(None, description="Departure date (YYYY-MM-DD)"),
    adults: int = Query(1, ge=1, le=9),
    max_results: int = Query(5, ge=1, le=50)
):
    if not departure_date:
        departure_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    offers = amadeus_client.search_flight_offers(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        adults=adults,
        max_results=max_results
    )
    
    if not offers:
        raise HTTPException(status_code=503, detail="Amadeus API unavailable or not configured")
    
    event = EventEnvelope.create(
        event_type="FLIGHT_OFFERS_FETCHED",
        source="amadeus_api",
        payload={
            "origin": origin,
            "destination": destination,
            "departure_date": departure_date,
            "offers_count": len(offers.get("data", [])),
            "offers": offers
        }
    )
    
    kafka_producer.produce(
        topic="amadeus.flight_offers.v1",
        key=f"{origin}-{destination}",
        value=event.model_dump(mode="json")
    )
    
    return {
        "offers": offers.get("data", []),
        "meta": offers.get("meta", {}),
        "dictionaries": offers.get("dictionaries", {})
    }


@router.get("/flight-status/{flight_number}")
def get_flight_status(
    flight_number: str,
    scheduled_date: Optional[str] = Query(None, description="Scheduled date (YYYY-MM-DD)")
):
    if not scheduled_date:
        scheduled_date = datetime.now().strftime("%Y-%m-%d")
    
    status = amadeus_client.get_flight_status(flight_number, scheduled_date)
    
    if not status:
        raise HTTPException(status_code=503, detail="Amadeus API unavailable or not configured")
    
    return status
```

## Step 4: Update Existing Files

### Update `backend/requirements.txt`
```txt
fastapi==0.115.6
uvicorn[standard]==0.32.1
pydantic-settings==2.6.1
python-dotenv==1.0.1
confluent-kafka==2.6.1
httpx==0.28.1
tenacity==9.0.0
```

### Update `backend/src/api_service/main.py`
```python
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import logging
import sys
from datetime import datetime, timezone

from .routes import router
from . import simulator
from .amadeus_routes import router as amadeus_router
from .kafka_client import kafka_producer
from .config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Airline Disruption API Service",
    version="1.0.0",
    description="Real-time airline disruption recovery management API"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "Validation failed", "details": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Internal server error", "message": str(exc)}
    )

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Status: {response.status_code}")
    return response

app.include_router(router)
app.include_router(simulator.router)
app.include_router(amadeus_router)

@app.get("/health")
def health():
    kafka_configured = bool(settings.confluent_bootstrap_servers and settings.confluent_api_key)
    amadeus_configured = bool(settings.amadeus_client_id and settings.amadeus_client_secret)
    
    return {
        "status": "ok",
        "service": "api-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "integrations": {
            "kafka": "configured" if kafka_configured else "not_configured",
            "amadeus": "configured" if amadeus_configured else "not_configured"
        }
    }

@app.on_event("shutdown")
def shutdown_event():
    kafka_producer.flush()
    logger.info("Application shutdown complete")
```

### Update `backend/src/api_service/simulator.py`
```python
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import logging

from src.common.events.envelope import EventEnvelope
from src.common.events.topics import FLIGHT_OPS_EVENTS_V1
from . import store
from .kafka_client import kafka_producer

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/simulate/flight-disruption")
def simulate_flight_disruption(payload: Dict[str, Any]):
    required_fields = ["flight_number", "airport", "delay_minutes"]
    if not all(field in payload for field in required_fields):
        raise HTTPException(status_code=400, detail=f"Missing required fields: {required_fields}")
    
    store.upsert_disruption_from_flight_event(payload)
    
    event = EventEnvelope.create(
        event_type="FLIGHT_DISRUPTION",
        source="simulator",
        payload=payload,
    )
    
    kafka_success = kafka_producer.produce(
        topic=FLIGHT_OPS_EVENTS_V1,
        key=payload["flight_number"],
        value=event.model_dump(mode="json")
    )
    
    return {
        "status": "published" if kafka_success else "stored_locally",
        "topic": FLIGHT_OPS_EVENTS_V1,
        "event": event.model_dump(),
        "kafka_enabled": kafka_success
    }
```

### Remove comments from `backend/src/common/events/topics.py`
```python
FLIGHT_OPS_EVENTS_V1 = "flight_ops.events.v1"
BOOKING_EVENTS_V1 = "booking.events.v1"
INVENTORY_EVENTS_V1 = "inventory.events.v1"

DISRUPTION_STATE_V1 = "disruption.state.v1"
PASSENGER_COHORTS_V1 = "passenger.cohorts.v1"

RECOVERY_ACTIONS_V1 = "recovery.actions.v1"
AGENT_AUDIT_V1 = "agent.audit.v1"
```

### Remove comments from `backend/src/api_service/store.py`
Find and remove all comment lines (lines starting with #) in the file, keeping only the code.

## Step 5: Run the Server

```bash
cd backend
uvicorn src.api_service.main:app --reload --port 8001
```

## Step 6: Test the Integration

Open a NEW terminal and run:

```powershell
# Test health check
Invoke-RestMethod -Uri "http://127.0.0.1:8001/health" | ConvertTo-Json

# Test disruptions list
Invoke-RestMethod -Uri "http://127.0.0.1:8001/disruptions" | ConvertTo-Json

# Test Kafka producer (simulate disruption)
$body = @{
    flight_number = "UA999"
    airport = "DEL"
    delay_minutes = 150
    reason = "SEVERE_WEATHER"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8001/simulate/flight-disruption" `
    -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json

# Test Amadeus API
Invoke-RestMethod -Uri "http://127.0.0.1:8001/amadeus/flight-offers?origin=SFO&destination=ORD&adults=1&max_results=2" | ConvertTo-Json -Depth 3
```

## Verification Checklist

✅ Server starts without errors
✅ Health endpoint shows: `kafka: "configured"` and `amadeus: "configured"`
✅ Simulating disruption returns: `kafka_enabled: true`
✅ Amadeus flight search returns flight offers
✅ Server logs show: "Kafka producer initialized successfully"
✅ Server logs show: "Message delivered to flight_ops.events.v1"

## Troubleshooting

**Kafka not connecting:**
- Check CONFLUENT_BOOTSTRAP_SERVERS, CONFLUENT_API_KEY, CONFLUENT_API_SECRET in .env
- Verify cluster is running in Confluent Cloud

**Amadeus API failing:**
- Verify AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET in .env
- Check if credentials are for test environment (test.api.amadeus.com)

**Import errors:**
- Run from `backend` directory
- Ensure all files are in correct paths

## What Each Integration Does

**Kafka Producer:**
- Publishes flight disruption events to Confluent Cloud
- Publishes Amadeus flight offers to Kafka topic
- Enables real-time event streaming

**Amadeus Client:**
- Searches for flight offers between airports
- Gets flight status information
- Auto-handles OAuth token refresh
- Retries failed requests automatically

## API Documentation

Once server is running, visit:
- Swagger UI: http://127.0.0.1:8001/docs
- ReDoc: http://127.0.0.1:8001/redoc
