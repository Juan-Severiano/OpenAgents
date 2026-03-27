import json
from typing import AsyncIterator

import httpx
import structlog

from app.llm.base import LLMMessage, LLMProvider, LLMResponse

log = structlog.get_logger(__name__)


class OllamaProvider(LLMProvider):
    def __init__(self, config: object) -> None:
        self._config = config
        from app.config import settings

        base_url = getattr(config, "base_url", None) or settings.ollama_base_url
        self._base_url = base_url.rstrip("/")
        self._model = config.model  # type: ignore[union-attr]

    def _build_messages(
        self, messages: list[LLMMessage], system: str | None
    ) -> list[dict]:
        result: list[dict] = []
        if system:
            result.append({"role": "system", "content": system})
        for m in messages:
            result.append({"role": m.role, "content": m.content})
        return result

    async def complete(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> LLMResponse:
        msgs = self._build_messages(messages, system)
        payload = {
            "model": self._model,
            "messages": msgs,
            "stream": False,
            "options": {"num_predict": max_tokens},
        }
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(f"{self._base_url}/api/chat", json=payload)
                response.raise_for_status()
                data = response.json()
                content = data.get("message", {}).get("content", "")
                prompt_eval = data.get("prompt_eval_count", 0)
                eval_count = data.get("eval_count", 0)
                return LLMResponse(
                    content=content,
                    input_tokens=prompt_eval,
                    output_tokens=eval_count,
                    model=data.get("model", self._model),
                    raw=data,
                )
        except Exception as exc:
            log.error("ollama.complete.error", error=str(exc))
            raise

    async def stream(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> AsyncIterator[str]:
        msgs = self._build_messages(messages, system)
        payload = {
            "model": self._model,
            "messages": msgs,
            "stream": True,
            "options": {"num_predict": max_tokens},
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self._base_url}/api/chat", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line.strip():
                        try:
                            data = json.loads(line)
                            token = data.get("message", {}).get("content", "")
                            if token:
                                yield token
                        except json.JSONDecodeError:
                            continue

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self._base_url}/api/tags")
                return response.status_code == 200
        except Exception as exc:
            log.warning("ollama.health_check.failed", error=str(exc))
            return False
