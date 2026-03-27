from app.llm.base import LLMProvider


def get_provider(config: object) -> LLMProvider:
    """Return the correct LLMProvider for the given config."""
    provider = getattr(config, "provider", None)
    match provider:
        case "anthropic":
            from app.llm.anthropic import AnthropicProvider
            return AnthropicProvider(config)
        case "openai":
            from app.llm.openai import OpenAIProvider
            return OpenAIProvider(config)
        case "google":
            from app.llm.google import GoogleProvider
            return GoogleProvider(config)
        case "ollama":
            from app.llm.ollama import OllamaProvider
            return OllamaProvider(config)
        case _:
            raise ValueError(f"Unknown provider: {provider!r}")
