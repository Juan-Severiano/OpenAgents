import json
from typing import AsyncIterator

import structlog

from app.llm.base import LLMMessage, LLMProvider, LLMResponse, LLMTool, LLMToolCall

log = structlog.get_logger(__name__)


class OpenAIProvider(LLMProvider):
    def __init__(self, config: object) -> None:
        import openai

        self._config = config
        api_key = getattr(config, "api_key", None)
        base_url = getattr(config, "base_url", None)
        self._client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._model = config.model  # type: ignore[union-attr]

    def _build_messages(self, messages: list[LLMMessage], system: str | None) -> list[dict]:
        result: list[dict] = []
        if system:
            result.append({"role": "system", "content": system})
        for m in messages:
            if m.role == "system":
                if not system:
                    result.append({"role": "system", "content": m.content})
            elif m.role == "tool":
                result.append({
                    "role": "tool",
                    "tool_call_id": m.tool_call_id or "unknown",
                    "content": m.content,
                })
            else:
                result.append({"role": m.role, "content": m.content})
        return result

    @staticmethod
    def _tools_to_openai(tools: list[LLMTool]) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t.name,
                    "description": t.description,
                    "parameters": t.input_schema,
                },
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
        msgs = self._build_messages(messages, system)
        call_kwargs: dict = {**kwargs}
        if tools:
            call_kwargs["tools"] = self._tools_to_openai(tools)

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=msgs,  # type: ignore[arg-type]
                max_tokens=max_tokens,
                **call_kwargs,
            )
            choice = response.choices[0]
            content = choice.message.content or ""

            tool_calls: list[LLMToolCall] = []
            if choice.message.tool_calls:
                for tc in choice.message.tool_calls:
                    try:
                        args = json.loads(tc.function.arguments)
                    except json.JSONDecodeError:
                        args = {}
                    tool_calls.append(LLMToolCall(id=tc.id, name=tc.function.name, input=args))

            return LLMResponse(
                content=content,
                input_tokens=response.usage.prompt_tokens if response.usage else 0,
                output_tokens=response.usage.completion_tokens if response.usage else 0,
                model=response.model,
                tool_calls=tool_calls,
                stop_reason=choice.finish_reason or "stop",
                raw=response.model_dump(),
            )
        except Exception as exc:
            log.error("openai.complete.error", error=str(exc))
            raise

    async def stream(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> AsyncIterator[str]:
        msgs = self._build_messages(messages, system)
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=msgs,  # type: ignore[arg-type]
            max_tokens=max_tokens,
            stream=True,
            **kwargs,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def health_check(self) -> bool:
        try:
            await self._client.chat.completions.create(
                model=self._model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
            )
            return True
        except Exception as exc:
            log.warning("openai.health_check.failed", error=str(exc))
            return False
