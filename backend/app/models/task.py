import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

TaskStatusEnum = Enum("pending", "running", "completed", "failed", name="task_status_enum")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    orchestrator_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("agents.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(TaskStatusEnum, default="pending", nullable=False)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    task_metadata: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)

    orchestrator: Mapped["Agent"] = relationship("Agent")  # type: ignore[name-defined]
    messages: Mapped[list["Message"]] = relationship(  # type: ignore[name-defined]
        "Message", back_populates="task", cascade="all, delete-orphan"
    )


from app.models.agent import Agent  # noqa: E402, F401
from app.models.message import Message  # noqa: E402, F401
