"""OrchestratorAgent — decomposes a task and delegates to specialist agents.

Execution flow (§10 of SPEC):
  1. Load Task + orchestrator Agent from DB
  2. Load all available specialist agents
  3. Call LLM: decompose task into subtasks JSON
  4. For each subtask: find best matching specialist, run AgentRunner
  5. If multiple subtasks: call LLM again for final synthesis
  6. Persist Task.result and publish task.completed
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core import event_bus
from app.core.agent_runner import AgentRunner
from app.llm.base import LLMMessage
from app.llm.factory import get_provider

log = structlog.get_logger(__name__)

_DECOMPOSE_SYSTEM = """\
You are an orchestrator agent. Your job is to decompose a user task into subtasks and assign each to the most appropriate specialist agent.

Respond with ONLY a valid JSON object — no markdown fences, no extra text:
{{
  "subtasks": [
    {{
      "agent_name": "exact name of the specialist agent from the list",
      "instruction": "clear, detailed instruction for the agent",
      "context": "relevant background context for this subtask"
    }}
  ]
}}

Available specialist agents:
{agents_list}

Rules:
- Only use agents from the list above (exact names)
- Each subtask must be self-contained and actionable
- If only one agent is available, use it for all subtasks
- If the task is simple, a single subtask is fine
"""


def _extract_json(text: str) -> dict:
    """Extract JSON from LLM output, handling markdown code fences."""
    text = text.strip()
    try:
        return json.loads(text)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        pass
    # Strip ```json ... ``` fences
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        return json.loads(match.group(1))  # type: ignore[no-any-return]
    # Find first complete JSON object
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))  # type: ignore[no-any-return]
    raise ValueError(f"No valid JSON in LLM output: {text[:300]!r}")


class OrchestratorAgent:
    def __init__(self, task_id: str) -> None:
        self.task_id = task_id

    async def run(self) -> dict:
        from app.database import AsyncSessionLocal
        from app.models.agent import Agent
        from app.models.message import Message
        from app.models.task import Task

        async with AsyncSessionLocal() as session:
            # ── Load task ──────────────────────────────────────────────────
            task = await session.get(Task, self.task_id)
            if not task:
                return {"error": f"Task {self.task_id} not found"}

            # ── Load orchestrator with LLM config ──────────────────────────
            result = await session.execute(
                select(Agent)
                .options(selectinload(Agent.llm_config))
                .where(Agent.id == task.orchestrator_id)
            )
            orchestrator = result.scalar_one_or_none()
            if not orchestrator:
                task.status = "failed"
                task.error = "Orchestrator agent not found"
                await session.commit()
                return {"error": task.error}
            if not orchestrator.llm_config:
                task.status = "failed"
                task.error = "Orchestrator has no LLM provider configured"
                await session.commit()
                return {"error": task.error}

            # ── Mark task as running ───────────────────────────────────────
            task.status = "running"
            task.started_at = datetime.now(timezone.utc)
            await session.flush()
            await event_bus.publish(
                "task.started",
                task_id=self.task_id,
                agent_id=orchestrator.id,
                payload={"orchestrator_id": orchestrator.id},
            )

            # ── Load available specialists ─────────────────────────────────
            specs_result = await session.execute(
                select(Agent).where(
                    Agent.role == "specialist",
                    Agent.status != "disabled",
                )
            )
            specialists: list[Agent] = list(specs_result.scalars().all())

            if specialists:
                agents_list = "\n".join(
                    f"- {a.name}: {a.description or a.system_prompt[:80]}"
                    for a in specialists
                )
                specialist_map = {a.name: a for a in specialists}
            else:
                # No specialists — orchestrator handles everything itself
                agents_list = f"- {orchestrator.name}: {orchestrator.description or orchestrator.system_prompt[:80]}"
                specialists = [orchestrator]
                specialist_map = {orchestrator.name: orchestrator}

            # ── Step 1: Decompose task into subtasks ───────────────────────
            llm = get_provider(orchestrator.llm_config)
            system_prompt = _DECOMPOSE_SYSTEM.format(agents_list=agents_list)

            await event_bus.publish(
                "agent.thinking",
                task_id=self.task_id,
                agent_id=orchestrator.id,
                payload={"prompt_preview": f"Decomposing: {task.description[:100]}"},
            )

            try:
                decomp_resp = await llm.complete(
                    messages=[
                        LLMMessage(
                            role="user",
                            content=(
                                f"Task title: {task.title}\n\n"
                                f"Task description: {task.description}\n\n"
                                "Decompose this into subtasks and assign to the available agents."
                            ),
                        )
                    ],
                    system=system_prompt,
                    max_tokens=2048,
                )
            except Exception as exc:
                log.error("orchestrator.decompose.failed", task_id=self.task_id, error=str(exc))
                task.status = "failed"
                task.error = f"LLM error during decomposition: {exc}"
                await session.commit()
                await event_bus.publish(
                    "task.failed", task_id=self.task_id, payload={"error": str(exc)}
                )
                raise

            # Persist decomposition message
            session.add(
                Message(
                    task_id=self.task_id,
                    from_agent_id=orchestrator.id,
                    role="assistant",
                    content=decomp_resp.content,
                    tokens_used=decomp_resp.input_tokens + decomp_resp.output_tokens,
                )
            )
            await session.flush()

            # Parse subtask plan (graceful fallback if JSON is malformed)
            try:
                plan = _extract_json(decomp_resp.content)
                subtasks: list[dict] = plan.get("subtasks", [])
                if not subtasks:
                    raise ValueError("Empty subtask list")
            except Exception as exc:
                log.warning(
                    "orchestrator.parse.fallback", task_id=self.task_id, error=str(exc)
                )
                subtasks = [
                    {
                        "agent_name": specialists[0].name,
                        "instruction": task.description,
                        "context": task.title,
                    }
                ]

            # ── Step 2: Execute subtasks ───────────────────────────────────
            subtask_results: list[dict] = []
            for idx, subtask in enumerate(subtasks):
                agent_name: str = subtask.get("agent_name", "")
                instruction: str = subtask.get("instruction", task.description)
                context: str = subtask.get("context", "")
                full_instruction = (
                    f"{instruction}\n\nContext: {context}" if context else instruction
                )

                # Resolve specialist (exact → partial → first available)
                specialist = specialist_map.get(agent_name)
                if not specialist:
                    for name, agent in specialist_map.items():
                        if agent_name.lower() in name.lower() or name.lower() in agent_name.lower():
                            specialist = agent
                            break
                if not specialist:
                    specialist = specialists[0]

                log.info(
                    "orchestrator.subtask.start",
                    task_id=self.task_id,
                    idx=idx,
                    agent=specialist.name,
                )
                await event_bus.publish(
                    "subtask.delegated",
                    task_id=self.task_id,
                    agent_id=specialist.id,
                    payload={
                        "from_id": orchestrator.id,
                        "to_id": specialist.id,
                        "subtask": instruction[:120],
                    },
                )

                result = await AgentRunner(
                    agent_id=specialist.id,
                    task_id=self.task_id,
                    instruction=full_instruction,
                ).run()
                subtask_results.append(result)

                await event_bus.publish(
                    "subtask.completed",
                    task_id=self.task_id,
                    agent_id=specialist.id,
                    payload={
                        "agent_id": specialist.id,
                        "result_preview": result.get("content", "")[:120],
                    },
                )

            # ── Step 3: Synthesize final result ────────────────────────────
            if len(subtask_results) == 1:
                final_result = subtask_results[0].get("content", "")
            else:
                results_text = "\n\n".join(
                    f"[Subtask {i + 1}]\n{r.get('content', '')}"
                    for i, r in enumerate(subtask_results)
                )
                await event_bus.publish(
                    "agent.thinking",
                    task_id=self.task_id,
                    agent_id=orchestrator.id,
                    payload={"prompt_preview": "Synthesizing subtask results..."},
                )
                synth_resp = await llm.complete(
                    messages=[
                        LLMMessage(
                            role="user",
                            content=(
                                f"Original task: {task.title}\n\n"
                                f"Description: {task.description}\n\n"
                                f"Subtask results:\n{results_text}\n\n"
                                "Synthesize a final comprehensive answer."
                            ),
                        )
                    ],
                    system=orchestrator.system_prompt,
                    max_tokens=4096,
                )
                final_result = synth_resp.content
                session.add(
                    Message(
                        task_id=self.task_id,
                        from_agent_id=orchestrator.id,
                        role="assistant",
                        content=final_result,
                        tokens_used=synth_resp.input_tokens + synth_resp.output_tokens,
                    )
                )

            # ── Mark task completed ────────────────────────────────────────
            task.status = "completed"
            task.result = final_result
            task.completed_at = datetime.now(timezone.utc)
            await session.commit()

            await event_bus.publish(
                "task.completed",
                task_id=self.task_id,
                agent_id=orchestrator.id,
                payload={"result": final_result[:200]},
            )
            log.info("orchestrator.completed", task_id=self.task_id)
            return {"task_id": self.task_id, "status": "completed", "result": final_result}
