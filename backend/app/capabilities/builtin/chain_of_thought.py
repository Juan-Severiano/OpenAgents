"""chain_of_thought — injects step-by-step reasoning instruction into system prompt."""

from __future__ import annotations

from app.capabilities.base import Capability
from app.core.context import AgentContext

_INJECTION = (
    "\n\nBefore providing your final answer, think through the problem step by step. "
    "Show your reasoning process clearly, then conclude with your answer."
)


class ChainOfThoughtCapability(Capability):
    name = "chain_of_thought"

    async def pre_process(self, context: AgentContext, config: dict) -> AgentContext:
        if _INJECTION not in context.system_prompt:
            context.system_prompt = context.system_prompt + _INJECTION
        return context
