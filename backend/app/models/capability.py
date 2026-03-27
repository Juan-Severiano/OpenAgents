import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

CapabilityTypeEnum = Enum(
    "memory", "output_format", "reasoning", "perception", "action",
    name="capability_type_enum"
)


class Capability(Base):
    __tablename__ = "capabilities"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(CapabilityTypeEnum, nullable=False)
    config_schema: Mapped[dict] = mapped_column(JSON, nullable=False)
    system_prompt_injection: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_builtin: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
