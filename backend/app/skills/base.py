"""Skills Engine — abstract base classes.

Every skill (builtin or custom) inherits from Skill and implements run().
Skills are invoked explicitly by the LLM via tool calls — they never run
automatically (that's the Capabilities' job).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.core.context import AgentContext


class SkillInput(BaseModel):
    """Base for skill input schemas. Each skill defines its own subclass."""


class SkillOutput(BaseModel):
    success: bool
    result: str | dict | list | None = None
    error: str | None = None
    metadata: dict[str, Any] = {}


class Skill(ABC):
    """Contract every skill must satisfy."""

    name: str           # machine name, matches Skill.name in DB
    display_name: str   # human-readable label
    description: str    # shown in UI and injected into the agent's tool list
    input_schema: type[SkillInput]

    @abstractmethod
    async def run(self, input: dict[str, Any], context: AgentContext | None = None) -> SkillOutput:
        """Execute the skill.

        Always async. Never raises — return SkillOutput(success=False, error=...) on failure.
        """
