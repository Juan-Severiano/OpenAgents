"""Skill Loader — imports all builtin skills and seeds them to the DB.

Call seed_builtin_skills(db) during application startup so that builtin skills
appear in GET /skills and can be assigned to agents.
"""

from __future__ import annotations

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger(__name__)


def _import_builtins() -> None:
    """Trigger the self-registration of all builtin skills."""
    import app.skills.builtin.calculator  # noqa: F401
    import app.skills.builtin.code_executor  # noqa: F401
    import app.skills.builtin.datetime_info  # noqa: F401
    import app.skills.builtin.file_reader  # noqa: F401
    import app.skills.builtin.http_request  # noqa: F401
    import app.skills.builtin.web_search  # noqa: F401


async def seed_builtin_skills(db: AsyncSession) -> None:
    """Upsert builtin skills into the DB. Safe to call repeatedly."""
    from sqlalchemy import select

    from app.models.skill import Skill
    from app.skills.registry import registry

    _import_builtins()

    records = registry.as_db_records()
    seeded = 0
    for rec in records:
        existing = await db.execute(select(Skill).where(Skill.name == rec["name"]))
        if existing.scalar_one_or_none() is None:
            skill = Skill(**rec)
            db.add(skill)
            seeded += 1

    if seeded:
        await db.flush()
        log.info("skills.seeded", count=seeded)
    else:
        log.debug("skills.seed.already_up_to_date")
