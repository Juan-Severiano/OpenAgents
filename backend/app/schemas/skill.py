from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class SkillCreate(BaseModel):
    name: str
    display_name: str
    description: str
    type: str
    source: str = "user_defined"
    input_schema: dict[str, Any]
    output_schema: dict[str, Any] | None = None
    implementation: str | None = None
    http_config: dict[str, Any] | None = None
    is_public: bool = False


class SkillUpdate(BaseModel):
    display_name: str | None = None
    description: str | None = None
    input_schema: dict[str, Any] | None = None
    output_schema: dict[str, Any] | None = None
    implementation: str | None = None
    http_config: dict[str, Any] | None = None
    is_public: bool | None = None


class SkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    display_name: str
    description: str
    type: str
    source: str
    input_schema: dict[str, Any]
    output_schema: dict[str, Any] | None = None
    implementation: str | None = None
    http_config: dict[str, Any] | None = None
    is_public: bool
    created_at: datetime
    updated_at: datetime


class SkillTestRequest(BaseModel):
    input: dict[str, Any]
