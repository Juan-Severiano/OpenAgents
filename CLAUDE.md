# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Source of Truth

**SPEC.md is the source of truth for this project.** Read it before writing any code. It defines architecture decisions, data models, API contracts, execution flows, and anti-patterns to avoid.

---

## Development Commands

### Running with Docker (recommended)

```bash
# Start full stack (dev mode with hot reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Start only infra (postgres + redis), run backend/frontend locally
docker compose up postgres redis
```

### Backend (FastAPI + Celery)

```bash
cd backend

# Install dependencies
pip install -e ".[dev]"

# Run FastAPI dev server (requires postgres + redis running)
uvicorn app.main:app --reload --port 8000

# Run Celery worker
celery -A app.workers.celery_app worker --loglevel=info

# Database migrations
alembic upgrade head
alembic revision --autogenerate -m "description"

# Linting / formatting (ruff, line-length 100)
ruff check .
ruff format .
```

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Dev server (port 5173, proxies /api → :8000)
npm run dev

# Type check
npx tsc --noEmit

# Build
npm run build
```

---

## Architecture Overview

### High-Level Flow

```
User → Frontend (React/ReactFlow) → REST API / WebSocket
                                         ↓
                              FastAPI (backend/app/main.py)
                                         ↓
                         Celery Task Queue (Redis broker)
                                         ↓
                     OrchestratorAgent (core/orchestrator.py)
                       ↓ decomposes task into subtasks
                     AgentRunner (core/agent_runner.py)
                       ↓ executes each specialist agent
                     LLM Adapters (llm/factory.py)
                                         ↓
                         EventBus (core/event_bus.py) → Redis Pub/Sub
                                         ↓
                         WebSocket Gateway (api/ws.py) → Frontend canvas
```

### Backend Structure (`backend/app/`)

- **`main.py`** — FastAPI app factory, mounts all routers
- **`config.py`** — All settings via `pydantic-settings` + `.env`
- **`database.py`** — Async SQLAlchemy engine, `AsyncSession`, `Base`
- **`models/`** — SQLAlchemy ORM models (agent, task, message, skill, capability, mcp_server, llm_provider)
- **`schemas/`** — Pydantic v2 request/response models mirroring models/
- **`api/`** — FastAPI routers, one per domain + `ws.py` for WebSocket
- **`core/`** — Pure business logic: orchestrator, agent_runner, event_bus, context
- **`llm/`** — LLM provider adapters (anthropic, openai, google, ollama) + `factory.py`
- **`workers/`** — Celery app + background task definitions

### Frontend Structure (`frontend/src/`)

- **`api/`** — Typed REST clients (TanStack Query) + `ws.ts` WebSocket manager
- **`stores/`** — Zustand global state (agentStore, taskStore, canvasStore, skillStore, mcpStore)
- **`pages/`** — Route-level components (Canvas, Agents, Tasks, Skills, Capabilities, MCP, Settings)
- **`components/canvas/`** — ReactFlow canvas, AgentNode, StatusBadge
- **`components/ui/`** — shadcn/ui component wrappers

### Key Data Relationships

- `Agent` has many `Skills` (explicit tool calls), `Capabilities` (auto-applied pipeline hooks), and `MCPServers` (via join tables)
- `Task` has a parent `Agent` (orchestrator) and spawns child `Task`s for specialist agents
- `Message` belongs to a `Task` and records the LLM conversation thread

### Skills vs Capabilities (critical distinction)

| | Skill | Capability |
|---|---|---|
| Invocation | Explicit by LLM (tool call) | Automatic by AgentRunner (pre/post hooks) |
| LLM visibility | Yes (appears as tool) | No (acts behind the scenes) |

### Event Bus / WebSocket pattern

Events flow: `core/event_bus.py` → Redis Pub/Sub → `api/ws.py` → browser WebSocket → ReactFlow canvas updates in real time.

---

## Current Implementation Status

**Phase 1 complete** — Foundation/MVP: all models, schemas, CRUD APIs, LLM adapters, Celery boilerplate, full frontend scaffold with stores and pages.

**Phase 2 complete** — Orchestrator, AgentRunner, EventBus, task execution pipeline, WebSocket real-time canvas updates fully working.

**Phase 3 complete** — Skills Engine: base interface, registry, builtin skills (web_search, code_executor, http_request, file_reader, calculator, datetime_info), custom_python sandbox, custom_http, frontend Skills Library + agent skill assignment.

**Phase 4 in progress** — Capabilities Engine: pre/post hooks pipeline in AgentRunner. Branch: `feat/capabilities-engine`. Issues: #25–#29.
- Capabilities are automatic hooks (NOT tool calls) — they modify context before/after LLM calls
- Pipeline: `apply_pre_capabilities` → `LLM.complete()` → `apply_post_capabilities`
- Builtins: `chain_of_thought`, `short_term_summary`, `structured_output`, `self_critique`
- `app/capabilities/base.py` — Capability ABC
- `app/capabilities/registry.py` — CapabilityRegistry singleton
- `app/capabilities/builtin/` — builtin implementations
- `app/capabilities/loader.py` — seeds DB on startup

Upcoming phases: MCP protocol → pgvector memory → Polish.

---

## Code Conventions

### Python
- Async everywhere (`async def`, `AsyncSession`, `httpx.AsyncClient`)
- `structlog` for logging (never `print`)
- `ruff` for lint + format (line-length: 100, rules: E, F, I)
- Type hints required on all function signatures

### TypeScript
- `strict: true` — no `any`, no unused locals/params
- PascalCase components, camelCase functions/variables
- TanStack Query for all server state; Zustand only for UI/client state

### Git
- Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`

### Anti-patterns (from SPEC.md)
- Never call `MCPClient` directly from `AgentRunner` — always go through `MCPRegistry`
- Never cache MCP `discovered_tools` in memory — always use DB + registry
- Never execute custom Python skills without `RestrictedPython` sandbox
- Never delete or allow API editing of built-in Capabilities
- MCP tool-type skills are auto-generated by `MCPProxy` — never create manually

---

## Environment

Copy `.env.example` to `.env` and fill in API keys. Required services: PostgreSQL 15+ and Redis 7+. Optionally configure Ollama for local LLM (`OLLAMA_BASE_URL`).
