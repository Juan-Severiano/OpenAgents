from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class TaskCreate(BaseModel):
    title: str
    description: str
    orchestrator_id: str
    metadata: dict[str, Any] | None = None


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str
    orchestrator_id: str
    status: str
    result: str | None = None
    error: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    task_metadata: dict[str, Any] | None = None
