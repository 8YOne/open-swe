#!/usr/bin/env bash
set -euo pipefail

# Usage: k8s-destroy-preview.sh <project> <branch>

PROJECT="$1"; shift
BRANCH_RAW="$1"; shift
NAMESPACE="open-swe-${PROJECT}-$(echo "$BRANCH_RAW" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9-' '-')"

kubectl delete namespace "$NAMESPACE" --ignore-not-found
echo "Preview namespace deleted: $NAMESPACE"


