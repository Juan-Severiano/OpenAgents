from __future__ import annotations

from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from app.skills.base import Skill, SkillInput, SkillOutput
from app.skills.registry import registry

if TYPE_CHECKING:
    from app.core.context import AgentContext


class DatetimeInput(SkillInput):
    timezone_name: str = "UTC"


class DatetimeInfoSkill(Skill):
    name = "datetime_info"
    display_name = "Date & Time"
    description = "Returns the current UTC date and time. Useful when the agent needs to know the current moment."
    input_schema = DatetimeInput

    async def run(self, input: dict[str, Any], context: AgentContext | None = None) -> SkillOutput:
        now = datetime.now(timezone.utc)
        return SkillOutput(
            success=True,
            result={
                "iso": now.isoformat(),
                "date": now.strftime("%Y-%m-%d"),
                "time": now.strftime("%H:%M:%S"),
                "day_of_week": now.strftime("%A"),
                "timestamp": int(now.timestamp()),
            },
        )


registry.register(DatetimeInfoSkill())
