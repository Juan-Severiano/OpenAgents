import asyncio
import json
import uuid

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

log = structlog.get_logger(__name__)
router = APIRouter(tags=["websocket"])


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket) -> str:
        await websocket.accept()
        conn_id = str(uuid.uuid4())
        self._connections[conn_id] = websocket
        log.info("ws.connected", conn_id=conn_id, total=len(self._connections))
        return conn_id

    def disconnect(self, conn_id: str) -> None:
        self._connections.pop(conn_id, None)
        log.info("ws.disconnected", conn_id=conn_id, total=len(self._connections))

    async def broadcast(self, message: dict) -> None:
        data = json.dumps(message)
        dead: list[str] = []
        for conn_id, ws in list(self._connections.items()):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(conn_id)
        for conn_id in dead:
            self.disconnect(conn_id)

    async def send(self, conn_id: str, message: dict) -> None:
        ws = self._connections.get(conn_id)
        if ws:
            await ws.send_text(json.dumps(message))


manager = ConnectionManager()


async def _redis_listener(channel: str, manager: ConnectionManager) -> None:
    """Subscribe to Redis channel and forward events to WebSocket connections."""
    try:
        import redis.asyncio as aioredis
        from app.config import settings

        redis = aioredis.from_url(settings.redis_url)
        pubsub = redis.pubsub()
        await pubsub.subscribe(channel)
        async for msg in pubsub.listen():
            if msg["type"] == "message":
                try:
                    data = json.loads(msg["data"])
                    await manager.broadcast(data)
                except (json.JSONDecodeError, Exception) as exc:
                    log.warning("ws.redis_listener.error", error=str(exc))
    except Exception as exc:
        log.error("ws.redis_listener.fatal", channel=channel, error=str(exc))


@router.websocket("/ws/canvas")
async def canvas_websocket(websocket: WebSocket) -> None:
    conn_id = await manager.connect(websocket)
    listener_task = asyncio.create_task(
        _redis_listener("openagents:events:global", manager)
    )
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(conn_id)
        listener_task.cancel()


@router.websocket("/ws/task/{task_id}")
async def task_websocket(websocket: WebSocket, task_id: str) -> None:
    conn_id = await manager.connect(websocket)
    channel = f"openagents:events:task:{task_id}"
    listener_task = asyncio.create_task(_redis_listener(channel, manager))
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        manager.disconnect(conn_id)
        listener_task.cancel()
