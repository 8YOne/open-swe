#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

SECRETS_FILE="$ROOT_DIR/.env.local"

echo "Generating secrets to $SECRETS_FILE"

SECRETS_ENCRYPTION_KEY=$(openssl rand -hex 32)
API_BEARER_TOKEN=$(openssl rand -hex 32)

cat > "$SECRETS_FILE" <<EOF
# Shared across services
SECRETS_ENCRYPTION_KEY=$SECRETS_ENCRYPTION_KEY
API_BEARER_TOKEN=$API_BEARER_TOKEN
EOF

echo "Wrote $SECRETS_FILE"


