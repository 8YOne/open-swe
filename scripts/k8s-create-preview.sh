#!/usr/bin/env bash
set -euo pipefail

# Usage: k8s-create-preview.sh <project> <branch> <host> <web_image> <agent_image> [ollama_base_url]
# Example:
#   ./scripts/k8s-create-preview.sh myproj feature-123 feature-123.localdev.me ghcr.io/org/web:sha ghcr.io/org/agent:sha http://192.168.1.10:11434

PROJECT="$1"; shift
BRANCH_RAW="$1"; shift
HOST="$1"; shift
WEB_IMAGE="$1"; shift
AGENT_IMAGE="$1"; shift
OLLAMA_BASE_URL="${1:-http://host.docker.internal:11434}"

NAMESPACE="open-swe-${PROJECT}-$(echo "$BRANCH_RAW" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-')"

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
SECRETS_FILE="$ROOT_DIR/.env.local"
if [[ ! -f "$SECRETS_FILE" ]]; then
  echo "Missing $SECRETS_FILE. Run scripts/gen-local-secrets.sh first." >&2
  exit 1
fi

SECRETS_ENCRYPTION_KEY=$(grep '^SECRETS_ENCRYPTION_KEY=' "$SECRETS_FILE" | cut -d= -f2-)
API_BEARER_TOKEN=$(grep '^API_BEARER_TOKEN=' "$SECRETS_FILE" | cut -d= -f2-)

apply() {
  sed -e "s/__NAMESPACE__/$NAMESPACE/g" \
      -e "s/__BRANCH__/$BRANCH_RAW/g" \
      "$ROOT_DIR/k8s/templates/namespace.yaml" | kubectl apply -f -

  sed -e "s/__NAMESPACE__/$NAMESPACE/g" \
      -e "s/__SECRETS_ENCRYPTION_KEY__/$SECRETS_ENCRYPTION_KEY/g" \
      -e "s/__API_BEARER_TOKEN__/$API_BEARER_TOKEN/g" \
      "$ROOT_DIR/k8s/templates/secrets.yaml" | kubectl apply -f -

  sed -e "s#__WEB_IMAGE__#$WEB_IMAGE#g" \
      -e "s/__NAMESPACE__/$NAMESPACE/g" \
      "$ROOT_DIR/k8s/templates/deployment-web.yaml" | kubectl apply -f -

  sed -e "s#__AGENT_IMAGE__#$AGENT_IMAGE#g" \
      -e "s/__NAMESPACE__/$NAMESPACE/g" \
      -e "s#__OLLAMA_BASE_URL__#$OLLAMA_BASE_URL#g" \
      "$ROOT_DIR/k8s/templates/deployment-agent.yaml" | kubectl apply -f -

  sed -e "s/__NAMESPACE__/$NAMESPACE/g" \
      -e "s/__HOST__/$HOST/g" \
      "$ROOT_DIR/k8s/templates/ingress.yaml" | kubectl apply -f -
}

apply
echo "Preview deployed in namespace $NAMESPACE at host $HOST"


