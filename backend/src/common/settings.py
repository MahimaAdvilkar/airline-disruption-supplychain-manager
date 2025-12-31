from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="backend/.env",  # loads your local env
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Service
    ENVIRONMENT: str = "development"
    API_PORT: int = 8000
    LOG_LEVEL: str = "INFO"

    # Confluent Kafka
    CONFLUENT_BOOTSTRAP: str | None = None
    CONFLUENT_API_KEY: str | None = None
    CONFLUENT_API_SECRET: str | None = None
    CONFLUENT_SASL_MECHANISM: str = "PLAIN"
    CONFLUENT_SECURITY_PROTOCOL: str = "SASL_SSL"
    CONSUMER_GROUP: str = "amadeus-enricher-v1"

    # KSQLDB
    KSQLDB_ENDPOINT: str | None = None
    KSQLDB_API_KEY: str | None = None
    KSQLDB_API_SECRET: str | None = None

    # Amadeus
    AMADEUS_API_KEY: str | None = None
    AMADEUS_API_SECRET: str | None = None
    AMADEUS_HOST: str = "https://test.api.amadeus.com"

    # Vertex (later)
    VERTEX_AI_PROJECT_ID: str | None = None
    VERTEX_AI_LOCATION: str | None = None
    VERTEX_AI_MODEL: str | None = None

    # Topics
    TOPIC_FLIGHT_OPS: str = "flight_ops.events.v1"
    TOPIC_DISRUPTION_STATE: str = "disruption.state.v1"
    TOPIC_PASSENGER_COHORTS: str = "passenger.cohorts.v1"
    TOPIC_RECOVERY_ACTIONS: str = "recovery.actions.v1"
    TOPIC_AGENT_AUDIT: str = "agent.audit.v1"
    TOPIC_AMADEUS_OFFERS: str = "amadeus.flight_offers.v1"

    CACHE_TTL_SECONDS: int = 300

settings = Settings()
