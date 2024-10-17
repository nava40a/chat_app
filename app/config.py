from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Настройки для подключения к postgres."""

    POSTGRES_NAME: str
    POSTGRES_USER: str
    POSTGRES_PASS: str
    POSTGRES_HOST: str
    POSTGRES_PORT: str

    class Config:
        env_file = '.env'

    @property
    def database_url(self) -> str:
        """Получение URL для подключения к базе данных."""

        return (
            f'postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASS}'
            f'@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_NAME}'
        )


settings = Settings()
