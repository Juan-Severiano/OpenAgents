from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str
    from_agent_id: str | None = None
    to_agent_id: str | None = None
    role: str
    content: str
    tokens_used: int | None = None
    created_at: datetime
