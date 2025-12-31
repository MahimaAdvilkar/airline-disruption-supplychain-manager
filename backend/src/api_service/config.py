from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="backend/.env", env_file_encoding="utf-8", extra="ignore")
    
    environment: str = Field(default="development", validation_alias="ENVIRONMENT")
    api_port: int = Field(default=8000, validation_alias="API_PORT")
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")
    
    confluent_bootstrap_servers: str = Field(
        default="",
        validation_alias=AliasChoices("CONFLUENT_BOOTSTRAP_SERVERS", "CONFLUENT_BOOTSTRAP"),
    )
    confluent_api_key: str = Field(default="", validation_alias="CONFLUENT_API_KEY")
    confluent_api_secret: str = Field(default="", validation_alias="CONFLUENT_API_SECRET")
    
    amadeus_client_id: str = Field(
        default="",
        validation_alias=AliasChoices("AMADEUS_CLIENT_ID", "AMADEUS_API_KEY"),
    )
    amadeus_client_secret: str = Field(
        default="",
        validation_alias=AliasChoices("AMADEUS_CLIENT_SECRET", "AMADEUS_API_SECRET"),
    )
    amadeus_api_base_url: str = Field(
        default="https://test.api.amadeus.com",
        validation_alias=AliasChoices("AMADEUS_API_BASE_URL", "AMADEUS_HOST"),
    )


settings = Settings()
