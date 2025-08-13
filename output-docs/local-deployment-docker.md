### Open SWE: Fully Local Docker Deployment (No Paid Dependencies)

This guide deploys the entire stack locally using Docker: the LangGraph server (agent) and the Next.js web app. For models, it connects to an Ollama instance running on your host or LAN. No paid APIs or external services are required.

### What You’ll Get

- LangGraph server at http://localhost:2024
- Web app at http://localhost:3000
- Ollama expected at http://localhost:11434 (host) or any LAN URL
- Local/offline auth path enabled; GitHub integration optional

### Prerequisites

- Docker and Docker Compose
- Optional: `openssl` for generating secrets

### 1) Generate Secrets

Run:

```bash
bash scripts/gen-local-secrets.sh
```

This creates an `.env.local` file in the repo root with `SECRETS_ENCRYPTION_KEY` and `API_BEARER_TOKEN` used by the web proxy and LangGraph server.

### 2) Ensure Ollama is running locally or on your LAN

By default, the stack points to `http://host.docker.internal:11434`. You can override via `OLLAMA_BASE_URL` in `.env.local`.

Start Ollama on your host (outside Docker) and pull a model:

```bash
ollama serve &
ollama pull llama3.1
```

### 3) Start the Stack

```bash
docker compose --env-file .env.local up --build
```

Wait until `web` and `langgraph` are healthy. Then visit http://localhost:3000.

You can use any compatible model (e.g., `llama3.2:3b-instruct`).

### 4) Configure Models (Web UI)

In the app Settings → Configuration:

- Set `plannerModelName`, `programmerModelName`, etc. to `ollama:llama3.1`
- Ensure `ollamaBaseUrl` matches your Ollama endpoint (default `http://host.docker.internal:11434` or your LAN IP)

Notes:
- Ollama does not require API keys
- OpenAI-compatible endpoints can be used via `openaiBaseUrl`, but are not needed here

### 5) Local/Offline Mode

The web proxy and LangGraph server run with `OPEN_SWE_LOCAL_MODE=true`. This:

- Bypasses GitHub auth headers and uses a local identity
- If `API_BEARER_TOKEN` is set, the proxy adds an `Authorization: Bearer <token>` header; the server accepts it

You can now use Open SWE without GitHub setup. GitHub features will be unavailable until configured.

### 6) Ports and Services

- `web` → 3000: Next.js
- `langgraph` → 2024: LangGraph server
- (External) `ollama` on host or LAN → 11434: Local LLMs

### 7) Environment Variables

Docker Compose sets these for local use:

- `OPEN_SWE_LOCAL_MODE=true` (web, langgraph)
- `SECRETS_ENCRYPTION_KEY` (web, langgraph)
- `API_BEARER_TOKEN` (web adds Authorization header; langgraph validates)
- `LANGGRAPH_API_URL=http://langgraph:2024` (web → server)
- `OLLAMA_BASE_URL=http://host.docker.internal:11434` (server → LLM; override via `.env.local`)

### 8) Production via Docker

For production on a single host:

- Keep the same docker-compose.yml
- Use stronger secrets in `.env.local`
- Optionally remove `OPEN_SWE_LOCAL_MODE=true` and configure GitHub app env in the web app and server
- Add persistence and monitoring per your infra standards

To run detached:

```bash
docker compose --env-file .env.local up -d --build
```

### 9) Troubleshooting

- Web 500 at /api: ensure `.env.local` exists and includes `SECRETS_ENCRYPTION_KEY`.
- Server 401: ensure `API_BEARER_TOKEN` is set in `.env.local` so the proxy can authenticate to LangGraph.
- Model load errors: confirm `ollama` container is running and model is pulled.


