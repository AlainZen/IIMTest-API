#!/usr/bin/env bash
# Démarre l'API construite, appelle chaque route et vérifie que les données survivent à un redémarrage.
# Attend DATABASE_URL, avec la table déjà créée. À ne lancer que sur une base de test.
set -euo pipefail

URL="http://localhost:${PORT:-3001}"
API_PID=""

start_api() {
  node dist/index.js &
  API_PID=$!
  curl --fail --silent --show-error --retry 20 --retry-connrefused --retry-delay 1 "$URL/health"
  echo
}

stop_api() {
  if [ -n "$API_PID" ]; then
    kill "$API_PID"
    wait "$API_PID" || true
    API_PID=""
  fi
}

trap stop_api EXIT

start_api

ID=$(curl --fail --silent --show-error -X POST -H 'Content-Type: application/json' \
  -d '{"pokemonId":25,"name":"Pikachu","types":["electric"],"image":null}' "$URL/wishlist" |
  grep -o '"id":[0-9]*' | cut -d: -f2)
echo "Pikachu ajouté avec l'id $ID"

curl --fail --silent --show-error "$URL/wishlist" | grep Pikachu

curl --fail --silent --show-error -X POST "$URL/wishlist/$ID/like" | grep '"likes":1'
echo "Pikachu a reçu un like"

stop_api
echo "API arrêtée, redémarrage"
start_api

curl --fail --silent --show-error "$URL/wishlist" | grep Pikachu | grep '"likes":1'
echo "Pikachu et son like sont toujours là après le redémarrage"

curl --fail --silent --show-error -X DELETE "$URL/wishlist/$ID"
curl --fail --silent --show-error "$URL/wishlist" | grep -x '\[\]'
echo "Toutes les routes répondent"
