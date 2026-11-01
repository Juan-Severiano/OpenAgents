# OpenAgents

Plataforma self-hosted para criar, configurar e orquestrar agentes de IA com vários LLMs.

> **TL;DR (EN)** Self-hosted platform to build and orchestrate AI agents. An orchestrator agent asks an LLM to decompose a task, delegates the subtasks to specialist agents (each with its own provider - Anthropic, OpenAI, Gemini or Ollama - system prompt, skills and capabilities) and synthesizes the final answer. FastAPI + Celery/Redis + PostgreSQL on the backend, a React/ReactFlow canvas updated in real time over WebSocket. **Alpha:** see [Status](#status).

Um agente **orquestrador** recebe uma tarefa, pede a um LLM que a decomponha em subtarefas, delega cada uma a um agente **especialista** e sintetiza a resposta final. Cada agente tem o seu próprio provedor de LLM, prompt de sistema, *skills* e *capabilities*. Tudo roda na sua máquina, sem depender de nuvem.

## Como funciona

```mermaid
flowchart LR
    UI["Frontend<br/>React + ReactFlow"] -->|REST /api/v1| API["FastAPI"]
    UI <-->|WebSocket| API
    API -->|enfileira a tarefa| Worker["Celery worker<br/>(broker Redis)"]
    Worker --> Orq["OrchestratorAgent"]
    Orq -->|delega subtarefas| Run["AgentRunner<br/>(agente especialista)"]
    Run --> LLM["Adapters de LLM<br/>Anthropic, OpenAI, Gemini, Ollama"]
    Run --> Skills["Skills (ferramentas)"]
    Orq --> Bus["EventBus<br/>Redis Pub/Sub"]
    Run --> Bus
    Bus --> API
    API --- DB[("PostgreSQL")]
    Worker --- DB
```

1. `POST /api/v1/tasks` cria a tarefa e a enfileira no Celery (`run_task`). Se não conseguir enfileirar (por exemplo, broker fora do ar), a API executa a tarefa em segundo plano, no próprio processo.
2. O `OrchestratorAgent` chama o LLM com o prompt de decomposição e recebe um JSON de subtarefas (se o JSON vier inválido, a tarefa inteira vai para o primeiro especialista).
3. Cada subtarefa vai ao especialista escolhido pelo nome (exato, depois parcial, depois o primeiro disponível) e roda no `AgentRunner`.
4. O `AgentRunner` aplica as *capabilities* de entrada, entra no loop **LLM → chamada de skill → resultado** até `max_iterations` e aplica as *capabilities* de saída.
5. Com mais de uma subtarefa, o orquestrador chama o LLM de novo para sintetizar o resultado, que é gravado em `Task.result`.
6. Cada passo publica um evento no Redis (`task.started`, `agent.thinking`, `subtask.delegated`, `agent.tool_called`, `task.completed`, entre outros). O gateway WebSocket repassa esses eventos ao canvas, que se atualiza em tempo real.

### Skills e Capabilities

| | Skill | Capability |
|---|---|---|
| Quem aciona | o LLM, por *tool call* | o `AgentRunner`, automaticamente, antes e depois da chamada ao LLM |
| Visível ao LLM | sim, aparece como ferramenta | não, atua nos bastidores |
| Nativas | `web_search`, `code_executor`, `http_request`, `file_reader`, `calculator`, `datetime_info` | `chain_of_thought`, `short_term_summary`, `structured_output`, `self_critique` |
| Customizadas | `custom_python` (sandbox com RestrictedPython) e `custom_http` | não há; as nativas só são ativadas por agente, a API não as edita nem apaga |

Skills também podem ser instaladas a partir de um repositório do GitHub (`POST /api/v1/skills/install/github`). O repositório precisa ter um `skill.json` (manifesto) e um `skill.py`.

## Status

Protótipo em estágio **alpha**. Verificado em 01/11/2026: o backend instala em Python 3.12, sobe contra PostgreSQL 15 e Redis 7, a documentação interativa responde em `/docs` com 30 caminhos de API e o worker do Celery conecta ao Redis e registra `run_task` e `run_agent_task`. A execução de uma tarefa de ponta a ponta com um LLM real ainda não foi coberta por teste.

| | Estado |
|---|---|
| API REST: agentes, providers, tarefas, skills, capabilities, servidores MCP | feito |
| Adapters de LLM: Anthropic, OpenAI, Gemini, Ollama | feito, sem testes automatizados |
| Orquestrador (decompõe, delega, sintetiza) e `AgentRunner` com loop de ferramentas | feito |
| Skills nativas, `custom_python`, `custom_http` e instalação via GitHub | feito |
| Capabilities (hooks de entrada e saída do LLM) | feito |
| Eventos em tempo real (Redis → WebSocket → canvas) | feito |
| Frontend: Canvas, Agents, Tasks, Skills, Capabilities, MCP e Settings | feito |
| **MCP**: cadastro de servidores e vínculo com agentes | feito |
| **MCP**: cliente (conectar, descobrir e chamar tools) | **não implementado**; as rotas `/connect` e `/tools/{name}/test` são placeholders |
| Memória vetorial (pgvector) | planejado, só na SPEC |
| Execução paralela de subtarefas e `depends_on` | planejado; hoje as subtarefas rodam **em sequência** |
| Testes automatizados | não há |

### Problemas conhecidos

- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` **não funciona**: o arquivo base só define PostgreSQL e Redis, e o de desenvolvimento declara `backend`, `celery` e `frontend` sem `build` nem `image`. Use o passo a passo abaixo.
- As tabelas são criadas pela API na subida (`Base.metadata.create_all`). A única migration do Alembic (`0001`) altera um enum sem uma migration-base antes, então `alembic upgrade head` falha em um banco novo.
- `ruff check .` aponta 32 itens (18 linhas longas, 13 imports fora de ordem, 1 import sem uso), 14 deles corrigíveis com `--fix`.

## Como rodar

Pré-requisitos: Docker, Python 3.11+ (testado com 3.12) e Node.js para o frontend.

```bash
# 1. Infraestrutura (PostgreSQL 15 e Redis 7).
#    Se a porta 5432 já estiver ocupada, troque o mapeamento no docker-compose.yml.
docker compose up -d postgres redis

# 2. Variáveis de ambiente
cp .env.example .env
#    O exemplo aponta para os hosts do Docker (postgres, redis). Rodando fora do Docker, use:
#      DATABASE_URL=postgresql+asyncpg://openagents:openagents@localhost:5432/openagents
#      REDIS_URL=redis://localhost:6379/0
#    Preencha ao menos uma chave: ANTHROPIC_API_KEY, OPENAI_API_KEY ou GOOGLE_API_KEY
#    (ou OLLAMA_BASE_URL para um modelo local).

# 3. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000        # cria as tabelas na subida

# 4. Em outro terminal, o worker que executa as tarefas
cd backend && source .venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info

# 5. Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

- API: <http://localhost:8000> · documentação: <http://localhost:8000/docs>
- Interface: <http://localhost:5173>

Na interface, cadastre um provider em **Settings**, crie os agentes (um orquestrador e um ou mais especialistas) em **Agents**, atribua skills e capabilities, crie uma tarefa em **Tasks** e acompanhe a execução no **Canvas**.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2 (async) + asyncpg, Pydantic v2, httpx, structlog |
| Fila e eventos | Celery 5, Redis (broker e Pub/Sub), WebSocket |
| Banco | PostgreSQL 15 |
| LLMs | SDKs da Anthropic, OpenAI e Google; Ollama via HTTP |
| Sandbox | RestrictedPython (skills `custom_python`) |
| Frontend | React 18, TypeScript, Vite 5, ReactFlow 11, Zustand, TanStack Query 5, Tailwind CSS 3, shadcn/ui |

## Estrutura

```
backend/app/
├── api/            rotas REST e WebSocket (uma por domínio)
├── core/           orchestrator, agent_runner, event_bus, context
├── llm/            adapters (anthropic, openai, google, ollama) e factory
├── skills/         base, registry e skills nativas
├── capabilities/   base, registry, loader e capabilities nativas
├── models/ schemas/  entidades SQLAlchemy e contratos Pydantic
└── workers/        app Celery e tarefas
frontend/src/       api, stores (Zustand), pages, components/canvas
SPEC.md             fonte de verdade da arquitetura e dos contratos
```

## Desenvolvimento

O projeto é **guiado por especificação**: o [`SPEC.md`](SPEC.md) define arquitetura, modelos de dados, contratos de API e anti-padrões, e o [`CLAUDE.md`](CLAUDE.md) orienta agentes de código que trabalham no repositório. Commits seguem Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).

```bash
cd backend && ruff check . && ruff format .     # lint e formatação (linha de 100 colunas)
cd frontend && npx tsc --noEmit                 # checagem de tipos
```

Contribuições são bem-vindas: veja [CONTRIBUTING.md](CONTRIBUTING.md) e o [Código de Conduta](CODE_OF_CONDUCT.md).

## Roadmap

1. Cliente MCP (`MCPRegistry`, `MCPClient`, `MCPProxy`; transportes stdio e SSE).
2. Memória vetorial com pgvector.
3. Testes automatizados (pytest) para orquestrador, runner e skills.
4. Execução paralela de subtarefas com `depends_on`.
5. `docker-compose` completo (backend, worker e frontend).
6. Migration-base do Alembic e lint zerado.

## Licença

[MIT](LICENSE)
