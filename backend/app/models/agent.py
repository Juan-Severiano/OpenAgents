import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

AgentRoleEnum = Enum("orchestrator", "specialist", name="agent_role_enum")
AgentStatusEnum = Enum("idle", "busy", "error", "disabled", name="agent_status_enum")


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(AgentRoleEnum, nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    llm_config_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("llm_provider_configs.id"), nullable=False
    )
    max_iterations: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    memory_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    status: Mapped[str] = mapped_column(AgentStatusEnum, default="idle", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    skills: Mapped[list["AgentSkill"]] = relationship(
        "AgentSkill", back_populates="agent", cascade="all, delete-orphan"
    )
    capabilities: Mapped[list["AgentCapability"]] = relationship(
        "AgentCapability", back_populates="agent", cascade="all, delete-orphan"
    )
    mcp_servers: Mapped[list["AgentMCPServer"]] = relationship(
        "AgentMCPServer", back_populates="agent", cascade="all, delete-orphan"
    )
    llm_config: Mapped["LLMProviderConfig"] = relationship("LLMProviderConfig")  # type: ignore[name-defined]


class AgentSkill(Base):
    __tablename__ = "agent_skills"

    agent_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    skill_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("skills.id", ondelete="CASCADE"), primary_key=True
    )
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="skills")
    skill: Mapped["Skill"] = relationship("Skill")  # type: ignore[name-defined]


class AgentCapability(Base):
    __tablename__ = "agent_capabilities"

    agent_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    capability_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("capabilities.id", ondelete="CASCADE"), primary_key=True
    )
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="capabilities")
    capability: Mapped["Capability"] = relationship("Capability")  # type: ignore[name-defined]


class AgentMCPServer(Base):
    __tablename__ = "agent_mcp_servers"

    agent_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True
    )
    mcp_server_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mcp_servers.id", ondelete="CASCADE"), primary_key=True
    )
    allowed_tools: Mapped[list | None] = mapped_column(JSON, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    agent: Mapped["Agent"] = relationship("Agent", back_populates="mcp_servers")
    mcp_server: Mapped["MCPServer"] = relationship("MCPServer")  # type: ignore[name-defined]


# Avoid circular import — these are resolved at runtime
from app.models.llm_provider import LLMProviderConfig  # noqa: E402, F401
from app.models.skill import Skill  # noqa: E402, F401
from app.models.capability import Capability  # noqa: E402, F401
from app.models.mcp_server import MCPServer  # noqa: E402, F401
