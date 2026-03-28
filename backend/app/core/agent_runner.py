"""AgentRunner — executes a single specialist agent on an instruction.

Agentic loop (Phase 3):
  1. Load Agent + assigned skills from DB
  2. Build LLMTool list from enabled skills via SkillRegistry
  3. Call LLM with tools
  4. If response.tool_calls → execute each skill, append tool result messages, loop
  5. If no tool_calls or max_iterations reached → final response
  6. Persist all Messages to DB, publish events
"""

from __future__ import annotations

import json
import structlog
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core import event_bus
from app.core.context import AgentContext
from app.llm.base import LLMMessage, LLMTool, LLMToolCall
from app.llm.factory import get_provider

log = structlog.get_logger(__name__)


async def _build_tools(agent: object) -> list[LLMTool]:
    """Convert agent's enabled skills into LLMTool list."""
    from app.skills.registry import registry

    tools: list[LLMTool] = []
    for agent_skill in getattr(agent, "skills", []):
        if not agent_skill.enabled:
            continue
        skill_obj = getattr(agent_skill, "skill", None)
        if skill_obj is None:
            continue
        runner = registry.get(skill_obj.name)
        if runner is None:
            continue
        schema = skill_obj.input_schema or {}
        # Ensure JSON Schema has required 'type' field
        if "type" not in schema:
            schema = {"type": "object", "properties": schema}
        tools.append(LLMTool(
            name=skill_obj.name,
            description=skill_obj.description,
            input_schema=schema,
        ))
    return tools


class AgentRunner:
    def __init__(self, agent_id: str, task_id: str, instruction: str) -> None:
        self.agent_id = agent_id
        self.task_id = task_id
        self.instruction = instruction

    async def run(self) -> dict:
        from app.database import AsyncSessionLocal
        from app.models.agent import Agent
        from app.models.message import Message
        from app.skills.registry import registry

        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Agent)
                .options(
                    selectinload(Agent.llm_config),
                    selectinload(Agent.skills).selectinload(
                        __import__("app.models.agent", fromlist=["AgentSkill"]).AgentSkill.skill
                    ),
                )
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

            tools = await _build_tools(agent)

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
            messages_to_save: list[Message] = []
            final_content = ""
            total_tokens = 0

            # ── Agentic loop ──────────────────────────────────────────────
            for iteration in range(agent.max_iterations):
                try:
                    response = await llm.complete(
                        messages=ctx.messages,
                        system=ctx.system_prompt,
                        max_tokens=4096,
                        tools=tools if tools else None,
                    )
                except Exception as exc:
                    log.error(
                        "agent_runner.llm_error",
                        agent_id=self.agent_id,
                        iteration=iteration,
                        error=str(exc),
                    )
                    agent.status = "error"
                    await session.flush()
                    await event_bus.publish(
                        "agent.status_changed",
                        task_id=self.task_id,
                        agent_id=self.agent_id,
                        payload={"from": "busy", "to": "error"},
                    )
                    await session.commit()
                    raise

                total_tokens += response.input_tokens + response.output_tokens

                # No tool calls → final response
                if not response.tool_calls:
                    final_content = response.content
                    messages_to_save.append(
                        Message(
                            task_id=self.task_id,
                            from_agent_id=self.agent_id,
                            role="assistant",
                            content=response.content,
                            tokens_used=response.input_tokens + response.output_tokens,
                        )
                    )
                    break

                # Has tool calls → execute each and loop
                if response.content:
                    ctx.messages.append(
                        LLMMessage(role="assistant", content=response.content)
                    )

                for tool_call in response.tool_calls:
                    await event_bus.publish(
                        "agent.tool_called",
                        task_id=self.task_id,
                        agent_id=self.agent_id,
                        payload={
                            "tool_name": tool_call.name,
                            "args_preview": str(tool_call.input)[:80],
                        },
                    )

                    skill_runner = registry.get(tool_call.name)
                    if skill_runner:
                        skill_output = await skill_runner.run(tool_call.input)
                        tool_result = json.dumps(
                            {"success": skill_output.success, "result": skill_output.result}
                            if skill_output.success
                            else {"success": False, "error": skill_output.error}
                        )
                    else:
                        tool_result = json.dumps({"error": f"Unknown tool: {tool_call.name}"})

                    await event_bus.publish(
                        "agent.tool_result",
                        task_id=self.task_id,
                        agent_id=self.agent_id,
                        payload={"tool_name": tool_call.name, "result_preview": tool_result[:80]},
                    )

                    ctx.messages.append(
                        LLMMessage(
                            role="tool",
                            content=tool_result,
                            tool_call_id=tool_call.id,
                        )
                    )
                    messages_to_save.append(
                        Message(
                            task_id=self.task_id,
                            from_agent_id=self.agent_id,
                            role="tool",
                            content=f"[{tool_call.name}] {tool_result}",
                        )
                    )

                await event_bus.publish(
                    "agent.thinking",
                    task_id=self.task_id,
                    agent_id=self.agent_id,
                    payload={"prompt_preview": f"Processing tool results (iteration {iteration + 1})"},
                )

            else:
                # max_iterations reached
                final_content = f"[max_iterations={agent.max_iterations} reached] {final_content}"
                log.warning("agent_runner.max_iterations", agent_id=self.agent_id)

            # ── Persist and wrap up ───────────────────────────────────────
            for msg in messages_to_save:
                session.add(msg)

            agent.status = "idle"
            await session.flush()

            await event_bus.publish(
                "agent.message_sent",
                task_id=self.task_id,
                agent_id=self.agent_id,
                payload={"content_preview": final_content[:120], "tokens": total_tokens},
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
                tokens=total_tokens,
            )
            return {
                "agent_id": self.agent_id,
                "task_id": self.task_id,
                "content": final_content,
                "tokens_used": total_tokens,
            }
