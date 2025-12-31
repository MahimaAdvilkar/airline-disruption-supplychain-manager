# API Test Commands - Run these in a NEW PowerShell terminal while server is running

# 1. Health Check (shows Kafka + Amadeus status)
Invoke-RestMethod -Uri "http://127.0.0.1:8001/health" | ConvertTo-Json

# 2. List Disruptions
Invoke-RestMethod -Uri "http://127.0.0.1:8001/disruptions" | ConvertTo-Json -Depth 5

# 3. Get Specific Disruption
Invoke-RestMethod -Uri "http://127.0.0.1:8001/disruptions/dsp_123" | ConvertTo-Json -Depth 5

# 4. Simulate Flight Disruption (Tests Kafka Producer)
$disruption = @{
    flight_number = "UA999"
    airport = "DEL"
    delay_minutes = 150
    reason = "SEVERE_WEATHER"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8001/simulate/flight-disruption" `
    -Method Post `
    -Body $disruption `
    -ContentType "application/json" | ConvertTo-Json -Depth 5

# 5. Search Amadeus Flight Offers (Tests Amadeus API)
Invoke-RestMethod -Uri "http://127.0.0.1:8001/amadeus/flight-offers?origin=SFO&destination=ORD&adults=1&max_results=2" | ConvertTo-Json -Depth 3

# 6. Get Flight Status from Amadeus
Invoke-RestMethod -Uri "http://127.0.0.1:8001/amadeus/flight-status/UA123" | ConvertTo-Json -Depth 3

# 7. Check if new disruption was created
Invoke-RestMethod -Uri "http://127.0.0.1:8001/disruptions?airport=DEL" | ConvertTo-Json -Depth 5
