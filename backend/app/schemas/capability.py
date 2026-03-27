from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class CapabilityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    display_name: str
    description: str
    type: str
    config_schema: dict[str, Any]
    system_prompt_injection: str | None = None
    is_builtin: bool
    created_at: datetime
