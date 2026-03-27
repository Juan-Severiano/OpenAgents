import asyncio

import structlog

from app.workers.celery_app import celery_app

log = structlog.get_logger(__name__)


def _run_async(coro: object) -> object:
    """Helper to run async code inside Celery sync tasks."""
    return asyncio.get_event_loop().run_until_complete(coro)  # type: ignore[arg-type]


@celery_app.task(bind=True, name="app.workers.agent_tasks.run_task")
def run_task(self: object, task_id: str) -> dict:
    """Pick up a task and start orchestration."""
    log.info("celery.run_task.start", task_id=task_id)

    async def _execute() -> dict:
        from app.database import AsyncSessionLocal
        from app.models.task import Task
        from datetime import datetime

        async with AsyncSessionLocal() as session:
            task = await session.get(Task, task_id)
            if not task:
                log.error("celery.run_task.not_found", task_id=task_id)
                return {"error": "task not found"}

            task.status = "running"
            task.started_at = datetime.utcnow()
            await session.commit()
            log.info("celery.run_task.running", task_id=task_id)

            # Placeholder — Orchestrator will be wired in Phase 2
            task.status = "completed"
            task.result = "Orchestration not yet implemented (Phase 2)"
            from datetime import datetime as dt
            task.completed_at = dt.utcnow()
            await session.commit()

        return {"task_id": task_id, "status": "completed"}

    return _run_async(_execute())


@celery_app.task(bind=True, name="app.workers.agent_tasks.run_agent_task")
def run_agent_task(self: object, agent_id: str, task_id: str, instruction: str) -> dict:
    """Execute a single agent on a subtask instruction."""
    log.info(
        "celery.run_agent_task.start",
        agent_id=agent_id,
        task_id=task_id,
        instruction_preview=instruction[:80],
    )
    # Placeholder — AgentRunner will be wired in Phase 2
    return {
        "agent_id": agent_id,
        "task_id": task_id,
        "result": "Agent execution not yet implemented (Phase 2)",
    }
