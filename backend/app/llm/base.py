from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator


@dataclass
class LLMMessage:
    role: str  # "user" | "assistant" | "system" | "tool"
    content: str
    tool_call_id: str | None = None  # set when role == "tool"


@dataclass
class LLMTool:
    """A tool (skill) exposed to the LLM."""
    name: str
    description: str
    input_schema: dict  # JSON Schema of the tool's parameters


@dataclass
class LLMToolCall:
    """A tool invocation requested by the LLM."""
    id: str
    name: str
    input: dict


@dataclass
class LLMResponse:
    content: str
    input_tokens: int
    output_tokens: int
    model: str
    tool_calls: list[LLMToolCall] = field(default_factory=list)
    stop_reason: str = "end_turn"
    raw: dict = field(default_factory=dict)


class LLMProvider(ABC):
    """Contract that every LLM provider must implement."""

    @abstractmethod
    async def complete(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        tools: list[LLMTool] | None = None,
        **kwargs: object,
    ) -> LLMResponse:
        """Blocking call — waits for the full response.

        When tools are provided and the model decides to call one,
        LLMResponse.tool_calls will be non-empty and stop_reason == "tool_use".
        """

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
