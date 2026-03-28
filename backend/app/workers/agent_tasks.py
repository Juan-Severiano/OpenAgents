import asyncio

import structlog

from app.workers.celery_app import celery_app

log = structlog.get_logger(__name__)


async def _dispose_engine() -> None:
    """Close all asyncpg connections so asyncio.run() can exit cleanly in a forked process."""
    from app.database import engine

    await engine.dispose()


@celery_app.task(
    bind=True,
    name="app.workers.agent_tasks.run_task",
    max_retries=3,
    default_retry_delay=60,
)
def run_task(self: object, task_id: str) -> dict:
    """Pick up a Task and run the full orchestration pipeline."""
    log.info("celery.run_task.start", task_id=task_id)

    async def _execute() -> dict:
        from app.core.orchestrator import OrchestratorAgent

        try:
            return await OrchestratorAgent(task_id).run()
        finally:
            await _dispose_engine()

    try:
        return asyncio.run(_execute())
    except Exception as exc:
        log.error("celery.run_task.error", task_id=task_id, error=str(exc))
        error_msg = str(exc)

        async def _mark_failed() -> None:
            from app.database import AsyncSessionLocal
            from app.models.task import Task

            try:
                async with AsyncSessionLocal() as session:
                    task = await session.get(Task, task_id)
                    if task and task.status not in ("completed", "failed"):
                        task.status = "failed"
                        task.error = error_msg
                        await session.commit()
            finally:
                await _dispose_engine()

        asyncio.run(_mark_failed())
        raise


@celery_app.task(
    bind=True,
    name="app.workers.agent_tasks.run_agent_task",
    max_retries=3,
    default_retry_delay=30,
)
def run_agent_task(self: object, agent_id: str, task_id: str, instruction: str) -> dict:
    """Execute a single specialist agent on a subtask instruction."""
    log.info(
        "celery.run_agent_task.start",
        agent_id=agent_id,
        task_id=task_id,
        instruction_preview=instruction[:80],
    )

    async def _execute() -> dict:
        from app.core.agent_runner import AgentRunner

        try:
            return await AgentRunner(agent_id, task_id, instruction).run()
        finally:
            await _dispose_engine()

    try:
        return asyncio.run(_execute())
    except Exception as exc:
        log.error(
            "celery.run_agent_task.error",
            agent_id=agent_id,
            task_id=task_id,
            error=str(exc),
        )
        raise
