"""Capability base interface.

Capabilities are automatic pipeline hooks that run before/after LLM calls.
They are NOT visible to the LLM as tools — they act behind the scenes.

Pipeline order (per SPEC §6.2):
  pre_process  → called before LLM.complete()
  post_process → called after  LLM.complete()
"""

from __future__ import annotations

from abc import ABC

from app.core.context import AgentContext
from app.llm.base import LLMResponse


class Capability(ABC):
    """Abstract base class for all capabilities.

    Subclasses MUST set `name` and MAY override `pre_process` and/or `post_process`.
    At least one of the two must be overridden to be useful.
    """

    name: str

    async def pre_process(self, context: AgentContext, config: dict) -> AgentContext:
        """Run BEFORE the LLM call. Returns a (possibly modified) context."""
        return context

    async def post_process(
        self, context: AgentContext, response: LLMResponse, config: dict
    ) -> LLMResponse:
        """Run AFTER the LLM call. Returns a (possibly modified) response."""
        return response
