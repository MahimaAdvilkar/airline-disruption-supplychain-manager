Write-Host "Testing Health Endpoint..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get | ConvertTo-Json

Write-Host "`nTesting List Disruptions..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://127.0.0.1:8000/disruptions" -Method Get | ConvertTo-Json -Depth 5

Write-Host "`nTesting Simulate Flight Disruption..." -ForegroundColor Cyan
$body = @{
    flight_number = "UA999"
    airport = "DEL"
    delay_minutes = 150
    reason = "SEVERE_WEATHER"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/simulate/flight-disruption" -Method Post -Body $body -ContentType "application/json" | ConvertTo-Json -Depth 5

Write-Host "`nTesting Amadeus Flight Offers..." -ForegroundColor Cyan
Invoke-RestMethod -Uri "http://127.0.0.1:8000/amadeus/flight-offers?origin=SFO&destination=ORD&adults=1&max_results=2" -Method Get | ConvertTo-Json -Depth 3
