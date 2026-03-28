"""self_critique — agent reviews its own response before finalizing."""

from __future__ import annotations

import structlog

from app.capabilities.base import Capability
from app.core.context import AgentContext
from app.llm.base import LLMMessage, LLMResponse

log = structlog.get_logger(__name__)

_CRITIQUE_PROMPT = (
    "Review your previous response below. Check for:\n"
    "- Factual accuracy and completeness\n"
    "- Logical consistency\n"
    "- Whether it fully addresses the request\n\n"
    "Previous response:\n{response}\n\n"
    "If the response is satisfactory, reply with it verbatim. "
    "If it needs improvement, provide a corrected version."
)


class SelfCritiqueCapability(Capability):
    name = "self_critique"

    async def post_process(
        self, context: AgentContext, response: LLMResponse, config: dict
    ) -> LLMResponse:
        llm = context.metadata.get("llm")
        if llm is None:
            log.warning("self_critique.no_llm_in_context", task_id=context.task_id)
            return response

        try:
            critique_resp = await llm.complete(
                messages=[
                    LLMMessage(
                        role="user",
                        content=_CRITIQUE_PROMPT.format(response=response.content),
                    )
                ],
                system=context.system_prompt,
                max_tokens=response.output_tokens + 512,
            )
            log.info("self_critique.applied", task_id=context.task_id)
            return LLMResponse(
                content=critique_resp.content,
                input_tokens=response.input_tokens + critique_resp.input_tokens,
                output_tokens=response.output_tokens + critique_resp.output_tokens,
                model=response.model,
                raw=response.raw,
            )
        except Exception as exc:
            log.warning("self_critique.failed", task_id=context.task_id, error=str(exc))
            return response
