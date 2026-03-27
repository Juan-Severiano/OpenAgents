from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import structlog

from app.database import get_db
from app.models.task import Task
from app.models.message import Message
from app.schemas.task import TaskCreate, TaskResponse
from app.schemas.message import MessageResponse

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)
) -> list[Task]:
    result = await db.execute(
        select(Task).order_by(Task.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all())


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(body: TaskCreate, db: AsyncSession = Depends(get_db)) -> Task:
    data = body.model_dump()
    metadata = data.pop("metadata", None)
    task = Task(**data, task_metadata=metadata)
    db.add(task)
    await db.flush()
    await db.refresh(task)
    log.info("task.created", id=task.id, title=task.title)

    # Enqueue for Celery processing
    try:
        from app.workers.agent_tasks import run_task
        run_task.delay(task.id)
    except Exception as exc:
        log.warning("task.enqueue.failed", task_id=task.id, error=str(exc))

    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, db: AsyncSession = Depends(get_db)) -> Task:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task


@router.get("/{task_id}/messages", response_model=list[MessageResponse])
async def get_task_messages(
    task_id: str, db: AsyncSession = Depends(get_db)
) -> list[Message]:
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    result = await db.execute(
        select(Message)
        .where(Message.task_id == task_id)
        .order_by(Message.created_at)
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
