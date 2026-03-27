from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.capability import Capability
from app.schemas.capability import CapabilityResponse

router = APIRouter(prefix="/capabilities", tags=["capabilities"])


@router.get("", response_model=list[CapabilityResponse])
async def list_capabilities(db: AsyncSession = Depends(get_db)) -> list[Capability]:
    result = await db.execute(select(Capability))
    return list(result.scalars().all())


@router.get("/{capability_id}", response_model=CapabilityResponse)
async def get_capability(capability_id: str, db: AsyncSession = Depends(get_db)) -> Capability:
    cap = await db.get(Capability, capability_id)
    if not cap:
        raise HTTPException(status_code=404, detail=f"Capability {capability_id} not found")
    return cap
