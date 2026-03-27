# OpenAgents — Spec Driven Development

> Este arquivo é a fonte de verdade do projeto. Toda implementação deve seguir esta spec.
> Ao iniciar qualquer tarefa, leia este arquivo inteiro antes de escrever código.

---

## 0. Identidade do Projeto

**Nome:** OpenAgents
**Propósito:** Plataforma self-hosted para criar, configurar, orquestrar e visualizar agentes de IA — com suporte a Skills, Capabilities, MCP Servers, ferramentas customizadas e memória persistente.
**Princípio central:** Um Agente Orquestrador recebe tarefas, decompõe em subtarefas, e delega para agentes especializados — cada um com seu próprio LLM, prompt de sistema, conjunto de Skills, Capabilities, MCPs e memória.
**Deployment:** Docker Compose, 100% local, sem dependência de cloud obrigatória.

---

## 1. Stack Tecnológica

### Backend
| Camada | Tecnologia | Versão mínima |
|---|---|---|
| Runtime | Python | 3.11+ |
| Framework web | FastAPI | 0.111+ |
| Task queue | Celery | 5.3+ |
| Message broker | Redis | 7+ |
| Banco relacional | PostgreSQL | 15+ |
| ORM | SQLAlchemy 2.x + Alembic | 2.0+ |
| Validação | Pydantic v2 | 2.0+ |
| WebSocket | FastAPI nativo (Starlette) | — |
| Memória vetorial | pgvector (extensão Postgres) | — |
| HTTP client | httpx (async) | 0.27+ |

### Frontend
| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Canvas visual | ReactFlow 11 |
| Estado global | Zustand |
| Queries/cache | TanStack Query v5 |
| Estilo | Tailwind CSS v3 |
| Componentes | shadcn/ui |
| WebSocket client | native browser WebSocket |

### Infra
- Docker + Docker Compose v2
- Nginx como reverse proxy (opcional, incluído no compose)
- `.env` para todas as configurações sensíveis — nunca hardcode

---

## 2. Estrutura de Pastas

```
openagents/
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── README.md
├── SPEC.md                        ← este arquivo
│
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py                ← FastAPI app factory
│       ├── config.py              ← settings via pydantic-settings
│       ├── database.py            ← engine, SessionLocal, Base
│       │
│       ├── models/                ← SQLAlchemy models
│       │   ├── agent.py
│       │   ├── task.py
│       │   ├── message.py
│       │   ├── llm_provider.py
│       │   ├── skill.py
│       │   ├── capability.py
│       │   └── mcp_server.py
│       │
│       ├── schemas/               ← Pydantic schemas (request/response)
│       │   ├── agent.py
│       │   ├── task.py
│       │   ├── llm_provider.py
│       │   ├── skill.py
│       │   ├── capability.py
│       │   └── mcp_server.py
│       │
│       ├── api/                   ← Routers FastAPI
│       │   ├── agents.py
│       │   ├── tasks.py
│       │   ├── providers.py
│       │   ├── skills.py
│       │   ├── capabilities.py
│       │   ├── mcp_servers.py
│       │   └── ws.py              ← WebSocket endpoint
│       │
│       ├── core/                  ← Lógica de negócio pura
│       │   ├── orchestrator.py    ← Agente Orquestrador
│       │   ├── agent_runner.py    ← Executa um agente individual
│       │   ├── event_bus.py       ← Publica/consome eventos Redis
│       │   └── memory.py          ← RAG / histórico de contexto
│       │
│       ├── llm/                   ← LLM Provider Adapter
│       │   ├── base.py            ← Interface abstrata LLMProvider
│       │   ├── anthropic.py
│       │   ├── openai.py
│       │   ├── google.py
│       │   ├── ollama.py
│       │   └── factory.py         ← get_provider(config) -> LLMProvider
│       │
│       ├── skills/                ← Skills engine
│       │   ├── base.py            ← Interface abstrata Skill
│       │   ├── registry.py        ← Registro global de skills
│       │   ├── loader.py          ← Carrega skills de arquivos/DB
│       │   └── builtin/           ← Skills nativas da plataforma
│       │       ├── web_search.py
│       │       ├── code_executor.py
│       │       ├── file_reader.py
│       │       └── http_request.py
│       │
│       ├── capabilities/          ← Capabilities engine
│       │   ├── base.py            ← Interface abstrata Capability
│       │   ├── registry.py
│       │   └── builtin/
│       │       ├── memory.py      ← Acesso à memória vetorial
│       │       ├── summarize.py   ← Sumarização automática
│       │       └── structured_output.py
│       │
│       ├── mcp/                   ← MCP (Model Context Protocol) engine
│       │   ├── client.py          ← Cliente MCP genérico
│       │   ├── registry.py        ← Registro de MCP servers ativos
│       │   ├── proxy.py           ← Proxy de ferramentas MCP → agente
│       │   └── transports/
│       │       ├── stdio.py       ← MCP via stdio (processo local)
│       │       └── sse.py         ← MCP via SSE (HTTP remoto)
│       │
│       └── workers/               ← Celery tasks
│           ├── celery_app.py
│           └── agent_tasks.py
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        │
        ├── api/                   ← chamadas REST + WebSocket client
        │   ├── agents.ts
        │   ├── tasks.ts
        │   ├── skills.ts
        │   ├── capabilities.ts
        │   ├── mcpServers.ts
        │   └── ws.ts
        │
        ├── stores/                ← Zustand stores
        │   ├── agentStore.ts
        │   ├── taskStore.ts
        │   ├── canvasStore.ts
        │   ├── skillStore.ts
        │   └── mcpStore.ts
        │
        ├── components/
        │   ├── canvas/            ← ReactFlow canvas
        │   │   ├── AgentCanvas.tsx
        │   │   ├── AgentNode.tsx
        │   │   ├── MessageEdge.tsx
        │   │   └── StatusBadge.tsx
        │   ├── agents/
        │   │   ├── AgentBuilder.tsx
        │   │   └── AgentCard.tsx
        │   ├── skills/
        │   │   ├── SkillLibrary.tsx
        │   │   ├── SkillCard.tsx
        │   │   └── SkillEditor.tsx
        │   ├── capabilities/
        │   │   ├── CapabilityPanel.tsx
        │   │   └── CapabilityToggle.tsx
        │   ├── mcp/
        │   │   ├── MCPServerList.tsx
        │   │   ├── MCPServerForm.tsx
        │   │   └── MCPToolBrowser.tsx
        │   ├── tasks/
        │   │   ├── TaskForm.tsx
        │   │   └── TaskLogPanel.tsx
        │   └── ui/                ← shadcn/ui wrappers
        │
        └── pages/
            ├── CanvasPage.tsx
            ├── AgentsPage.tsx
            ├── TasksPage.tsx
            ├── SkillsPage.tsx
            ├── MCPPage.tsx
            └── SettingsPage.tsx
```

---

## 3. Modelos de Dados

### 3.1 LLMProviderConfig

```python
class LLMProviderConfig(Base):
    __tablename__ = "llm_provider_configs"

    id: uuid (PK)
    name: str                      # "Meu Claude Opus", "GPT-4o local"
    provider: Enum                 # anthropic | openai | google | ollama
    model: str                     # "claude-opus-4-5", "gpt-4o", etc.
    api_key: str | None            # null para Ollama
    base_url: str | None           # obrigatório para Ollama
    extra_params: JSON | None      # temperatura, top_p, etc.
    created_at: datetime
```

### 3.2 Agent

```python
class Agent(Base):
    __tablename__ = "agents"

    id: uuid (PK)
    name: str
    description: str | None
    role: Enum                     # orchestrator | specialist
    system_prompt: str
    llm_config_id: uuid (FK -> llm_provider_configs)
    max_iterations: int = 10
    memory_enabled: bool = True
    status: Enum                   # idle | busy | error | disabled
    created_at: datetime
    updated_at: datetime

    # Relacionamentos (tabelas de associação)
    skills: list[AgentSkill]       # many-to-many com Skills
    capabilities: list[AgentCapability]  # many-to-many com Capabilities
    mcp_servers: list[AgentMCPServer]    # many-to-many com MCPServers
```

### 3.2.1 AgentSkill (associação)

```python
class AgentSkill(Base):
    __tablename__ = "agent_skills"

    agent_id: uuid (FK -> agents)
    skill_id: uuid (FK -> skills)
    config: JSON | None            # config específica desta skill para este agente
    enabled: bool = True
    priority: int = 0              # ordem de preferência ao resolver conflitos
```

### 3.2.2 AgentCapability (associação)

```python
class AgentCapability(Base):
    __tablename__ = "agent_capabilities"

    agent_id: uuid (FK -> agents)
    capability_id: uuid (FK -> capabilities)
    config: JSON | None
    enabled: bool = True
```

### 3.2.3 AgentMCPServer (associação)

```python
class AgentMCPServer(Base):
    __tablename__ = "agent_mcp_servers"

    agent_id: uuid (FK -> agents)
    mcp_server_id: uuid (FK -> mcp_servers)
    allowed_tools: list[str] | None   # null = todas as tools do server
    enabled: bool = True
```

### 3.3 Task

```python
class Task(Base):
    __tablename__ = "tasks"

    id: uuid (PK)
    title: str
    description: str
    orchestrator_id: uuid (FK -> agents)
    status: Enum                   # pending | running | completed | failed
    result: str | None
    error: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    metadata: JSON | None          # dados extras do usuário
```

### 3.4 Message

```python
class Message(Base):
    __tablename__ = "messages"

    id: uuid (PK)
    task_id: uuid (FK -> tasks)
    from_agent_id: uuid | None     # null = usuário ou sistema
    to_agent_id: uuid | None       # null = broadcast
    role: Enum                     # user | assistant | system | tool
    content: str
    tokens_used: int | None
    created_at: datetime
```

### 3.5 Skill

```python
class Skill(Base):
    __tablename__ = "skills"

    id: uuid (PK)
    name: str                      # "web_search", "code_executor"
    display_name: str              # "Busca na Web", "Executor de Código"
    description: str               # mostrado no UI e injetado no system prompt
    type: Enum                     # builtin | custom_python | custom_http | mcp_tool
    source: Enum                   # builtin | user_defined | marketplace
    input_schema: JSON             # JSON Schema dos parâmetros de entrada
    output_schema: JSON | None     # JSON Schema da saída esperada
    implementation: str | None     # para type=custom_python: código Python
    http_config: JSON | None       # para type=custom_http: url, method, headers
    is_public: bool = False        # visível para outros agentes no marketplace interno
    created_at: datetime
    updated_at: datetime
```

### 3.6 Capability

Capabilities são funcionalidades de alto nível que modificam o comportamento do agente — diferentes de Skills (que são ferramentas discretas invocadas explicitamente).

```python
class Capability(Base):
    __tablename__ = "capabilities"

    id: uuid (PK)
    name: str                      # "long_term_memory", "structured_output", "self_critique"
    display_name: str
    description: str
    type: Enum                     # memory | output_format | reasoning | perception | action
    config_schema: JSON            # JSON Schema da configuração
    system_prompt_injection: str | None  # texto injetado no system prompt ao ativar
    is_builtin: bool = True
    created_at: datetime
```

**Capabilities builtin disponíveis:**

| Nome | Tipo | O que faz |
|---|---|---|
| `long_term_memory` | memory | Persiste e recupera contexto via pgvector (RAG) |
| `short_term_summary` | memory | Resume histórico longo antes de cada chamada LLM |
| `structured_output` | output_format | Força resposta em JSON Schema definido pelo usuário |
| `chain_of_thought` | reasoning | Injeta instrução de pensar passo a passo antes de responder |
| `self_critique` | reasoning | Agente revisa a própria resposta antes de finalizar |
| `web_perception` | perception | Permite ao agente "ver" páginas web via scraping |
| `file_perception` | perception | Permite leitura de PDFs, CSVs, imagens |
| `human_in_the_loop` | action | Pausa execução e aguarda aprovação humana antes de agir |

### 3.7 MCPServer

```python
class MCPServer(Base):
    __tablename__ = "mcp_servers"

    id: uuid (PK)
    name: str                      # "filesystem", "github", "postgres"
    display_name: str
    description: str
    transport: Enum                # stdio | sse
    # Para stdio:
    command: str | None            # ex: "npx -y @modelcontextprotocol/server-filesystem"
    args: list[str] | None         # argumentos do comando
    env: JSON | None               # variáveis de ambiente para o processo
    # Para SSE:
    url: str | None                # ex: "http://localhost:3001/sse"
    headers: JSON | None           # headers HTTP (autenticação, etc.)
    # Metadados
    status: Enum                   # disconnected | connecting | connected | error
    discovered_tools: JSON | None  # cache das tools disponíveis (atualizado ao conectar)
    last_connected_at: datetime | None
    created_at: datetime
    updated_at: datetime
```

---

## 4. LLM Provider Adapter

### 4.1 Interface base (NUNCA violar este contrato)

```python
# app/llm/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import AsyncIterator

@dataclass
class LLMMessage:
    role: str          # "user" | "assistant" | "system"
    content: str

@dataclass
class LLMResponse:
    content: str
    input_tokens: int
    output_tokens: int
    model: str
    raw: dict          # resposta original do provider

class LLMProvider(ABC):
    """Contrato que todo provider deve implementar."""

    @abstractmethod
    async def complete(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs,
    ) -> LLMResponse:
        """Chamada síncrona (aguarda resposta completa)."""

    @abstractmethod
    async def stream(
        self,
        messages: list[LLMMessage],
        system: str | None = None,
        max_tokens: int = 4096,
        **kwargs,
    ) -> AsyncIterator[str]:
        """Streaming token a token."""

    @abstractmethod
    async def health_check(self) -> bool:
        """Verifica se o provider está acessível."""
```

### 4.2 Factory

```python
# app/llm/factory.py
def get_provider(config: LLMProviderConfig) -> LLMProvider:
    match config.provider:
        case "anthropic": return AnthropicProvider(config)
        case "openai":    return OpenAIProvider(config)
        case "google":    return GoogleProvider(config)
        case "ollama":    return OllamaProvider(config)
        case _: raise ValueError(f"Provider desconhecido: {config.provider}")
```

### 4.3 Regras de implementação por provider

| Provider | SDK | Autenticação | Observações |
|---|---|---|---|
| Anthropic | `anthropic` (oficial) | `ANTHROPIC_API_KEY` | Usar `client.messages.create` |
| OpenAI | `openai` (oficial) | `OPENAI_API_KEY` | Usar `client.chat.completions.create` |
| Google | `google-generativeai` | `GOOGLE_API_KEY` | Mapear roles: `user`/`model` |
| Ollama | `httpx` direto | nenhuma | `base_url` + `/api/chat` |

---

## 5. Skills Engine

### 5.1 Interface base

```python
# app/skills/base.py
from abc import ABC, abstractmethod
from pydantic import BaseModel

class SkillInput(BaseModel):
    """Cada skill define seu próprio Input herdando deste."""
    pass

class SkillOutput(BaseModel):
    success: bool
    result: str | dict | list
    error: str | None = None
    metadata: dict = {}

class Skill(ABC):
    name: str
    description: str
    input_schema: type[SkillInput]

    @abstractmethod
    async def run(self, input: SkillInput, context: "AgentContext") -> SkillOutput:
        """Executa a skill. Sempre async. Nunca lança exceção — retorna error no SkillOutput."""
```

### 5.2 Registro de Skills

```python
# app/skills/registry.py
class SkillRegistry:
    """Singleton. Mantém todas as skills disponíveis na memória."""

    def register(self, skill: Skill) -> None: ...
    def get(self, name: str) -> Skill | None: ...
    def list_all(self) -> list[Skill]: ...
    def list_for_agent(self, agent_id: uuid) -> list[Skill]: ...
```

### 5.3 Tipos de Skill

**builtin** — implementadas em Python dentro do projeto (`app/skills/builtin/`). Carregadas automaticamente no startup.

**custom_python** — código Python enviado pelo usuário via UI. Executado em sandbox com `RestrictedPython`. Campos obrigatórios no banco: `implementation` (código), `input_schema` (JSON Schema).

**custom_http** — chama uma URL externa com os parâmetros da skill. Útil para integrar APIs sem escrever código. Campos: `http_config.url`, `http_config.method`, `http_config.headers`, `http_config.body_template`.

**mcp_tool** — wrapper automático criado para cada tool descoberta em um MCPServer conectado. Não precisa de implementação manual — o `MCPProxy` faz a ponte.

### 5.4 Injeção de Skills no Agente

Ao executar um agente, o `AgentRunner` monta a lista de tools do LLM dinamicamente:

```python
async def build_tools_for_agent(agent: Agent) -> list[LLMTool]:
    tools = []
    for agent_skill in agent.skills:
        if agent_skill.enabled:
            skill = registry.get(agent_skill.skill_id)
            tools.append(skill_to_llm_tool(skill))  # converte para formato do provider
    for mcp_server in agent.mcp_servers:
        if mcp_server.enabled:
            mcp_tools = await mcp_registry.get_tools(mcp_server.id, mcp_server.allowed_tools)
            tools.extend(mcp_tools)
    return tools
```

### 5.5 Skills builtin disponíveis

| Nome | O que faz | Input |
|---|---|---|
| `web_search` | Busca na web via SerpAPI ou DuckDuckGo | `query: str, num_results: int` |
| `code_executor` | Executa Python em sandbox | `code: str, timeout: int` |
| `file_reader` | Lê arquivos do filesystem do container | `path: str` |
| `http_request` | Faz requisição HTTP arbitrária | `url, method, headers, body` |
| `calculator` | Avalia expressões matemáticas seguras | `expression: str` |
| `datetime_info` | Retorna data/hora atual | — |

---

## 6. Capabilities Engine

### 6.1 Como Capabilities diferem de Skills

| | Skill | Capability |
|---|---|---|
| Invocação | Explícita pelo LLM (tool call) | Automática pelo AgentRunner |
| Visibilidade para o LLM | Sim (aparece como tool) | Não (age nos bastidores) |
| Exemplo | `web_search`, `code_executor` | `long_term_memory`, `chain_of_thought` |
| Efeito | Retorna resultado de uma ação | Modifica como o agente pensa/processa |

### 6.2 Pipeline de execução com Capabilities

```
AgentRunner.run(task, agent)
    │
    ├─ [ANTES] apply_pre_capabilities(agent, context)
    │     ├── long_term_memory → busca contexto relevante, injeta no prompt
    │     ├── short_term_summary → resume histórico se >N tokens
    │     └── chain_of_thought → injeta "pense passo a passo" no system
    │
    ├─ LLM.complete(messages, tools) ← aqui o LLM age
    │
    └─ [DEPOIS] apply_post_capabilities(agent, response, context)
          ├── self_critique → LLM revisa a própria resposta
          ├── structured_output → valida e formata o JSON de saída
          ├── long_term_memory → salva a interação no vetor store
          └── human_in_the_loop → pausa e notifica usuário via WebSocket
```

### 6.3 Interface base

```python
# app/capabilities/base.py
class Capability(ABC):
    name: str
    config_schema: type[BaseModel]

    async def pre_process(
        self, context: AgentContext, config: dict
    ) -> AgentContext:
        """Roda ANTES da chamada ao LLM. Retorna context modificado."""
        return context

    async def post_process(
        self, context: AgentContext, response: LLMResponse, config: dict
    ) -> LLMResponse:
        """Roda DEPOIS da chamada ao LLM. Retorna response modificada."""
        return response
```

---

## 7. MCP (Model Context Protocol) Engine

### 7.1 Visão geral

O OpenAgents suporta MCP Servers como fonte de tools para agentes. Um MCPServer expõe ferramentas que o agente pode invocar da mesma forma que Skills — a diferença é que o protocolo de comunicação é MCP (stdio ou SSE).

### 7.2 Transports suportados

**stdio** — inicia um processo filho e se comunica via stdin/stdout. Ideal para servidores MCP locais (Node.js, Python, binários).
```
comando: npx -y @modelcontextprotocol/server-filesystem /home/user/docs
```

**SSE (Server-Sent Events)** — conecta a um servidor MCP remoto via HTTP. Ideal para servidores MCP hospedados.
```
url: http://localhost:3001/sse
```

### 7.3 Ciclo de vida de um MCPServer

```
Usuário cadastra MCPServer
        ↓
MCPRegistry.connect(server_id)
        ↓
MCPClient abre transporte (stdio ou SSE)
        ↓
Envia initialize request → recebe server_info
        ↓
Envia tools/list → descobre tools disponíveis
        ↓
Salva discovered_tools no banco + status=connected
        ↓
MCPProxy registra cada tool como Skill do tipo mcp_tool
        ↓
[Agente usa a tool]
        ↓
MCPProxy.call_tool(server_id, tool_name, args)
        ↓
MCPClient envia tools/call request
        ↓
Retorna resultado como SkillOutput
```

### 7.4 MCPRegistry

```python
# app/mcp/registry.py
class MCPRegistry:
    """Mantém conexões ativas com todos os MCP servers."""

    async def connect(self, server: MCPServer) -> None: ...
    async def disconnect(self, server_id: uuid) -> None: ...
    async def get_tools(self, server_id: uuid, allowed: list[str] | None) -> list[LLMTool]: ...
    async def call_tool(self, server_id: uuid, tool_name: str, args: dict) -> SkillOutput: ...
    def get_status(self, server_id: uuid) -> ConnectionStatus: ...
```

### 7.5 Exemplos de MCP Servers compatíveis

| Server | Transport | O que oferece |
|---|---|---|
| `@modelcontextprotocol/server-filesystem` | stdio | Leitura/escrita de arquivos locais |
| `@modelcontextprotocol/server-github` | stdio | Issues, PRs, repositórios GitHub |
| `@modelcontextprotocol/server-postgres` | stdio | Queries em banco PostgreSQL |
| `@modelcontextprotocol/server-brave-search` | stdio | Busca web via Brave API |
| `@modelcontextprotocol/server-puppeteer` | stdio | Controle de browser headless |
| Qualquer servidor SSE customizado | sse | Tools arbitrárias via HTTP |

---

Todos os eventos são publicados no Redis e consumidos pelo WebSocket gateway para atualizar o canvas em tempo real.

### 8.1 Formato padrão de evento

```json
{
  "event_id": "uuid",
  "type": "agent.status_changed",
  "task_id": "uuid",
  "agent_id": "uuid | null",
  "payload": {},
  "timestamp": "ISO8601"
}
```

### 8.2 Tipos de eventos

| Tipo | Quando é emitido | Payload relevante |
|---|---|---|
| `task.created` | Tarefa criada pelo usuário | `{ title, description }` |
| `task.started` | Orquestrador inicia processamento | `{ orchestrator_id }` |
| `task.completed` | Tarefa finalizada com sucesso | `{ result }` |
| `task.failed` | Erro irrecuperável | `{ error }` |
| `agent.status_changed` | Agente muda de estado | `{ from, to }` — idle/busy/error |
| `agent.thinking` | Agente chamou o LLM | `{ prompt_preview }` |
| `agent.message_sent` | Agente enviou mensagem para outro | `{ from_id, to_id, content_preview }` |
| `agent.tool_called` | Agente invocou ferramenta (skill ou MCP) | `{ tool_name, tool_type, args_preview }` |
| `agent.tool_result` | Ferramenta retornou resultado | `{ tool_name, success, result_preview }` |
| `agent.capability_applied` | Capability modificou contexto | `{ capability_name, stage }` — pre/post |
| `subtask.delegated` | Orquestrador delegou subtarefa | `{ from_id, to_id, subtask }` |
| `subtask.completed` | Agente concluiu subtarefa | `{ agent_id, result_preview }` |
| `mcp.connected` | MCP server conectou e descobriu tools | `{ server_id, tool_count }` |
| `mcp.disconnected` | MCP server desconectou | `{ server_id, reason }` |
| `mcp.tool_called` | Tool MCP foi invocada | `{ server_id, tool_name, args_preview }` |

### 8.3 Canais Redis

```
openagents:events:task:{task_id}     ← eventos de uma tarefa específica
openagents:events:agent:{agent_id}   ← eventos de um agente específico
openagents:events:mcp:{server_id}    ← eventos de um MCP server específico
openagents:events:global             ← todos os eventos (para o canvas)
```

---

## 9. API REST

Base path: `/api/v1`
Autenticação: JWT Bearer (para versões futuras — no MVP, API key simples via header `X-API-Key`)

### 9.1 Agents

```
GET    /agents                       Lista todos os agentes
POST   /agents                       Cria um agente
GET    /agents/{id}                  Detalhe de um agente
PUT    /agents/{id}                  Atualiza agente
DELETE /agents/{id}                  Remove agente
GET    /agents/{id}/messages         Histórico de mensagens do agente
POST   /agents/{id}/test             Testa o agente com uma mensagem simples

# Skills do agente
GET    /agents/{id}/skills           Lista skills atribuídas
POST   /agents/{id}/skills           Atribui skill ao agente
DELETE /agents/{id}/skills/{skill_id} Remove skill do agente
PATCH  /agents/{id}/skills/{skill_id} Atualiza config da skill no agente

# Capabilities do agente
GET    /agents/{id}/capabilities     Lista capabilities ativas
POST   /agents/{id}/capabilities     Ativa capability no agente
DELETE /agents/{id}/capabilities/{capability_id}
PATCH  /agents/{id}/capabilities/{capability_id}

# MCP Servers do agente
GET    /agents/{id}/mcp-servers      Lista MCP servers associados
POST   /agents/{id}/mcp-servers      Associa MCP server ao agente
DELETE /agents/{id}/mcp-servers/{mcp_id}
PATCH  /agents/{id}/mcp-servers/{mcp_id}  # ajusta allowed_tools
```

### 9.2 Tasks

```
GET    /tasks                   Lista tarefas (paginado)
POST   /tasks                   Cria e enfileira uma nova tarefa
GET    /tasks/{id}              Detalhe + status da tarefa
GET    /tasks/{id}/messages     Todas as mensagens da tarefa
DELETE /tasks/{id}              Cancela tarefa (se ainda não concluída)
```

### 9.3 LLM Providers

```
GET    /providers               Lista configurações de providers
POST   /providers               Adiciona configuração de provider
PUT    /providers/{id}          Atualiza provider
DELETE /providers/{id}          Remove provider
POST   /providers/{id}/test     Testa conectividade (health check)
```

### 9.4 Skills

```
GET    /skills                  Lista todas as skills disponíveis
POST   /skills                  Cria skill customizada (custom_python ou custom_http)
GET    /skills/{id}             Detalhe de uma skill
PUT    /skills/{id}             Atualiza skill customizada
DELETE /skills/{id}             Remove skill customizada (builtin não pode ser removida)
POST   /skills/{id}/test        Testa a skill com input de exemplo
```

### 9.5 Capabilities

```
GET    /capabilities            Lista todas as capabilities disponíveis
GET    /capabilities/{id}       Detalhe de uma capability
# Capabilities builtin não são criadas/editadas via API — apenas ativadas por agente
```

### 9.6 MCP Servers

```
GET    /mcp-servers             Lista todos os MCP servers cadastrados
POST   /mcp-servers             Cadastra um novo MCP server
GET    /mcp-servers/{id}        Detalhe + status + tools descobertas
PUT    /mcp-servers/{id}        Atualiza configuração
DELETE /mcp-servers/{id}        Remove (desconecta e apaga)
POST   /mcp-servers/{id}/connect    Conecta e descobre tools
POST   /mcp-servers/{id}/disconnect Desconecta
GET    /mcp-servers/{id}/tools  Lista tools disponíveis neste server
POST   /mcp-servers/{id}/tools/{tool}/test  Testa uma tool com args de exemplo
```

### 9.7 WebSocket

```
WS /ws/canvas                  Stream de todos os eventos (para canvas global)
WS /ws/task/{task_id}          Stream de eventos de uma tarefa específica
```

**Protocolo WebSocket:**
- Cliente conecta e recebe eventos em JSON (formato da seção 8.1)
- Cliente pode enviar `{ "type": "ping" }` — servidor responde `{ "type": "pong" }`
- Reconexão automática no frontend com backoff exponencial

---

## 10. Orquestrador — Lógica de Execução

```
POST /tasks → TaskQueue.enqueue(task_id)
                    ↓
         Celery worker pega a tarefa
                    ↓
      OrchestratorAgent.run(task)
         1. Carrega contexto da tarefa
         2. Chama LLM com system prompt de orquestrador
            + instrução para decompor em subtarefas JSON
         3. Parseia subtarefas do output do LLM
         4. Para cada subtarefa:
            a. Seleciona agente especialista disponível
            b. Publica evento `subtask.delegated`
            c. Enfileira AgentTask(subtask, agent_id)
         5. Aguarda resultados (via Redis)
         6. Consolida resultados
         7. Chama LLM novamente para síntese final
         8. Persiste resultado em Task.result
         9. Publica evento `task.completed`
```

### 7.1 Prompt de sistema do Orquestrador

O system prompt do orquestrador DEVE conter:
- Descrição do seu papel como coordenador
- Lista de agentes disponíveis (nome + descrição + capacidades)
- Instrução para retornar subtarefas em JSON estruturado
- Formato esperado de subtarefa:
  ```json
  {
    "subtasks": [
      {
        "agent_name": "nome do agente",
        "instruction": "o que deve ser feito",
        "context": "informação relevante para esta subtarefa",
        "depends_on": []
      }
    ]
  }
  ```

---

## 11. Canvas Visual — Comportamento Esperado

### 8.1 Nós (Agentes)

Cada agente é um nó ReactFlow com:
- Nome e role (badge colorido: coral = orquestrador, amber = especialista)
- Status visual: cinza = idle, azul pulsando = thinking, verde = done, vermelho = error
- Contador de mensagens enviadas/recebidas
- Clicável → abre painel lateral com log completo

### 8.2 Arestas (Mensagens)

Cada delegação/resposta entre agentes é uma aresta animada:
- Seta animada saindo do emissor → receptor
- Cor: azul para delegação, verde para resposta
- Label opcional com preview do conteúdo (primeiros 40 chars)
- Aresta some após 3 segundos (fade out) — mantém apenas conexões persistentes

### 8.3 Estado do Canvas

O canvas deve refletir o estado em tempo real via WebSocket:
- Ao receber `agent.status_changed` → atualiza cor/animação do nó
- Ao receber `subtask.delegated` → cria aresta animada temporária
- Ao receber `agent.thinking` → ativa animação de "pulso" no nó
- Ao receber `task.completed` → todos os nós voltam ao estado idle após 2s

---

## 12. Variáveis de Ambiente

```env
# Database
DATABASE_URL=postgresql+asyncpg://openagents:openagents@postgres:5432/openagents

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=troque-isso-em-producao
API_KEY=sua-chave-local-aqui

# LLM Defaults (pode ser sobrescrito por agent)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_API_KEY=
OLLAMA_BASE_URL=http://host.docker.internal:11434

# App
DEBUG=false
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:5173
```

---

## 13. Docker Compose

```yaml
# Serviços obrigatórios no compose:
services:
  postgres:      # image: postgres:15-alpine
  redis:         # image: redis:7-alpine
  backend:       # build: ./backend, porta 8000
  celery:        # mesmo Dockerfile do backend, comando: celery worker
  frontend:      # build: ./frontend, porta 5173 (dev) / 80 (prod)
  nginx:         # opcional, reverse proxy para /api → backend, / → frontend
```

---

## 14. Convenções de Código

### Python (Backend)
- Formatação: `ruff format` + `ruff check`
- Type hints obrigatórios em todas as funções públicas
- Async por padrão em routers e core — nunca usar `time.sleep`, sempre `asyncio.sleep`
- Logs com `structlog` (JSON) — nunca usar `print()`
- Exceções customizadas em `app/exceptions.py`
- Testes em `tests/` com `pytest` + `pytest-asyncio`

### TypeScript (Frontend)
- Strict mode ativado no `tsconfig.json`
- Sem `any` — usar `unknown` quando necessário
- Componentes funcionais com hooks apenas
- Nomeação: componentes `PascalCase`, funções/variáveis `camelCase`, constantes `UPPER_SNAKE`
- Testes com Vitest + Testing Library

### Git
- Branch principal: `main`
- Feature branches: `feat/nome-da-feature`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Nunca commitar `.env` — apenas `.env.example`

---

## 15. Roadmap de Implementação

### Fase 1 — Fundação (MVP funcional)
- [ ] Docker Compose com todos os serviços
- [ ] Modelos SQLAlchemy + migrações Alembic iniciais
- [ ] LLM Adapter com Anthropic + Ollama
- [ ] CRUD de Agentes via API
- [ ] CRUD de LLM Providers via API
- [ ] Celery + Redis funcionando
- [ ] React base com roteamento

### Fase 2 — Orquestração
- [ ] Agente Orquestrador implementado
- [ ] Task Queue + execução de tarefas
- [ ] Agent Runner (executa agente especialista)
- [ ] Event Bus publicando eventos
- [ ] WebSocket gateway conectado ao Event Bus
- [ ] UI de criação de tarefas

### Fase 3 — Skills
- [ ] Skills Engine com registry e interface base
- [ ] Skills builtin: `web_search`, `code_executor`, `http_request`, `file_reader`
- [ ] CRUD de skills customizadas (custom_python + custom_http)
- [ ] Sandbox para execução de custom_python (RestrictedPython)
- [ ] UI de Skills Library + atribuição de skills a agentes
- [ ] Tela de teste de skill com input/output

### Fase 4 — Capabilities
- [ ] Capabilities Engine com pipeline pre/post
- [ ] `long_term_memory` (pgvector RAG)
- [ ] `short_term_summary`
- [ ] `chain_of_thought`
- [ ] `self_critique`
- [ ] `structured_output`
- [ ] `human_in_the_loop` (pausa + notificação WebSocket)
- [ ] UI de toggle de capabilities por agente

### Fase 5 — MCP Servers
- [ ] MCP Client com transport stdio
- [ ] MCP Client com transport SSE
- [ ] MCPRegistry com gestão de conexões ativas
- [ ] Descoberta automática de tools ao conectar
- [ ] MCPProxy: tools MCP → Skills do tipo mcp_tool
- [ ] UI de gerenciamento de MCP Servers
- [ ] UI de browser de tools MCP disponíveis
- [ ] Associação de MCP Servers a agentes (com allowed_tools)

### Fase 6 — Canvas Visual
- [ ] ReactFlow com nós de agentes
- [ ] WebSocket client consumindo eventos
- [ ] Animações de status, skill calls e MCP calls
- [ ] Painel lateral de log por agente (com tools usadas)

### Fase 7 — Providers Completos + Polimento
- [ ] OpenAI provider
- [ ] Google AI Studio provider
- [ ] Log Explorer com filtros
- [ ] Settings page completa
- [ ] Testes automatizados (backend + frontend)
- [ ] README completo com setup
- [ ] Health checks nos containers

---

## 16. Decisões de Arquitetura e Justificativas

| Decisão | Alternativa rejeitada | Motivo |
|---|---|---|
| FastAPI | Django / Flask | Async nativo, Pydantic integrado, OpenAPI auto-gerado |
| Celery + Redis | RQ / APScheduler | Celery é mais maduro para múltiplos workers e prioridades |
| pgvector | Chroma / Qdrant | Reduz infra — memória no mesmo Postgres já usado |
| ReactFlow | D3.js direto | API declarativa, handles de conexão prontos, performance |
| Zustand | Redux / Context | Simples, sem boilerplate, funciona bem com TanStack Query |
| Redis Pub/Sub | Kafka / RabbitMQ | Suficiente para o volume esperado, já está no stack |
| Skills como interface abstrata | LangChain Tools direto | Desacoplamento — troca de framework LLM sem reescrever skills |
| Capabilities no pipeline pre/post | Injetar tudo no system prompt | Separação de responsabilidade — cada capability age no momento certo |
| MCP via mcp-python SDK | Implementar protocolo do zero | O SDK oficial já lida com negotiation, serialização e transports |
| RestrictedPython para custom skills | Docker-in-Docker / subprocess | Mais simples de operar — sem risco de escape de container |

---

## 17. O que o Claude Code NÃO deve fazer

- ❌ Hardcodar API keys no código — sempre via `.env`
- ❌ Usar `requests` (síncrono) — sempre `httpx` async
- ❌ Criar endpoints sem validação Pydantic
- ❌ Fazer queries N+1 — usar `joinedload` ou `selectinload` no SQLAlchemy
- ❌ Usar `print()` para logs — usar `structlog`
- ❌ Commitar sem type hints nas funções públicas
- ❌ Criar novo provider LLM sem implementar a interface `LLMProvider` completa
- ❌ Emitir eventos sem o formato padrão definido na seção 8.1
- ❌ Modificar o schema do banco sem criar migração Alembic
- ❌ Criar Skill sem herdar de `app.skills.base.Skill` e implementar `run()`
- ❌ Criar Capability sem implementar ao menos `pre_process` ou `post_process`
- ❌ Executar código de custom_python sem passar pelo sandbox RestrictedPython
- ❌ Conectar a MCP Server sem passar pelo `MCPRegistry` — nunca chamar `MCPClient` diretamente do AgentRunner
- ❌ Cachear `discovered_tools` de MCP Server em memória de instância — sempre usar o banco + registry
- ❌ Criar skill do tipo `mcp_tool` manualmente — elas são geradas automaticamente pelo `MCPProxy` ao conectar
- ❌ Permitir que uma Capability builtin seja deletada ou editada via API
- ❌ Passar API keys de MCP servers como args de linha de comando — sempre via `env` no MCPServer.env

---

*OpenAgents SPEC v1.1 — gerado para Claude Code*
*Inclui: Skills Engine, Capabilities Engine, MCP Server support*
*Atualize este arquivo sempre que uma decisão arquitetural mudar.*
