import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

MessageRoleEnum = Enum("user", "assistant", "system", "tool", name="message_role_enum")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    from_agent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    to_agent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    role: Mapped[str] = mapped_column(MessageRoleEnum, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tokens_used: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    task: Mapped["Task"] = relationship("Task", back_populates="messages")  # type: ignore[name-defined]


from app.models.task import Task  # noqa: E402, F401
