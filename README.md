# Airline Disruption Supply Chain Manager

A real-time, event-driven decision system for managing airline disruptions and passenger recovery operations. This system continuously ingests operational data, evaluates disruption impact, prioritizes affected passengers, and recommends recovery actions using streaming intelligence and AI-assisted reasoning.

## Overview

Airline disruptions caused by weather, airport congestion, crew constraints, or technical failures often trigger cascading operational and customer-experience issues. Traditional siloed systems result in slow recovery, inconsistent passenger handling, and high operational costs.

This project delivers an enterprise-ready solution that provides real-time decision-making capabilities with full auditability and explainability, moving beyond batch analytics to continuous operational intelligence.

## Core Functions

### Disruption Detection and Assessment
- Continuously monitors flight operations, bookings, and inventory events
- Detects delays, cancellations, diversions, and airport disruptions in real time
- Quantifies operational pressure and passenger impact as situations develop

### Intelligent Passenger Prioritization
- Groups affected passengers into priority cohorts based on:
  - Customer loyalty tier and status
  - Special assistance requirements
  - Connection risk and timing
  - Business rules and service commitments
- Enables targeted recovery strategies for different passenger segments

### AI-Assisted Recovery Recommendations
- Generates structured recovery plans using Google Vertex AI Gemini
- Recommends appropriate actions including:
  - Flight rebooking options
  - Hotel accommodations
  - Meal vouchers
  - Refund processing
  - Escalation workflows
  - Charter flight requests
- Validates all AI outputs against business guardrails and policy constraints

### Crisis Simulation
- Provides testing capabilities for disruption scenarios
- Simulates flight cancellations and operational events
- Validates system behavior under various conditions

### Real-Time Visualization
- Interactive flight map showing disruptions
- Passenger cohort analytics and breakdowns
- Live recovery solution tracking
- Operational metrics and KPIs

## Architecture

### Technology Stack

**Backend**
- FastAPI for REST API services
- Python 3.10+ for business logic
- Confluent Kafka for event streaming
- ksqlDB for stream processing
- Google Vertex AI Gemini for AI reasoning
- Amadeus API integration for flight data

**Frontend**
- React 19 with TypeScript
- Vite for build tooling
- Mapbox GL for flight visualization
- Modern CSS for responsive UI

### System Components

**Event Streams**
- `flight_ops.events.v1` - Real-time flight status updates
- `booking.events.v1` - Passenger booking and itinerary data
- `inventory.events.v1` - Live seat availability and capacity
- `disruption.state.v1` - Derived operational pressure metrics
- `passenger.cohorts.v1` - Prioritized passenger groupings
- `recovery.actions.v1` - Validated recovery recommendations
- `agent.audit.v1` - Complete decision audit trail

**Processing Pipeline**
1. Stream ingestion from operational data sources
2. Real-time enrichment and aggregation via ksqlDB
3. Business rule application and guardrail enforcement
4. AI-assisted decision generation with Vertex AI
5. Action validation and output emission
6. Full audit logging for compliance

## Setup Instructions

### Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn package manager
- Confluent Cloud account (for Kafka)
- Google Cloud account with Vertex AI enabled
- Amadeus API credentials (optional, for live data)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a Python virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
```bash
# Windows
.\venv\Scripts\Activate.ps1

# Linux/Mac
source venv/bin/activate
```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

5. Configure environment variables:
Create a `.env` file in the backend directory with the following:
```env
# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS=your-kafka-bootstrap-servers
KAFKA_API_KEY=your-api-key
KAFKA_API_SECRET=your-api-secret
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SECURITY_PROTOCOL=SASL_SSL

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=your-region
GEMINI_MODEL=gemini-1.5-pro

# Amadeus API (Optional)
AMADEUS_CLIENT_ID=your-client-id
AMADEUS_CLIENT_SECRET=your-client-secret

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
```

6. Start the backend server:
```bash
# Using PowerShell script
.\start_server.ps1

# Or directly with uvicorn
uvicorn src.api_service.main:app --reload --port 8000
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token
```

4. Start the development server:
```bash
npm run dev
```

5. Access the application at `http://localhost:5173`

### Production Build

**Backend**
```bash
cd backend
pip install -r requirements.txt
uvicorn src.api_service.main:app --host 0.0.0.0 --port 8000
```

**Frontend**
```bash
cd frontend
npm run build
npm run preview
```

## API Documentation

Once the backend server is running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

- `POST /recommendations` - Generate recovery recommendations for a disruption
- `POST /simulate-crisis` - Trigger crisis simulation scenarios
- `GET /health` - System health check
- `GET /flights` - Retrieve flight information
- `GET /airports` - Get airport data

## Testing

### Backend Testing
```bash
cd backend
pytest
```

### API Testing
Use the provided PowerShell scripts:
```bash
.\test_api.ps1
.\quick_test.ps1
```

Or refer to `TESTAPI-COMMANDS.md` for detailed API testing commands.

## Project Structure

```
airline-disruption-supplychain-manager/
├── backend/
│   ├── src/
│   │   ├── agents/           # AI agent orchestration
│   │   ├── api_service/      # FastAPI application
│   │   ├── common/           # Shared utilities and clients
│   │   ├── schemas/          # Data models and validation
│   │   └── tools/            # Integration tools
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   └── api.ts           # API client
│   └── package.json
├── shared/
│   ├── schemas/             # JSON schemas for events
│   └── types/               # Shared type definitions
└── docs/
    ├── architecture.md      # Detailed architecture documentation
    └── api-contract.md      # API contract specifications
```

## Key Features

### Real-Time Processing
- Event-driven architecture for sub-second response times
- Continuous stream processing with ksqlDB
- No batch delays in decision-making

### Enterprise Readability
- Full audit trail for compliance and analysis
- Deterministic guardrails for policy enforcement
- Explainable AI decisions with reasoning metadata
- Production-ready error handling and logging

### Scalability
- Stateless service design for horizontal scaling
- Kafka-based event streaming for high throughput
- Cloud-native deployment ready (Google Cloud Run)

### Extensibility
- Modular agent architecture
- Pluggable AI models
- Configurable business rules
- Schema-driven event contracts

## Documentation

- `docs/architecture.md` - Comprehensive system architecture
- `docs/api-contract.md` - API specifications
- `PRODUCTION_READY.md` - Production deployment guide
- `TESTING_SUMMARY.md` - Testing documentation
- `UI_FIXES_SUMMARY.md` - UI implementation details

## Contributing

This is a production-ready enterprise system. All contributions should maintain:
- Comprehensive error handling
- Full audit logging
- Schema validation
- Test coverage
- Documentation updates

## License

See LICENSE file for details.