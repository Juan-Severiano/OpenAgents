from __future__ import annotations

from dataclasses import dataclass, field

from app.llm.base import LLMMessage


@dataclass
class AgentContext:
    """Shared execution state passed through the agent pipeline.

    This is the foundation for the Capabilities pipeline (Phase 4).
    Pre- and post-capabilities will receive and return this object.
    """

    task_id: str
    agent_id: str
    agent_name: str
    system_prompt: str
    messages: list[LLMMessage] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "task_id": self.task_id,
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
        }
