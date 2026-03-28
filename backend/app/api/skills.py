from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import structlog

from app.database import get_db
from app.models.skill import Skill
from app.schemas.skill import SkillCreate, SkillResponse, SkillTestRequest, SkillUpdate

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/skills", tags=["skills"])


@router.get("", response_model=list[SkillResponse])
async def list_skills(db: AsyncSession = Depends(get_db)) -> list[Skill]:
    result = await db.execute(select(Skill))
    return list(result.scalars().all())


@router.post("", response_model=SkillResponse, status_code=status.HTTP_201_CREATED)
async def create_skill(body: SkillCreate, db: AsyncSession = Depends(get_db)) -> Skill:
    if body.type == "builtin":
        raise HTTPException(status_code=400, detail="Cannot create builtin skills via API")
    skill = Skill(**body.model_dump())
    db.add(skill)
    await db.flush()
    await db.refresh(skill)
    log.info("skill.created", id=skill.id, name=skill.name)
    return skill


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(skill_id: str, db: AsyncSession = Depends(get_db)) -> Skill:
    skill = await db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill {skill_id} not found")
    return skill


@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: str, body: SkillUpdate, db: AsyncSession = Depends(get_db)
) -> Skill:
    skill = await db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill {skill_id} not found")
    if skill.type == "builtin":
        raise HTTPException(status_code=400, detail="Cannot modify builtin skills")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(skill, field, value)
    await db.flush()
    await db.refresh(skill)
    return skill


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: str, db: AsyncSession = Depends(get_db)) -> None:
    skill = await db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill {skill_id} not found")
    if skill.type == "builtin":
        raise HTTPException(status_code=400, detail="Cannot delete builtin skills")
    await db.delete(skill)


@router.post("/{skill_id}/test")
async def test_skill(
    skill_id: str, body: SkillTestRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    import time

    skill = await db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill {skill_id} not found")

    start = time.perf_counter()

    if skill.type == "builtin":
        from app.skills.registry import registry
        runner = registry.get(skill.name)
        if not runner:
            raise HTTPException(status_code=500, detail=f"Builtin skill '{skill.name}' not found in registry")
        result = await runner.run(body.input)

    elif skill.type == "custom_python":
        if not skill.implementation:
            raise HTTPException(status_code=400, detail="Skill has no implementation code")
        from app.skills.registry import registry
        runner = registry.get("code_executor")
        if not runner:
            raise HTTPException(status_code=500, detail="code_executor not available")
        result = await runner.run({"code": skill.implementation, "timeout": 15})

    elif skill.type == "custom_http":
        if not skill.http_config:
            raise HTTPException(status_code=400, detail="Skill has no http_config")
        from app.skills.registry import registry
        runner = registry.get("http_request")
        if not runner:
            raise HTTPException(status_code=500, detail="http_request not available")
        cfg = dict(skill.http_config)
        cfg.update({k: v for k, v in body.input.items() if v is not None})
        result = await runner.run(cfg)

    else:
        raise HTTPException(status_code=400, detail=f"Cannot test skill of type '{skill.type}' directly")

    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    return {
        "skill_id": skill_id,
        "name": skill.name,
        "success": result.success,
        "result": result.result,
        "error": result.error,
        "metadata": result.metadata,
        "execution_time_ms": elapsed_ms,
    }
