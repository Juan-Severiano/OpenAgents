class OpenAgentsError(Exception):
    """Base exception for OpenAgents."""


class NotFoundError(OpenAgentsError):
    def __init__(self, resource: str, resource_id: str) -> None:
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} with id {resource_id} not found")


class ValidationError(OpenAgentsError):
    def __init__(self, message: str) -> None:
        super().__init__(message)


class ProviderError(OpenAgentsError):
    def __init__(self, provider: str, message: str) -> None:
        self.provider = provider
        super().__init__(f"Provider '{provider}' error: {message}")


class SkillError(OpenAgentsError):
    def __init__(self, skill: str, message: str) -> None:
        self.skill = skill
        super().__init__(f"Skill '{skill}' error: {message}")


class MCPError(OpenAgentsError):
    def __init__(self, server: str, message: str) -> None:
        self.server = server
        super().__init__(f"MCP server '{server}' error: {message}")
