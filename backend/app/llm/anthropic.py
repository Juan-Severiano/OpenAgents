from typing import AsyncIterator

import structlog

from app.llm.base import LLMMessage, LLMProvider, LLMResponse

log = structlog.get_logger(__name__)


class AnthropicProvider(LLMProvider):
    def __init__(self, config: object) -> None:
        import anthropic

        self._config = config
        api_key = getattr(config, "api_key", None)
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = config.model  # type: ignore[union-attr]

    def _build_messages(self, messages: list[LLMMessage]) -> list[dict]:
        return [{"role": m.role, "content": m.content} for m in messages if m.role != "system"]

    async def complete(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> LLMResponse:
        import anthropic

        msgs = self._build_messages(messages)
        # Extract system from messages if not provided explicitly
        if system is None:
            system_msgs = [m.content for m in messages if m.role == "system"]
            system = "\n".join(system_msgs) if system_msgs else anthropic.NOT_GIVEN  # type: ignore[assignment]

        try:
            response = await self._client.messages.create(
                model=self._model,
                max_tokens=max_tokens,
                system=system or anthropic.NOT_GIVEN,
                messages=msgs,
                **kwargs,
            )
            content = response.content[0].text if response.content else ""
            return LLMResponse(
                content=content,
                input_tokens=response.usage.input_tokens,
                output_tokens=response.usage.output_tokens,
                model=response.model,
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
