### Kubernetes Previews using Local Mode (No Daytona)

In local mode, the agent operates directly on a working tree mounted into the container, avoiding remote sandbox providers. This template clones the repo and checks out the branch into an `emptyDir` at startup.

Use when you want per-branch previews without provisioning remote sandboxes. For advanced isolation and tooling, you can extend the template.

### Deploy

```bash
NAMESPACE=open-swe-myproj-feature-123
kubectl create namespace "$NAMESPACE"

SECRETS_ENCRYPTION_KEY=$(grep '^SECRETS_ENCRYPTION_KEY=' .env.local | cut -d= -f2-)
API_BEARER_TOKEN=$(grep '^API_BEARER_TOKEN=' .env.local | cut -d= -f2-)

sed -e "s/__NAMESPACE__/$NAMESPACE/g" \
    -e "s/__SECRETS_ENCRYPTION_KEY__/$SECRETS_ENCRYPTION_KEY/g" \
    -e "s/__API_BEARER_TOKEN__/$API_BEARER_TOKEN/g" \
    k8s/templates/secrets.yaml | kubectl apply -f -

sed -e "s#__AGENT_IMAGE__#ghcr.io/org/agent:sha#g" \
    -e "s/__NAMESPACE__/$NAMESPACE/g" \
    -e "s#__GIT_REPO_URL__#https://github.com/org/repo.git#g" \
    -e "s/__GIT_BRANCH__/feature-123/g" \
    -e "s#__OLLAMA_BASE_URL__#http://192.168.1.10:11434#g" \
    k8s/templates/deployment-agent-local.yaml | kubectl apply -f -

sed -e "s/__NAMESPACE__/$NAMESPACE/g" \
    -e "s/__HOST__/feature-123.localdev.me/g" \
    k8s/templates/ingress.yaml | kubectl apply -f -
```

The agent will expose its API at `langgraph` Service in the namespace; point your web deployment’s `LANGGRAPH_API_URL` to it.


