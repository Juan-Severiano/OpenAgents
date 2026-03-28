from __future__ import annotations

from typing import TYPE_CHECKING, Any

import httpx

from app.skills.base import Skill, SkillInput, SkillOutput
from app.skills.registry import registry

if TYPE_CHECKING:
    from app.core.context import AgentContext

_MAX_BODY_CHARS = 10_000


class HttpRequestInput(SkillInput):
    url: str
    method: str = "GET"
    headers: dict[str, str] = {}
    body: str | None = None
    timeout: int = 10


class HttpRequestSkill(Skill):
    name = "http_request"
    display_name = "HTTP Request"
    description = "Make an arbitrary HTTP request (GET, POST, PUT, DELETE, etc.) to any URL."
    input_schema = HttpRequestInput

    async def run(self, input: dict[str, Any], context: AgentContext | None = None) -> SkillOutput:
        try:
            data = HttpRequestInput(**input)
            async with httpx.AsyncClient(timeout=data.timeout) as client:
                response = await client.request(
                    method=data.method.upper(),
                    url=data.url,
                    headers=data.headers,
                    content=data.body.encode() if data.body else None,
                )
            body_text = response.text[:_MAX_BODY_CHARS]
            return SkillOutput(
                success=True,
                result={
                    "status_code": response.status_code,
                    "body": body_text,
                    "headers": dict(response.headers),
                    "truncated": len(response.text) > _MAX_BODY_CHARS,
                },
                metadata={"url": data.url, "method": data.method},
            )
        except httpx.TimeoutException:
            return SkillOutput(success=False, error=f"Request timed out after {data.timeout}s")
        except Exception as exc:
            return SkillOutput(success=False, error=str(exc))


registry.register(HttpRequestSkill())
