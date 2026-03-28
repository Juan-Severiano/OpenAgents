from typing import AsyncIterator

import structlog

from app.llm.base import LLMMessage, LLMProvider, LLMResponse, LLMTool, LLMToolCall

log = structlog.get_logger(__name__)


class AnthropicProvider(LLMProvider):
    def __init__(self, config: object) -> None:
        import anthropic

        self._config = config
        api_key = getattr(config, "api_key", None)
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = config.model  # type: ignore[union-attr]

    def _build_messages(self, messages: list[LLMMessage]) -> list[dict]:
        result = []
        for m in messages:
            if m.role == "system":
                continue
            if m.role == "tool":
                result.append({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": m.tool_call_id or "unknown",
                            "content": m.content,
                        }
                    ],
                })
            else:
                result.append({"role": m.role, "content": m.content})
        return result

    @staticmethod
    def _tools_to_anthropic(tools: list[LLMTool]) -> list[dict]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "input_schema": t.input_schema,
            }
            for t in tools
        ]

    async def complete(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        tools: list[LLMTool] | None = None,
        **kwargs: object,
    ) -> LLMResponse:
        import anthropic

        msgs = self._build_messages(messages)
        if system is None:
            system_msgs = [m.content for m in messages if m.role == "system"]
            system = "\n".join(system_msgs) if system_msgs else anthropic.NOT_GIVEN  # type: ignore[assignment]

        call_kwargs: dict = {**kwargs}
        if tools:
            call_kwargs["tools"] = self._tools_to_anthropic(tools)

        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=max_tokens,
                system=system or anthropic.NOT_GIVEN,
                messages=msgs,
                **call_kwargs,
            )

            # Extract text content
            text_parts = [b.text for b in response.content if hasattr(b, "text")]
            content = "\n".join(text_parts)

            # Extract tool calls
            tool_calls = [
                LLMToolCall(id=b.id, name=b.name, input=dict(b.input))
                for b in response.content
                if b.type == "tool_use"
            ]

            return LLMResponse(
                content=content,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                model=response.model,
                tool_calls=tool_calls,
                stop_reason=response.stop_reason or "end_turn",
                raw=response.model_dump(),
            )
        except Exception as exc:
            log.error("anthropic.complete.error", error=str(exc))
            raise

    async def stream(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> AsyncIterator[str]:
        import anthropic

        msgs = self._build_messages(messages)
        if system is None:
            system_msgs = [m.content for m in messages if m.role == "system"]
            system = "\n".join(system_msgs) if system_msgs else anthropic.NOT_GIVEN  # type: ignore[assignment]

        async with self._client.messages.stream(
            model=self._model,
            max_tokens=max_tokens,
            system=system or anthropic.NOT_GIVEN,
            messages=msgs,
            **kwargs,
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def health_check(self) -> bool:
        try:
            await self._client.messages.create(
                model=self._model,
                max_tokens=1,
                messages=[{"role": "user", "content": "ping"}],
            )
            return True
        except Exception as exc:
            log.warning("anthropic.health_check.failed", error=str(exc))
            return False
