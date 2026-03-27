import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.message import Message
from app.models.task import Task
from app.schemas.message import MessageResponse
from app.schemas.task import TaskCreate, TaskResponse

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])


async def _run_task_direct(task_id: str) -> None:
    """Run a task directly (without Celery) — used when worker is not available."""
    from app.core.orchestrator import OrchestratorAgent

    try:
        await OrchestratorAgent(task_id).run()
    except Exception as exc:
        log.error("task.direct_run.error", task_id=task_id, error=str(exc))


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)
) -> list[Task]:
    result = await db.execute(
        select(Task).order_by(Task.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    body: TaskCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> Task:
    data = body.model_dump()
    metadata = data.pop("metadata", None)
    task = Task(**data, task_metadata=metadata)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    log.info("task.created", id=task.id, title=task.title)

    # Commit before enqueuing so the worker can read the task from DB
    await db.commit()

    # Try Celery first; fall back to in-process background task
    enqueued = False
    try:
        from app.workers.agent_tasks import run_task

        run_task.delay(task.id)
        enqueued = True
        log.info("task.enqueued.celery", task_id=task.id)
    except Exception as exc:
        log.warning("task.enqueue.celery.failed", task_id=task.id, error=str(exc))

    if not enqueued:
        background_tasks.add_task(_run_task_direct, task.id)
        log.info("task.enqueued.background", task_id=task.id)

    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)) -> Task:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task


@router.get("/{task_id}/messages", response_model=list[MessageResponse])
async def get_task_messages(task_id: str, db: AsyncSession = Depends(get_db)) -> list[Message]:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    result = await db.execute(
        select(Message).where(Message.task_id == task_id).order_by(Message.created_at)
    )
    return list(result.scalars().all())


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_task(task_id: str, db: AsyncSession = Depends(get_db)) -> None:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    if task.status in ("completed", "failed"):
        raise HTTPException(status_code=409, detail="Cannot cancel a finished task")
    task.status = "failed"
    task.error = "Cancelled by user"
    await db.flush()
