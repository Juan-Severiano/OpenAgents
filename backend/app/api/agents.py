from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

import structlog

from app.database import get_db
from app.models.agent import Agent, AgentCapability, AgentMCPServer, AgentSkill
from app.models.message import Message
from app.schemas.agent import (
    AgentCapabilityAssign,
    AgentCapabilityResponse,
    AgentCapabilityUpdate,
    AgentCreate,
    AgentMCPServerAssign,
    AgentMCPServerResponse,
    AgentMCPServerUpdate,
    AgentResponse,
    AgentSkillAssign,
    AgentSkillResponse,
    AgentSkillUpdate,
    AgentTestRequest,
    AgentUpdate,
)
from app.schemas.message import MessageResponse

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


async def _get_agent_or_404(agent_id: str, db: AsyncSession) -> Agent:
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return agent


@router.get("", response_model=list[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_db)) -> list[Agent]:
    result = await db.execute(select(Agent))
    return list(result.scalars().all())


@router.post("", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
async def create_agent(body: AgentCreate, db: AsyncSession = Depends(get_db)) -> Agent:
    agent = Agent(**body.model_dump())
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    log.info("agent.created", id=agent.id, name=agent.name)
    return agent


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str, db: AsyncSession = Depends(get_db)) -> Agent:
    return await _get_agent_or_404(agent_id, db)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str, body: AgentUpdate, db: AsyncSession = Depends(get_db)
) -> Agent:
    agent = await _get_agent_or_404(agent_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(agent, field, value)
    await db.flush()
    await db.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: str, db: AsyncSession = Depends(get_db)) -> None:
    agent = await _get_agent_or_404(agent_id, db)
    await db.delete(agent)


@router.get("/{agent_id}/messages", response_model=list[MessageResponse])
async def get_agent_messages(
    agent_id: str, db: AsyncSession = Depends(get_db)
) -> list[Message]:
    await _get_agent_or_404(agent_id, db)
    result = await db.execute(
        select(Message).where(
            (Message.from_agent_id == agent_id) | (Message.to_agent_id == agent_id)
        ).order_by(Message.created_at)
    )
    return list(result.scalars().all())


@router.post("/{agent_id}/test")
async def test_agent(
    agent_id: str, body: AgentTestRequest, db: AsyncSession = Depends(get_db)
) -> dict:
    agent = await db.get(
        Agent, agent_id, options=[selectinload(Agent.llm_config)]
    )
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    from app.llm.factory import get_provider
    llm = get_provider(agent.llm_config)
    from app.llm.base import LLMMessage
    try:
        response = await llm.complete(
            messages=[LLMMessage(role="user", content=body.message)],
            system=body.system or agent.system_prompt,
        )
        return {"content": response.content, "model": response.model, "tokens": response.output_tokens}
    except Exception as exc:
        log.error("agent.test.error", agent_id=agent_id, error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))


# --- Skills ---

@router.get("/{agent_id}/skills", response_model=list[AgentSkillResponse])
async def list_agent_skills(
    agent_id: str, db: AsyncSession = Depends(get_db)
) -> list[AgentSkill]:
    await _get_agent_or_404(agent_id, db)
    result = await db.execute(select(AgentSkill).where(AgentSkill.agent_id == agent_id))
    return list(result.scalars().all())


@router.post("/{agent_id}/skills", response_model=AgentSkillResponse, status_code=201)
async def assign_skill(
    agent_id: str, body: AgentSkillAssign, db: AsyncSession = Depends(get_db)
) -> AgentSkill:
    await _get_agent_or_404(agent_id, db)
    existing = await db.get(AgentSkill, (agent_id, body.skill_id))
    if existing:
        raise HTTPException(status_code=409, detail="Skill already assigned")
    agent_skill = AgentSkill(agent_id=agent_id, **body.model_dump())
    db.add(agent_skill)
    await db.flush()
    await db.refresh(agent_skill)
    return agent_skill


@router.delete("/{agent_id}/skills/{skill_id}", status_code=204)
async def remove_skill(
    agent_id: str, skill_id: str, db: AsyncSession = Depends(get_db)
) -> None:
    agent_skill = await db.get(AgentSkill, (agent_id, skill_id))
    if not agent_skill:
        raise HTTPException(status_code=404, detail="Skill not assigned to agent")
    await db.delete(agent_skill)


@router.patch("/{agent_id}/skills/{skill_id}", response_model=AgentSkillResponse)
async def update_agent_skill(
    agent_id: str, skill_id: str, body: AgentSkillUpdate, db: AsyncSession = Depends(get_db)
) -> AgentSkill:
    agent_skill = await db.get(AgentSkill, (agent_id, skill_id))
    if not agent_skill:
        raise HTTPException(status_code=404, detail="Skill not assigned to agent")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(agent_skill, field, value)
    await db.flush()
    await db.refresh(agent_skill)
    return agent_skill


# --- Capabilities ---

@router.get("/{agent_id}/capabilities", response_model=list[AgentCapabilityResponse])
async def list_agent_capabilities(
    agent_id: str, db: AsyncSession = Depends(get_db)
) -> list[AgentCapability]:
    await _get_agent_or_404(agent_id, db)
    result = await db.execute(
        select(AgentCapability).where(AgentCapability.agent_id == agent_id)
    )
    return list(result.scalars().all())


@router.post("/{agent_id}/capabilities", response_model=AgentCapabilityResponse, status_code=201)
async def assign_capability(
    agent_id: str, body: AgentCapabilityAssign, db: AsyncSession = Depends(get_db)
) -> AgentCapability:
    await _get_agent_or_404(agent_id, db)
    existing = await db.get(AgentCapability, (agent_id, body.capability_id))
    if existing:
        raise HTTPException(status_code=409, detail="Capability already assigned")
    cap = AgentCapability(agent_id=agent_id, **body.model_dump())
    db.add(cap)
    await db.flush()
    await db.refresh(cap)
    return cap


@router.delete("/{agent_id}/capabilities/{capability_id}", status_code=204)
async def remove_capability(
    agent_id: str, capability_id: str, db: AsyncSession = Depends(get_db)
) -> None:
    cap = await db.get(AgentCapability, (agent_id, capability_id))
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not assigned to agent")
    await db.delete(cap)


@router.patch("/{agent_id}/capabilities/{capability_id}", response_model=AgentCapabilityResponse)
async def update_agent_capability(
    agent_id: str,
    capability_id: str,
    body: AgentCapabilityUpdate,
    db: AsyncSession = Depends(get_db),
) -> AgentCapability:
    cap = await db.get(AgentCapability, (agent_id, capability_id))
    if not cap:
        raise HTTPException(status_code=404, detail="Capability not assigned to agent")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(cap, field, value)
    await db.flush()
    await db.refresh(cap)
    return cap


# --- MCP Servers ---

@router.get("/{agent_id}/mcp-servers", response_model=list[AgentMCPServerResponse])
async def list_agent_mcp_servers(
    agent_id: str, db: AsyncSession = Depends(get_db)
) -> list[AgentMCPServer]:
    await _get_agent_or_404(agent_id, db)
    result = await db.execute(
        select(AgentMCPServer).where(AgentMCPServer.agent_id == agent_id)
    )
    return list(result.scalars().all())


@router.post("/{agent_id}/mcp-servers", response_model=AgentMCPServerResponse, status_code=201)
async def assign_mcp_server(
    agent_id: str, body: AgentMCPServerAssign, db: AsyncSession = Depends(get_db)
) -> AgentMCPServer:
    await _get_agent_or_404(agent_id, db)
    existing = await db.get(AgentMCPServer, (agent_id, body.mcp_server_id))
    if existing:
        raise HTTPException(status_code=409, detail="MCP server already assigned")
    server = AgentMCPServer(agent_id=agent_id, **body.model_dump())
    db.add(server)
    await db.flush()
    await db.refresh(server)
    return server


@router.delete("/{agent_id}/mcp-servers/{mcp_id}", status_code=204)
async def remove_mcp_server(
    agent_id: str, mcp_id: str, db: AsyncSession = Depends(get_db)
) -> None:
    server = await db.get(AgentMCPServer, (agent_id, mcp_id))
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not assigned to agent")
    await db.delete(server)


@router.patch("/{agent_id}/mcp-servers/{mcp_id}", response_model=AgentMCPServerResponse)
async def update_agent_mcp_server(
    agent_id: str,
    mcp_id: str,
    body: AgentMCPServerUpdate,
    db: AsyncSession = Depends(get_db),
) -> AgentMCPServer:
    server = await db.get(AgentMCPServer, (agent_id, mcp_id))
    if not server:
        raise HTTPException(status_code=404, detail="MCP server not assigned to agent")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(server, field, value)
    await db.flush()
    await db.refresh(server)
    return server
