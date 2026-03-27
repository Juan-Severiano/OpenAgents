"""AgentRunner — executes a single specialist agent on an instruction.

Flow:
  1. Load Agent + LLMProviderConfig from DB
  2. Build AgentContext (system_prompt + instruction as user message)
  3. Update agent status → busy, publish agent.status_changed + agent.thinking
  4. Call LLMProvider.complete()
  5. Save Message to DB
  6. Update agent status → idle (or error on failure)
  7. Publish agent.message_sent + agent.status_changed
"""

from __future__ import annotations

import structlog
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core import event_bus
from app.core.context import AgentContext
from app.llm.base import LLMMessage
from app.llm.factory import get_provider

log = structlog.get_logger(__name__)


class AgentRunner:
    def __init__(self, agent_id: str, task_id: str, instruction: str) -> None:
        self.agent_id = agent_id
        self.task_id = task_id
        self.instruction = instruction

    async def run(self) -> dict:
        from app.database import AsyncSessionLocal
        from app.models.agent import Agent
        from app.models.message import Message

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Agent)
                .options(selectinload(Agent.llm_config))
                .where(Agent.id == self.agent_id)
            )
            agent = result.scalar_one_or_none()
            if not agent:
                log.error("agent_runner.not_found", agent_id=self.agent_id)
                return {"error": f"Agent {self.agent_id} not found"}

            if not agent.llm_config:
                log.error("agent_runner.no_llm_config", agent_id=self.agent_id)
                return {"error": "Agent has no LLM provider configured"}

            ctx = AgentContext(
                task_id=self.task_id,
                agent_id=self.agent_id,
                agent_name=agent.name,
                system_prompt=agent.system_prompt,
                messages=[LLMMessage(role="user", content=self.instruction)],
            )

            # Mark agent as busy
            agent.status = "busy"
            await session.flush()
            await event_bus.publish(
                "agent.status_changed",
                task_id=self.task_id,
                agent_id=self.agent_id,
                payload={"from": "idle", "to": "busy", "agent_name": agent.name},
            )
            await event_bus.publish(
                "agent.thinking",
                task_id=self.task_id,
                agent_id=self.agent_id,
                payload={"prompt_preview": self.instruction[:120]},
            )

            llm = get_provider(agent.llm_config)
            try:
                response = await llm.complete(
                    messages=ctx.messages,
                    system=ctx.system_prompt,
                    max_tokens=4096,
                )
            except Exception as exc:
                log.error(
                    "agent_runner.llm_error",
                    agent_id=self.agent_id,
                    task_id=self.task_id,
                    error=str(exc),
                )
                agent.status = "error"
                await session.flush()
                await event_bus.publish(
                    "agent.status_changed",
                    task_id=self.task_id,
                    agent_id=self.agent_id,
                    payload={"from": "busy", "to": "error", "agent_name": agent.name},
                )
                await session.commit()
                raise

            # Persist the assistant message
            msg = Message(
                task_id=self.task_id,
                from_agent_id=self.agent_id,
                role="assistant",
                content=response.content,
                tokens_used=response.input_tokens + response.output_tokens,
            )
            session.add(msg)

            # Mark agent as idle again
            agent.status = "idle"
            await session.flush()

            await event_bus.publish(
                "agent.message_sent",
                task_id=self.task_id,
                agent_id=self.agent_id,
                payload={
                    "from_id": self.agent_id,
                    "content_preview": response.content[:120],
                    "tokens": response.input_tokens + response.output_tokens,
                },
            )
            await event_bus.publish(
                "agent.status_changed",
                task_id=self.task_id,
                agent_id=self.agent_id,
                payload={"from": "busy", "to": "idle", "agent_name": agent.name},
            )

            await session.commit()
            log.info(
                "agent_runner.completed",
                agent_id=self.agent_id,
                task_id=self.task_id,
                tokens=response.input_tokens + response.output_tokens,
            )
            return {
                "agent_id": self.agent_id,
                "task_id": self.task_id,
                "content": response.content,
                "tokens_used": response.input_tokens + response.output_tokens,
            }
