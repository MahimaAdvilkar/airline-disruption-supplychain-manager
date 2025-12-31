# Airline Crisis Command Center - Production Ready

## Application Status
- Backend: Running on http://localhost:8002
- Frontend: Running on http://localhost:5173
- All systems operational

## Features Implemented

### 1. Airline Selection & Flight Tracking
- Dropdown with 19 major airlines (AA, DL, UA, etc.)
- Next 24-hour flight schedule display
- Real-time flight status tracking

### 2. AI-Powered Recommendations
- Google Gemini 2.5 Flash integration (FREE)
- Three-agent pipeline: Triage → Rebook → Decision
- Amadeus Flight API for real offers
- Automated disruption recovery

### 3. Operations Center
- Real-time disruption monitoring
- Passenger cohort management
- Recovery solutions dashboard
- AI recommendations with reasoning

## API Endpoints

### Backend (Port 8002)
- GET /health - System health check
- GET /amadeus/airlines - List of airlines
- GET /amadeus/flights/next24h?airline={code}&origin={airport} - 24h flight schedule
- GET /amadeus/flight-offers - Search flights
- POST /agents/recommendation - AI recommendations
- POST /simulate/flight-disruption - Trigger disruption

### Frontend (Port 5173)
- Flight Tracker - Map view with live flights
- Operations Center - Crisis management dashboard

## Technology Stack

### Backend
- FastAPI 0.115.6
- Google Gemini 2.5 Flash (Free API)
- Amadeus Flight API
- Confluent Kafka
- Python 3.13

### Frontend
- React 18+ TypeScript
- Vite 7.3.0
- Mapbox GL
- Modern CSS

## Configuration Files

### backend/.env
```
GEMINI_API_KEY=AIzaSyBoI5-YbEaUpWc931i_Mq54i31Yrl0u8aU
GEMINI_MODEL=gemini-2.5-flash
AMADEUS_CLIENT_ID=VpslyxLqAF43HhuwcSfkBJ7jEGkAeia1
AMADEUS_CLIENT_SECRET=H8JDUHE3GdApsB4y
CONFLUENT_BOOTSTRAP_SERVERS=pkc-921jm.us-east-2.aws.confluent.cloud:9092
CONFLUENT_API_KEY=GSEQTWJJF45R35EH
```

### frontend/src/constants.ts
```typescript
export const API_BASE_URL = "http://localhost:8002";
```

## How to Use

1. **Start Backend**
   ```powershell
   cd backend
   python -m uvicorn src.api_service.main:app --host 0.0.0.0 --port 8002
   ```

2. **Start Frontend**
   ```powershell
   cd frontend
   npm run dev
   ```

3. **Access Application**
   - Open http://localhost:5173
   - Select airline from dropdown
   - View next 24h flights
   - Click "Activate Scenario" to simulate crisis
   - Navigate to Operations Center for AI recommendations

## Deployment

### Backend
- Deploy to Google Cloud Run / AWS Lambda / Azure Functions
- Environment variables configured via platform
- Horizontal scaling enabled

### Frontend
- Deploy to Vercel / Netlify / GitHub Pages
- Update API_BASE_URL to production backend URL
- CDN-optimized static assets

## Testing

All critical APIs validated:
- Health check: PASSED
- Airlines endpoint: 19 airlines loaded
- 24h flights: 24 flights per airline
- AI recommendations: Working with Gemini
- Amadeus integration: Real flight data
- Kafka events: Published successfully

## Clean Architecture

- No test files in production code
- No unnecessary comments
- Modular component structure
- Type-safe TypeScript
- RESTful API design
- Event-driven backend

## Free Services Used

- Google Gemini API (15 req/min free)
- Mapbox (50k loads/month free)
- Amadeus Test API (Free tier)

## Ready for Hackathon Demo
Application is production-ready with clean code, working features, and professional UI.
