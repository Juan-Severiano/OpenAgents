"""CapabilityRegistry — singleton that holds all registered Capability instances."""

from __future__ import annotations

import structlog

from app.capabilities.base import Capability

log = structlog.get_logger(__name__)


class CapabilityRegistry:
    def __init__(self) -> None:
        self._capabilities: dict[str, Capability] = {}

    def register(self, capability: Capability) -> None:
        self._capabilities[capability.name] = capability
        log.debug("capability.registered", name=capability.name)

    def get(self, name: str) -> Capability | None:
        return self._capabilities.get(name)

    def list_all(self) -> list[Capability]:
        return list(self._capabilities.values())


registry = CapabilityRegistry()
