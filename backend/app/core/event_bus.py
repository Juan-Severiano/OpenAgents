"""Event Bus — publishes structured events to Redis Pub/Sub.

Channels:
  openagents:events:global              — all events (canvas)
  openagents:events:task:{task_id}      — events for a specific task
  openagents:events:agent:{agent_id}    — events for a specific agent

Event format (§8.1 of SPEC):
  {
    "event_id": "uuid",
    "type": "agent.status_changed",
    "task_id": "uuid | null",
    "agent_id": "uuid | null",
    "payload": {},
    "timestamp": "ISO8601"
  }
"""

import json
import uuid
from datetime import datetime, timezone

import structlog

log = structlog.get_logger(__name__)


async def publish(
    event_type: str,
    task_id: str | None = None,
    agent_id: str | None = None,
    payload: dict | None = None,
) -> None:
    """Publish an event to all relevant Redis channels."""
    try:
        import redis.asyncio as aioredis
        from app.config import settings

        event = {
            "event_id": str(uuid.uuid4()),
            "type": event_type,
            "task_id": task_id,
            "agent_id": agent_id,
            "payload": payload or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        data = json.dumps(event)

        channels: list[str] = ["openagents:events:global"]
        if task_id:
            channels.append(f"openagents:events:task:{task_id}")
        if agent_id:
            channels.append(f"openagents:events:agent:{agent_id}")

        redis = aioredis.from_url(settings.redis_url)
        async with redis:
            for channel in channels:
                await redis.publish(channel, data)

        log.debug(
            "event_bus.published",
            type=event_type,
            task_id=task_id,
            agent_id=agent_id,
        )
    except Exception as exc:
        # Event bus failures must never crash the main execution
        log.warning("event_bus.publish.failed", event_type=event_type, error=str(exc))
