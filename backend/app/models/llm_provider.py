import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

ProviderEnum = Enum("anthropic", "openai", "google", "ollama", name="provider_enum")


class LLMProviderConfig(Base):
    __tablename__ = "llm_provider_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(ProviderEnum, nullable=False)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    api_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    base_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    extra_params: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
