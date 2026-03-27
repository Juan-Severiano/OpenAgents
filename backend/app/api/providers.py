from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import httpx
import structlog

from app.database import get_db
from app.models.llm_provider import LLMProviderConfig
from app.schemas.llm_provider import (
    LLMProviderConfigCreate,
    LLMProviderConfigResponse,
    LLMProviderConfigUpdate,
)

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/providers", tags=["providers"])

_STATIC_MODELS: dict[str, list[dict]] = {
    "anthropic": [
        {"id": "claude-opus-4-6",             "name": "Claude Opus 4.6"},
        {"id": "claude-sonnet-4-6",           "name": "Claude Sonnet 4.6"},
        {"id": "claude-haiku-4-5-20251001",   "name": "Claude Haiku 4.5"},
        {"id": "claude-3-5-sonnet-20241022",  "name": "Claude 3.5 Sonnet"},
        {"id": "claude-3-5-haiku-20241022",   "name": "Claude 3.5 Haiku"},
        {"id": "claude-3-opus-20240229",      "name": "Claude 3 Opus"},
    ],
    "openai": [
        {"id": "gpt-4o",          "name": "GPT-4o"},
        {"id": "gpt-4o-mini",     "name": "GPT-4o Mini"},
        {"id": "o1",              "name": "o1"},
        {"id": "o1-mini",         "name": "o1 Mini"},
        {"id": "o3-mini",         "name": "o3 Mini"},
        {"id": "gpt-4-turbo",     "name": "GPT-4 Turbo"},
        {"id": "gpt-3.5-turbo",   "name": "GPT-3.5 Turbo"},
    ],
    "google": [
        {"id": "gemini-2.0-flash",       "name": "Gemini 2.0 Flash"},
        {"id": "gemini-2.0-flash-lite",  "name": "Gemini 2.0 Flash Lite"},
        {"id": "gemini-1.5-pro",         "name": "Gemini 1.5 Pro"},
        {"id": "gemini-1.5-flash",       "name": "Gemini 1.5 Flash"},
    ],
}


@router.get("/models")
async def list_models(
    provider: str = Query(...),
    base_url: str | None = Query(default=None),
) -> dict:
    """Return available models for a given provider. Ollama fetches live from the local server."""
    if provider == "ollama":
        url = (base_url or "http://localhost:11434").rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                models = [
                    {"id": m["name"], "name": m["name"]}
                    for m in data.get("models", [])
                ]
        except Exception as exc:
            log.warning("providers.list_models.ollama_error", error=str(exc))
            models = []
        return {"models": models}

    return {"models": _STATIC_MODELS.get(provider, [])}


@router.get("", response_model=list[LLMProviderConfigResponse])
async def list_providers(db: AsyncSession = Depends(get_db)) -> list[LLMProviderConfig]:
    result = await db.execute(select(LLMProviderConfig))
    return list(result.scalars().all())


@router.post("", response_model=LLMProviderConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_provider(
    body: LLMProviderConfigCreate, db: AsyncSession = Depends(get_db)
) -> LLMProviderConfig:
    provider = LLMProviderConfig(**body.model_dump())
    db.add(provider)
    await db.flush()
    await db.refresh(provider)
    log.info("provider.created", id=provider.id, name=provider.name)
    return provider


@router.get("/{provider_id}", response_model=LLMProviderConfigResponse)
async def get_provider(
    provider_id: str, db: AsyncSession = Depends(get_db)
) -> LLMProviderConfig:
    provider = await db.get(LLMProviderConfig, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
    return provider


@router.put("/{provider_id}", response_model=LLMProviderConfigResponse)
async def update_provider(
    provider_id: str, body: LLMProviderConfigUpdate, db: AsyncSession = Depends(get_db)
) -> LLMProviderConfig:
    provider = await db.get(LLMProviderConfig, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(provider, field, value)
    await db.flush()
    await db.refresh(provider)
    return provider


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider(provider_id: str, db: AsyncSession = Depends(get_db)) -> None:
    provider = await db.get(LLMProviderConfig, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
    await db.delete(provider)


@router.post("/{provider_id}/test")
async def test_provider(
    provider_id: str, db: AsyncSession = Depends(get_db)
) -> dict:
    provider = await db.get(LLMProviderConfig, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail=f"Provider {provider_id} not found")
    from app.llm.factory import get_provider as _get_provider
    llm = _get_provider(provider)
    try:
        ok = await llm.health_check()
        return {"ok": ok, "provider": provider.provider, "model": provider.model}
    except Exception as exc:
        log.error("provider.test.error", provider_id=provider_id, error=str(exc))
        return {"ok": False, "error": str(exc)}
