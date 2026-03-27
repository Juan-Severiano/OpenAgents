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
    skill = await db.get(Skill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill {skill_id} not found")
    # Placeholder — full execution engine in Phase 3
    return {
        "skill_id": skill_id,
        "name": skill.name,
        "input": body.input,
        "result": "Skill test execution not yet implemented (Phase 3)",
    }
