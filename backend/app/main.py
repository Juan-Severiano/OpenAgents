import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

log = structlog.get_logger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="OpenAgents API",
        description="Self-hosted AI agents orchestration platform",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    from app.api.providers import router as providers_router
    from app.api.agents import router as agents_router
    from app.api.tasks import router as tasks_router
    from app.api.skills import router as skills_router
    from app.api.capabilities import router as capabilities_router
    from app.api.mcp_servers import router as mcp_servers_router
    from app.api.ws import router as ws_router

    prefix = "/api/v1"
    app.include_router(providers_router, prefix=prefix)
    app.include_router(agents_router, prefix=prefix)
    app.include_router(tasks_router, prefix=prefix)
    app.include_router(skills_router, prefix=prefix)
    app.include_router(capabilities_router, prefix=prefix)
    app.include_router(mcp_servers_router, prefix=prefix)
    app.include_router(ws_router)  # WS routes don't use the /api/v1 prefix

    @app.get("/health", tags=["health"])
    async def health() -> dict:
        return {"status": "ok", "version": "0.1.0"}

    @app.on_event("startup")
    async def on_startup() -> None:
        log.info("app.startup", debug=settings.debug)
        if settings.debug:
            from app.database import create_tables
            await create_tables()
            log.info("app.startup.tables_created")

        from app.database import AsyncSessionLocal
        from app.skills.loader import seed_builtin_skills
        async with AsyncSessionLocal() as db:
            await seed_builtin_skills(db)
            await db.commit()

        from app.capabilities.loader import register_builtins, seed_builtin_capabilities
        register_builtins()
        await seed_builtin_capabilities()

    return app


app = create_app()
