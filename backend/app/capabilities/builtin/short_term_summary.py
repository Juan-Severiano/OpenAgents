"""short_term_summary — summarizes conversation history when it grows too long."""

from __future__ import annotations

import structlog

from app.capabilities.base import Capability
from app.core.context import AgentContext
from app.llm.base import LLMMessage

log = structlog.get_logger(__name__)

_DEFAULT_TOKEN_THRESHOLD = 3000  # approximate char count (1 token ≈ 4 chars)
_SUMMARY_PROMPT = (
    "Summarize the following conversation history concisely, "
    "preserving all key facts and decisions:\n\n{history}"
)


class ShortTermSummaryCapability(Capability):
    name = "short_term_summary"

    async def pre_process(self, context: AgentContext, config: dict) -> AgentContext:
        threshold = int(config.get("token_threshold", _DEFAULT_TOKEN_THRESHOLD)) * 4
        total_chars = sum(len(m.content) for m in context.messages)

        if total_chars <= threshold:
            return context

        # Need the LLM config from context metadata to do the summarization call
        llm = context.metadata.get("llm")
        if llm is None:
            log.warning("short_term_summary.no_llm_in_context", task_id=context.task_id)
            return context

        history_text = "\n".join(
            f"[{m.role}]: {m.content}" for m in context.messages[:-1]
        )
        try:
            from app.llm.base import LLMMessage as Msg  # local import to avoid cycle
            summary_resp = await llm.complete(
                messages=[Msg(role="user", content=_SUMMARY_PROMPT.format(history=history_text))],
                max_tokens=512,
            )
            summary_content = f"[Conversation summary]: {summary_resp.content}"
            # Replace history with summary + keep the last user message
            last_message = context.messages[-1]
            context.messages = [
                LLMMessage(role="user", content=summary_content),
                last_message,
            ]
            log.info(
                "short_term_summary.summarized",
                task_id=context.task_id,
                original_chars=total_chars,
            )
        except Exception as exc:
            log.warning("short_term_summary.failed", task_id=context.task_id, error=str(exc))

        return context
