from fastapi import FastAPI
from .routes import router
from . import simulator


app = FastAPI(title="Airline Disruption API Service")

app.include_router(router)
app.include_router(simulator.router)



@app.get("/health")
def health():
    return {"status": "ok", "service": "api-service"}
