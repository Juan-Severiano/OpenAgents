from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class MCPServerCreate(BaseModel):
    name: str
    display_name: str
    description: str = ""
    transport: str
    command: str | None = None
    args: list[str] | None = None
    env: dict[str, str] | None = None
    url: str | None = None
    headers: dict[str, str] | None = None


class MCPServerUpdate(BaseModel):
    name: str | None = None
    display_name: str | None = None
    description: str | None = None
    command: str | None = None
    args: list[str] | None = None
    env: dict[str, str] | None = None
    url: str | None = None
    headers: dict[str, str] | None = None


class MCPServerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    display_name: str
    description: str
    transport: str
    command: str | None = None
    args: list | None = None
    env: dict[str, Any] | None = None
    url: str | None = None
    headers: dict[str, Any] | None = None
    status: str
    discovered_tools: list | None = None
    last_connected_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
