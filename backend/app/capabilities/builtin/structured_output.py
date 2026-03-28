"""structured_output — forces LLM response to conform to a JSON schema."""

from __future__ import annotations

import json

import structlog

from app.capabilities.base import Capability
from app.core.context import AgentContext
from app.llm.base import LLMResponse

log = structlog.get_logger(__name__)

_INJECTION_TEMPLATE = (
    "\n\nYou MUST respond with ONLY a valid JSON object matching this schema:\n{schema}\n"
    "Do not include markdown fences, explanations, or any text outside the JSON."
)


class StructuredOutputCapability(Capability):
    name = "structured_output"

    async def pre_process(self, context: AgentContext, config: dict) -> AgentContext:
        schema = config.get("output_schema")
        if not schema:
            return context
        schema_str = json.dumps(schema, indent=2) if isinstance(schema, dict) else str(schema)
        injection = _INJECTION_TEMPLATE.format(schema=schema_str)
        if injection not in context.system_prompt:
            context.system_prompt = context.system_prompt + injection
        return context

    async def post_process(
        self, context: AgentContext, response: LLMResponse, config: dict
    ) -> LLMResponse:
        schema = config.get("output_schema")
        if not schema:
            return response

        # Attempt to extract and validate JSON from the response
        content = response.content.strip()
        # Strip markdown fences if present
        if content.startswith("```"):
            lines = content.split("\n")
            content = "\n".join(lines[1:-1]) if len(lines) > 2 else content

        try:
            parsed = json.loads(content)
            # Re-serialize to ensure clean JSON
            response = LLMResponse(
                content=json.dumps(parsed),
                input_tokens=response.input_tokens,
                output_tokens=response.output_tokens,
                model=response.model,
                raw=response.raw,
            )
        except json.JSONDecodeError:
            log.warning(
                "structured_output.invalid_json",
                task_id=context.task_id,
                content_preview=response.content[:100],
            )

        return response
