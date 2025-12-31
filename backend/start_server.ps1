# Start Backend Server
Write-Host "Starting Airline Disruption Backend Server..." -ForegroundColor Green

# Change to backend directory
Set-Location $PSScriptRoot

# Start uvicorn server
Write-Host "Server will run on http://127.0.0.1:8002" -ForegroundColor Cyan
python -m uvicorn src.api_service.main:app --port 8002 --reload
