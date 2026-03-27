from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AgentSkillResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agent_id: str
    skill_id: str
    config: dict[str, Any] | None = None
    enabled: bool
    priority: int


class AgentCapabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agent_id: str
    capability_id: str
    config: dict[str, Any] | None = None
    enabled: bool


class AgentMCPServerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    agent_id: str
    mcp_server_id: str
    allowed_tools: list[str] | None = None
    enabled: bool


class AgentCreate(BaseModel):
    name: str
    description: str | None = None
    role: str
    system_prompt: str
    llm_config_id: str
    max_iterations: int = 10
    memory_enabled: bool = True


class AgentUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    role: str | None = None
    system_prompt: str | None = None
    llm_config_id: str | None = None
    max_iterations: int | None = None
    memory_enabled: bool | None = None
    status: str | None = None


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    role: str
    system_prompt: str
    llm_config_id: str
    max_iterations: int
    memory_enabled: bool
    status: str
    created_at: datetime
    updated_at: datetime


class AgentSkillAssign(BaseModel):
    skill_id: str
    config: dict[str, Any] | None = None
    enabled: bool = True
    priority: int = 0


class AgentSkillUpdate(BaseModel):
    config: dict[str, Any] | None = None
    enabled: bool | None = None
    priority: int | None = None


class AgentCapabilityAssign(BaseModel):
    capability_id: str
    config: dict[str, Any] | None = None
    enabled: bool = True


class AgentCapabilityUpdate(BaseModel):
    config: dict[str, Any] | None = None
    enabled: bool | None = None


class AgentMCPServerAssign(BaseModel):
    mcp_server_id: str
    allowed_tools: list[str] | None = None
    enabled: bool = True


class AgentMCPServerUpdate(BaseModel):
    allowed_tools: list[str] | None = None
    enabled: bool | None = None


class AgentTestRequest(BaseModel):
    message: str
    system: str | None = None
