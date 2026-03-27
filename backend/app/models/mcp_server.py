import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

MCPTransportEnum = Enum("stdio", "sse", name="mcp_transport_enum")
MCPStatusEnum = Enum(
    "disconnected", "connecting", "connected", "error", name="mcp_status_enum"
)


class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    transport: Mapped[str] = mapped_column(MCPTransportEnum, nullable=False)
    command: Mapped[str | None] = mapped_column(Text, nullable=True)
    args: Mapped[list | None] = mapped_column(JSON, nullable=True)
    env: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    headers: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(MCPStatusEnum, default="disconnected", nullable=False)
    discovered_tools: Mapped[list | None] = mapped_column(JSON, nullable=True)
    last_connected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )
