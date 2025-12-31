# API Test Commands

**Server is running on: http://127.0.0.1:8001**

## Run these commands in a NEW PowerShell window:

### 1. Health Check
```powershell
Invoke-RestMethod http://127.0.0.1:8001/health | ConvertTo-Json
```

### 2. List All Disruptions
```powershell
Invoke-RestMethod http://127.0.0.1:8001/disruptions | ConvertTo-Json -Depth 5
```

### 3. Get Disruption Detail
```powershell
Invoke-RestMethod http://127.0.0.1:8001/disruptions/dsp_123 | ConvertTo-Json -Depth 5
```

### 4. Get Passenger Cohorts
```powershell
Invoke-RestMethod http://127.0.0.1:8001/disruptions/dsp_123/cohorts | ConvertTo-Json -Depth 5
```

### 5. Get Recovery Actions
```powershell
Invoke-RestMethod http://127.0.0.1:8001/disruptions/dsp_123/actions | ConvertTo-Json -Depth 5
```

### 6. Get Audit Trail
```powershell
Invoke-RestMethod http://127.0.0.1:8001/disruptions/dsp_123/audit | ConvertTo-Json -Depth 5
```

### 7. Simulate Flight Disruption (Publishes to Kafka!)
```powershell
$body = @{
    flight_number = "UA999"
    airport = "DEL"
    delay_minutes = 150
    reason = "SEVERE_WEATHER"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://127.0.0.1:8001/simulate/flight-disruption -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 5
```

### 8. Check Simulator State
```powershell
Invoke-RestMethod http://127.0.0.1:8001/simulator/state | ConvertTo-Json -Depth 5
```

### 9. Search Amadeus Flight Offers
```powershell
Invoke-RestMethod "http://127.0.0.1:8001/amadeus/flight-offers?origin=SFO&destination=ORD&adults=1&max_results=3" | ConvertTo-Json -Depth 3
```

### 10. Get Flight Status
```powershell
Invoke-RestMethod "http://127.0.0.1:8001/amadeus/flight-status/UA123" | ConvertTo-Json -Depth 3
```

---

## cURL Commands (if you prefer):

```bash
curl http://127.0.0.1:8001/health

curl http://127.0.0.1:8001/disruptions

curl http://127.0.0.1:8001/disruptions/dsp_123

curl -X POST http://127.0.0.1:8001/simulate/flight-disruption \
  -H "Content-Type: application/json" \
  -d '{"flight_number":"UA999","airport":"DEL","delay_minutes":150,"reason":"SEVERE_WEATHER"}'

curl "http://127.0.0.1:8001/amadeus/flight-offers?origin=SFO&destination=ORD&adults=1&max_results=3"
```

---

## What's Integrated:

✅ **Confluent Kafka** - Events are published to `flight_ops.events.v1` topic
✅ **Amadeus API** - Live flight offers and status
✅ **CORS** - Frontend can connect
✅ **Logging** - All requests logged
✅ **Error Handling** - Validation and global exception handlers
✅ **Settings Management** - Environment variables from .env

## API Documentation:
Open in browser: http://127.0.0.1:8001/docs
