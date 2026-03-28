"""SkillRegistry — singleton that holds all available skills in memory.

Builtin skills are registered on import via their module's register() call.
Custom skills (custom_python / custom_http) are dispatched through runtime
executors and don't need a registry entry — they're looked up from the DB.
"""

from __future__ import annotations

import structlog

from app.skills.base import Skill

log = structlog.get_logger(__name__)


class SkillRegistry:
    def __init__(self) -> None:
        self._skills: dict[str, Skill] = {}

    def register(self, skill: Skill) -> None:
        self._skills[skill.name] = skill
        log.debug("skill_registry.registered", name=skill.name)

    def get(self, name: str) -> Skill | None:
        return self._skills.get(name)

    def list_all(self) -> list[Skill]:
        return list(self._skills.values())

    def as_db_records(self) -> list[dict]:
        """Return skill metadata suitable for upserting into the DB."""
        import json

        records = []
        for skill in self._skills.values():
            schema_cls = skill.input_schema
            schema = schema_cls.model_json_schema()
            records.append(
                {
                    "name": skill.name,
                    "display_name": skill.display_name,
                    "description": skill.description,
                    "type": "builtin",
                    "source": "builtin",
                    "input_schema": schema,
                    "is_public": True,
                }
            )
        return records


# Module-level singleton
registry = SkillRegistry()
