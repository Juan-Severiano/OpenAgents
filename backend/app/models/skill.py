import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

SkillTypeEnum = Enum(
    "builtin", "custom_python", "custom_http", "mcp_tool", name="skill_type_enum"
)
SkillSourceEnum = Enum("builtin", "user_defined", "marketplace", "github", name="skill_source_enum")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(SkillTypeEnum, nullable=False)
    source: Mapped[str] = mapped_column(SkillSourceEnum, nullable=False, default="builtin")
    input_schema: Mapped[dict] = mapped_column(JSON, nullable=False)
    output_schema: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    implementation: Mapped[str | None] = mapped_column(Text, nullable=True)
    http_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
