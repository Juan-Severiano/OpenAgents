from __future__ import annotations

from typing import TYPE_CHECKING, Any

from app.skills.base import Skill, SkillInput, SkillOutput
from app.skills.registry import registry

if TYPE_CHECKING:
    from app.core.context import AgentContext


class WebSearchInput(SkillInput):
    query: str
    num_results: int = 5


class WebSearchSkill(Skill):
    name = "web_search"
    display_name = "Web Search"
    description = "Search the web using DuckDuckGo. Returns titles, URLs and snippets."
    input_schema = WebSearchInput

    async def run(self, input: dict[str, Any], context: AgentContext | None = None) -> SkillOutput:
        try:
            from duckduckgo_search import DDGS

            data = WebSearchInput(**input)
            results = []
            with DDGS() as ddgs:
                for r in ddgs.text(data.query, max_results=data.num_results):
                    results.append(
                        {
                            "title": r.get("title", ""),
                            "url": r.get("href", ""),
                            "snippet": r.get("body", ""),
                        }
                    )
            return SkillOutput(
                success=True,
                result=results,
                metadata={"query": data.query, "count": len(results)},
            )
        except Exception as exc:
            return SkillOutput(success=False, error=str(exc))


registry.register(WebSearchSkill())
