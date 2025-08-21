### Open SWE on a Local Network Server (Docker + microk8s Previews)

This guide sets up:
- Core Open SWE (web + agent) in Docker
- microk8s for dynamic per-branch previews
- CI to auto-create/destroy previews

### 0) Server prerequisites
- OS: Linux recommended (Ubuntu 22.04+)
- Install Docker, Docker Compose
- Install microk8s: `sudo snap install microk8s --classic`
- Add user to groups: `sudo usermod -aG microk8s $USER && sudo usermod -aG docker $USER`
- Enable addons: `microk8s enable dns storage ingress`
- Get kubeconfig for server user:
  - `microk8s config > ~/.kube/config`
  - Export to web app env: base64 encode kubeconfig

### 1) Clone repo and generate secrets
```bash
git clone https://github.com/langchain-ai/open-swe.git
cd open-swe
bash scripts/gen-local-secrets.sh
```

This creates `.env.local` with:
- SECRETS_ENCRYPTION_KEY
- API_BEARER_TOKEN
- PREVIEW_ADMIN_TOKEN

### 2) Configure environment for Docker and web API
Edit `.env.local` (or export env vars in your service manager):

- For Docker Compose (core app):
  - SECRETS_ENCRYPTION_KEY=<copied>
  - API_BEARER_TOKEN=<copied>
  - OLLAMA_BASE_URL=http://<LAN-ollama>:11434
  - OPEN_SWE_PROJECT_PATH=/workspace/repo (optional for local-mode coding)

- For web API (K8s access):
  - PREVIEW_ADMIN_TOKEN=<copied>
  - KUBECONFIG_B64=$(base64 -w0 ~/.kube/config)

Persist these into your process manager (e.g., systemd) or export for interactive runs.

### 3) Start core app (web + agent)
```bash
docker compose --env-file .env.local up -d --build
```

- Visit web at http://<server-ip>:3000
- Ensure agent reachable internally at http://langgraph:2024 (Compose handles this)
- Ensure Ollama reachable at OLLAMA_BASE_URL

### 4) microk8s DNS/Ingress
- Ensure your LAN DNS or hosts map points preview hosts (e.g., `pr-123.previews.local`) to the server’s IP
- microk8s ingress addon is enabled; NGINX will route to namespace services

### 5) Configure CI on each project repo (image-based strategy)
- Add GitHub Actions from docs in `output-docs/k8s-previews.md` (Preview + Cleanup workflows)
- In the Create Preview step, pass the admin header with your token:
```bash
curl -sS -X POST "$WEB_API_URL/api/k8s/previews" \
  -H "content-type: application/json" \
  -H "x-preview-admin-token: $PREVIEW_ADMIN_TOKEN" \
  -d '{
    "project":"your-project",
    "branch":"'"${GITHUB_HEAD_REF:-$GITHUB_REF_NAME}"'",
    "host":"pr-'"${{ github.event.number }}"'.previews.local",
    "appImage":"ghcr.io/org/your-app:pr-'"${{ github.event.pull_request.number }}"'-'"${{ github.sha }}"'",
    "appPort":3000
  }'
```

For cleanup:
```bash
curl -sS -X DELETE "$WEB_API_URL/api/k8s/previews?project=$PROJECT&branch=$BRANCH" \
  -H "x-preview-admin-token: $PREVIEW_ADMIN_TOKEN"
```

### 6) Web UI manual controls
- Settings → Configuration → Kubernetes Previews
- Provide Project, Branch, Host, App Image, App Port
- Click Create Preview / Delete Preview

### 7) Persistent project services
- Create a namespace (e.g., `open-swe-core`) in microk8s
- Deploy DB/queues there; expose ClusterIP Services
- When creating previews, have your app read endpoints via env config
- Future: Projects Admin UI can save these per project and inject automatically

### 8) Security & hardening
- Restrict the web API via PREVIEW_ADMIN_TOKEN (required header)
- Lock down microk8s ingress with TLS (use your certs or mkcert) and/or network policies
- Run Docker and microk8s on the server behind your LAN firewall

### 9) Operations
- List namespaces: `microk8s kubectl get ns | grep open-swe-`
- Inspect preview: `microk8s kubectl -n open-swe-<proj>-<branch> get all`
- Delete preview manually: `microk8s kubectl delete ns open-swe-<proj>-<branch>`


