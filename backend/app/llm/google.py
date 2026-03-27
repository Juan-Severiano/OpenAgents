from typing import AsyncIterator

import structlog

from app.llm.base import LLMMessage, LLMProvider, LLMResponse

log = structlog.get_logger(__name__)


class GoogleProvider(LLMProvider):
    def __init__(self, config: object) -> None:
        import google.generativeai as genai

        self._config = config
        api_key = getattr(config, "api_key", None)
        genai.configure(api_key=api_key)
        self._model_name = config.model  # type: ignore[union-attr]
        self._genai = genai

    def _build_contents(self, messages: list[LLMMessage]) -> list[dict]:
        # Google uses "user" and "model" roles
        role_map = {"user": "user", "assistant": "model", "system": "user"}
        return [
            {"role": role_map.get(m.role, "user"), "parts": [{"text": m.content}]}
            for m in messages
            if m.role != "system"
        ]

    def _get_system(self, messages: list[LLMMessage], system: str | None) -> str | None:
        if system:
            return system
        for m in messages:
            if m.role == "system":
                return m.content
        return None

    async def complete(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> LLMResponse:
        import asyncio

        contents = self._build_contents(messages)
        system_instruction = self._get_system(messages, system)

        model = self._genai.GenerativeModel(
            model_name=self._model_name,
            system_instruction=system_instruction,
        )

        try:
            response = await asyncio.to_thread(
                model.generate_content,
                contents,
                generation_config={"max_output_tokens": max_tokens},
            )
            content = response.text or ""
            usage = response.usage_metadata
            return LLMResponse(
                content=content,
                input_tokens=getattr(usage, "prompt_token_count", 0),
                output_tokens=getattr(usage, "candidates_token_count", 0),
                model=self._model_name,
                raw={"candidates": str(response.candidates)},
            )
        except Exception as exc:
            log.error("google.complete.error", error=str(exc))
            raise

    async def stream(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> AsyncIterator[str]:
        import asyncio

        contents = self._build_contents(messages)
        system_instruction = self._get_system(messages, system)
        model = self._genai.GenerativeModel(
            model_name=self._model_name,
            system_instruction=system_instruction,
        )

        response = await asyncio.to_thread(
            model.generate_content,
            contents,
            generation_config={"max_output_tokens": max_tokens},
            stream=True,
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text

    async def health_check(self) -> bool:
        try:
            model = self._genai.GenerativeModel(model_name=self._model_name)
            import asyncio
            await asyncio.to_thread(
                model.generate_content,
                "ping",
                generation_config={"max_output_tokens": 1},
            )
            return True
        except Exception as exc:
            log.warning("google.health_check.failed", error=str(exc))
            return False
