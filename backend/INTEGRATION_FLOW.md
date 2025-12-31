# Backend Integration Flow

## Current Status
✅ Server: Running on http://127.0.0.1:8001
✅ Confluent Kafka: Configured and Connected
✅ Amadeus API: Configured

## Architecture Flow

### 1. KAFKA PRODUCER FLOW (Confluent Cloud)

**File**: `src/api_service/kafka_client.py`

```
Client Initialization:
├── Reads config from .env (CONFLUENT_BOOTSTRAP_SERVERS, API_KEY, SECRET)
├── Creates Producer with SASL_SSL authentication
└── Enables delivery callbacks for message confirmation

Message Publishing:
├── Takes topic, key, and JSON payload
├── Serializes to UTF-8 encoded bytes
├── Publishes to Confluent Cloud
└── Logs delivery confirmation or error
```

**Integration Points**:
- `POST /simulate/flight-disruption` → Publishes to `flight_ops.events.v1`
- `GET /amadeus/flight-offers` → Publishes to `amadeus.flight_offers.v1`

**Test**:
```powershell
POST /simulate/flight-disruption
{
  "flight_number": "UA999",
  "airport": "DEL",
  "delay_minutes": 150,
  "reason": "SEVERE_WEATHER"
}
```

**Expected Output**:
```json
{
  "status": "published",
  "kafka_enabled": true,
  "topic": "flight_ops.events.v1",
  "event": { ... }
}
```

---

### 2. AMADEUS API FLOW

**File**: `src/api_service/amadeus_client.py`

```
Authentication Flow:
├── POST /v1/security/oauth2/token (client_credentials grant)
├── Caches access token (expires in 30 min)
└── Auto-refreshes when expired

Flight Offers Search:
├── GET /v2/shopping/flight-offers
├── Parameters: origin, destination, departureDate, adults, max
└── Returns: offers array, meta, dictionaries

Flight Status:
├── GET /v2/schedule/flights
├── Parameters: carrierCode, flightNumber, scheduledDepartureDate
└── Returns: flight schedule data
```

**Integration Points**:
- `GET /amadeus/flight-offers` → Calls Amadeus → Publishes to Kafka
- `GET /amadeus/flight-status/{flight_number}` → Calls Amadeus directly

**Test**:
```powershell
GET /amadeus/flight-offers?origin=SFO&destination=ORD&adults=1&max_results=2
```

**Expected Flow**:
1. Gets OAuth token from Amadeus
2. Searches for flight offers
3. Publishes result to Kafka (`amadeus.flight_offers.v1`)
4. Returns offers to client

---

### 3. END-TO-END FLOW

```
User Request → FastAPI Endpoint
                    ↓
        ┌───────────┴──────────┐
        ↓                      ↓
  Amadeus Client          Kafka Producer
        ↓                      ↓
  External API          Confluent Cloud
        ↓                      ↓
  Flight Data           Topic Published
        ↓                      ↓
  Store in Memory       Event Logged
        ↓                      ↓
  Return to User       Ready for Consumers
```

---

## API Endpoints

### Core Disruption API
- `GET /health` - Shows Kafka & Amadeus status
- `GET /disruptions` - List all disruptions
- `GET /disruptions/{id}` - Get disruption detail
- `GET /disruptions/{id}/cohorts` - Passenger cohorts
- `GET /disruptions/{id}/actions` - Recovery actions
- `GET /disruptions/{id}/audit` - AI audit trail

### Simulator (Kafka Publisher)
- `POST /simulate/flight-disruption` - Publishes to Kafka

### Amadeus Integration
- `GET /amadeus/flight-offers` - Search flights & publish to Kafka
- `GET /amadeus/flight-status/{flight_number}` - Get flight status

---

## Configuration

**Environment Variables** (`.env`):
```
CONFLUENT_BOOTSTRAP_SERVERS=pkc-921jm.us-east-2.aws.confluent.cloud:9092
CONFLUENT_API_KEY=GSEQTWJJF45R35EH
CONFLUENT_API_SECRET=cfltNLBtSVrMXBf6b6N7mRMDKVYTNq7VudJg++9FDIEXQK51fnMvvOg+7q/KP4ZA

AMADEUS_CLIENT_ID=VpslyxLqAF43HhuwcSfkBJ7jEGkAeia1
AMADEUS_CLIENT_SECRET=H8JDUHE3GdApsB4y
AMADEUS_API_BASE_URL=https://test.api.amadeus.com
```

---

## Kafka Topics

1. **flight_ops.events.v1** - Flight disruptions (cancellations, delays)
2. **amadeus.flight_offers.v1** - Enriched flight offers from Amadeus
3. **booking.events.v1** - Passenger bookings (future)
4. **recovery.actions.v1** - Recovery actions (future)

---

## Error Handling

**Kafka Producer**:
- If credentials missing → Logs warning, continues without Kafka
- If publish fails → Logs error, returns `kafka_enabled: false`

**Amadeus Client**:
- If credentials missing → Returns 503 error
- If API fails → Retries 3 times with exponential backoff
- If token expired → Auto-refreshes before request

**Global Handlers**:
- Validation errors → 422 with details
- Unhandled exceptions → 500 with message
- All requests logged with status codes

---

## How to Test

### Start Server
```powershell
cd backend
uvicorn src.api_service.main:app --reload --port 8001
```

### Run Tests (in separate terminal)
```powershell
cd backend
.\TEST_COMMANDS.ps1
```

### Check Server Logs
Look for:
- `Kafka producer initialized successfully`
- `Amadeus access token obtained successfully`
- `Message delivered to flight_ops.events.v1`
- `Successfully fetched flight offers`

---

## Next Steps

1. ✅ Kafka Producer - DONE
2. ✅ Amadeus Integration - DONE
3. ⏳ Kafka Consumer (read from topics)
4. ⏳ Orchestrator Service (consume offers → generate actions)
5. ⏳ Frontend Dashboard
6. ⏳ Deploy to Cloud Run
