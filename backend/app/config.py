from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://immersyte:immersyte@postgres:5432/immersyte"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    public_quiz_base_url: str = "https://quiz.immersyte.com"
    cors_origins: str = "http://localhost:5173"

    super_admin_email: str = "florian@immersyte.com"
    super_admin_password: str = "ChangeMe123!"
    super_admin_name: str = "Florian"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
