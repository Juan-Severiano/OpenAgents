from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class LLMMessage:
    role: str  # "user" | "assistant" | "system"
    content: str


@dataclass
class LLMResponse:
    content: str
    input_tokens: int
    output_tokens: int
    model: str
    raw: dict = field(default_factory=dict)


class LLMProvider(ABC):
    """Contract that every LLM provider must implement."""

    @abstractmethod
    async def complete(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> LLMResponse:
        """Blocking call — waits for the full response."""

    @abstractmethod
    async def stream(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs: object,
    ) -> AsyncIterator[str]:
        """Token-by-token streaming."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Returns True if the provider is reachable."""
