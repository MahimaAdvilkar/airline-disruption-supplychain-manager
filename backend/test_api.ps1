
Write-Host "===== Testing Airline Disruption API =====" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://127.0.0.1:8000"

Write-Host "1. Health Check" -ForegroundColor Yellow
curl -s "$baseUrl/health" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "2. List All Disruptions" -ForegroundColor Yellow
curl -s "$baseUrl/disruptions" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "3. Get Specific Disruption Detail (dsp_123)" -ForegroundColor Yellow
curl -s "$baseUrl/disruptions/dsp_123" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "4. Get Passenger Cohorts (dsp_123)" -ForegroundColor Yellow
curl -s "$baseUrl/disruptions/dsp_123/cohorts" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "5. Get Recovery Actions (dsp_123)" -ForegroundColor Yellow
curl -s "$baseUrl/disruptions/dsp_123/actions" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "6. Get Audit Trail (dsp_123)" -ForegroundColor Yellow
curl -s "$baseUrl/disruptions/dsp_123/audit" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "7. Simulate Flight Disruption (POST)" -ForegroundColor Yellow
$body = @{
    flight_number = "UA999"
    airport = "DEL"
    delay_minutes = 150
    reason = "SEVERE_WEATHER"
    origin_airport = "DEL"
    destination_airport = "SFO"
} | ConvertTo-Json

curl -s -X POST "$baseUrl/simulate/flight-disruption" `
    -H "Content-Type: application/json" `
    -d $body | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "8. Check New Disruption Was Created" -ForegroundColor Yellow
curl -s "$baseUrl/disruptions?airport=DEL" | ConvertFrom-Json | ConvertTo-Json -Depth 10
Write-Host ""

Write-Host "9. Search Amadeus Flight Offers (SFO -> ORD)" -ForegroundColor Yellow
curl -s "$baseUrl/amadeus/flight-offers?origin=SFO&destination=ORD&adults=1&max_results=3" | ConvertFrom-Json | ConvertTo-Json -Depth 5
Write-Host ""

Write-Host "===== All Tests Complete =====" -ForegroundColor Green
