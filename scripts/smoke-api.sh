#!/usr/bin/env bash
# Contrôle l'API en ligne : une route critique en panne fait échouer le déploiement.
set -euo pipefail

get() {
  curl --fail --silent --show-error --retry 5 --retry-all-errors --retry-delay 5 --max-time 20 "$1"
}

get "$API_URL/health" | grep '"status":"ok"'
get "$API_URL/wishlist" > /dev/null

echo "API en bonne santé : /health et /wishlist répondent."
