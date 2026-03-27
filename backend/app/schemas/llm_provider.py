from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class LLMProviderConfigCreate(BaseModel):
    name: str
    provider: str
    model: str
    api_key: str | None = None
    base_url: str | None = None
    extra_params: dict[str, Any] | None = None


class LLMProviderConfigUpdate(BaseModel):
    name: str | None = None
    provider: str | None = None
    model: str | None = None
    api_key: str | None = None
    base_url: str | None = None
    extra_params: dict[str, Any] | None = None


class LLMProviderConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    provider: str
    model: str
    api_key: str | None = None
    base_url: str | None = None
    extra_params: dict[str, Any] | None = None
    created_at: datetime
