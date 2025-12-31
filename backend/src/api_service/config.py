from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    
    environment: str = "development"
    api_port: int = 8000
    log_level: str = "INFO"
    
    confluent_bootstrap_servers: str = ""
    confluent_api_key: str = ""
    confluent_api_secret: str = ""
    
    amadeus_client_id: str = ""
    amadeus_client_secret: str = ""
    amadeus_api_base_url: str = "https://test.api.amadeus.com"


settings = Settings()
