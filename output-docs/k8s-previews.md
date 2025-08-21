### Kubernetes-based Preview Environments (Branch-per-Instance)

This provides per-branch preview environments for your team using Kubernetes (minikube, microk8s, or any cluster). Each branch gets its own namespace with isolated web and agent services, and can be destroyed after merge. Project-scoped persistent services (e.g., shared databases) live in a separate namespace and are reachable by previews.

### Requirements

- A Kubernetes cluster and `kubectl`
- An ingress controller (e.g., nginx)
- Container registry with built images for web and agent
- Ollama reachable from the cluster (LAN URL or node IP)

### One-time setup

1) Generate shared secrets (used for both services):
```bash
bash scripts/gen-local-secrets.sh
```

2) Ensure ingress DNS or host mappings resolve to your cluster:
- For minikube: `minikube addons enable ingress`
- Map `feature-123.localdev.me` → ingress IP, etc.

### Deploy a preview for a branch

```bash
scripts/k8s-create-preview.sh \
  myproj \
  feature-123 \
  feature-123.localdev.me \
  ghcr.io/org/web:sha \
  ghcr.io/org/agent:sha \
  http://192.168.1.10:11434
```

This creates namespace `open-swe-myproj-feature-123`, a `web` service (Next.js) and `langgraph` service (agent), and an ingress for the host. The agent points to the provided Ollama URL.

Open: `http://feature-123.localdev.me`

### Destroy a preview

```bash
scripts/k8s-destroy-preview.sh myproj feature-123
```

### Project-scoped persistent services

Provision databases and shared infra in a dedicated namespace, e.g., `open-swe-myproj-core`. Expose them via ClusterIP Services or DNS so previews can connect. Provide these endpoints to the agent via environment variables or Settings → Configuration.

### CI integration sketch

- On PR open/update:
  - Build/push images tagged with PR SHA
  - Run `k8s-create-preview.sh` with branch name and host
- On PR close/merge:
  - Run `k8s-destroy-preview.sh`

### Auth and security

- Local/offline mode is enabled; no paid providers required
- For multi-user previews, configure proper ingress TLS and authentication


