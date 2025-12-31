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
