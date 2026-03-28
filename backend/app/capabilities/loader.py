"""Capabilities loader — registers builtin Capability instances and seeds the DB."""

from __future__ import annotations

import structlog

from app.capabilities.builtin.chain_of_thought import ChainOfThoughtCapability
from app.capabilities.builtin.self_critique import SelfCritiqueCapability
from app.capabilities.builtin.short_term_summary import ShortTermSummaryCapability
from app.capabilities.builtin.structured_output import StructuredOutputCapability
from app.capabilities.registry import registry

log = structlog.get_logger(__name__)

# Canonical metadata for seeding the DB (must match Capability model fields)
_BUILTIN_METADATA = [
    {
        "name": "chain_of_thought",
        "display_name": "Chain of Thought",
        "description": "Instructs the agent to reason step by step before answering.",
        "type": "reasoning",
        "config_schema": {},
        "system_prompt_injection": (
            "\n\nBefore providing your final answer, think through the problem step by step. "
            "Show your reasoning process clearly, then conclude with your answer."
        ),
        "is_builtin": True,
    },
    {
        "name": "short_term_summary",
        "display_name": "Short-Term Summary",
        "description": (
            "Automatically summarizes long conversation history before each LLM call "
            "to stay within context limits."
        ),
        "type": "memory",
        "config_schema": {
            "type": "object",
            "properties": {
                "token_threshold": {
                    "type": "integer",
                    "default": 3000,
                    "description": "Approximate token count above which summarization triggers.",
                }
            },
        },
        "system_prompt_injection": None,
        "is_builtin": True,
    },
    {
        "name": "structured_output",
        "display_name": "Structured Output",
        "description": "Forces the agent to respond with a JSON object matching a given schema.",
        "type": "output_format",
        "config_schema": {
            "type": "object",
            "properties": {
                "output_schema": {
                    "type": "object",
                    "description": "JSON Schema the response must conform to.",
                }
            },
            "required": ["output_schema"],
        },
        "system_prompt_injection": None,
        "is_builtin": True,
    },
    {
        "name": "self_critique",
        "display_name": "Self-Critique",
        "description": "Agent reviews and optionally corrects its own response before finalizing.",
        "type": "reasoning",
        "config_schema": {},
        "system_prompt_injection": None,
        "is_builtin": True,
    },
]

_BUILTIN_INSTANCES = [
    ChainOfThoughtCapability(),
    ShortTermSummaryCapability(),
    StructuredOutputCapability(),
    SelfCritiqueCapability(),
]


def register_builtins() -> None:
    """Register all builtin capabilities in the in-memory registry."""
    for cap in _BUILTIN_INSTANCES:
        registry.register(cap)
    log.info("capabilities.builtins_registered", count=len(_BUILTIN_INSTANCES))


async def seed_builtin_capabilities() -> None:
    """Upsert builtin capability records in the DB. Safe to call on every startup."""
    from sqlalchemy import select

    from app.database import AsyncSessionLocal
    from app.models.capability import Capability

    async with AsyncSessionLocal() as session:
        for meta in _BUILTIN_METADATA:
            existing = (
                await session.execute(select(Capability).where(Capability.name == meta["name"]))
            ).scalar_one_or_none()

            if existing:
                # Update mutable fields (keep id and created_at intact)
                existing.display_name = meta["display_name"]
                existing.description = meta["description"]
                existing.config_schema = meta["config_schema"]
                existing.system_prompt_injection = meta["system_prompt_injection"]
            else:
                session.add(Capability(**meta))

        await session.commit()
    log.info("capabilities.db_seeded", count=len(_BUILTIN_METADATA))
