#!/usr/bin/env bash
set -euo pipefail

# Opinionated setup script for a single LAN server running Docker (web+agent) and microk8s (previews)

if ! command -v docker &>/dev/null; then
  echo "Docker not found. Please install Docker and re-run." >&2
  exit 1
fi

if ! command -v microk8s &>/dev/null; then
  echo "microk8s not found. Installing via snap (requires sudo)." >&2
  sudo snap install microk8s --classic
  sudo usermod -aG microk8s "$USER" || true
  newgrp microk8s <<<'echo joined'
fi

echo "Enabling microk8s addons: dns, storage, ingress"
microk8s enable dns storage ingress

echo "Preparing kubeconfig for web API"
mkdir -p "$HOME/.kube"
microk8s config > "$HOME/.kube/config"
export KUBECONFIG_B64=$(base64 -w0 "$HOME/.kube/config" 2>/dev/null || base64 "$HOME/.kube/config" | tr -d '\n')

ROOT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." &> /dev/null && pwd)
cd "$ROOT_DIR"

echo "Generating secrets (.env.local)"
bash scripts/gen-local-secrets.sh

echo "Appending KUBECONFIG_B64 to .env.local"
echo "KUBECONFIG_B64=$KUBECONFIG_B64" >> .env.local

echo "Starting Docker stack (web + agent)"
docker compose --env-file .env.local up -d --build

echo "Done. Ensure DNS/hosts map your preview domains to this server's IP."


