#!/usr/bin/env bash
# Trouve la version à restaurer : le commit demandé, sinon le dernier commit de main dont
# toute la CI et la CD sont passées, en dehors de la version actuellement en ligne.
set -euo pipefail

commit="${REQUESTED_COMMIT:-}"

if [ -z "$commit" ]; then
  commit=$(gh run list --workflow ci.yml --branch main --event push --status success --limit 50 \
    --json headSha --jq '.[].headSha' | grep -vx "$GITHUB_SHA" | head -n 1 || true)
fi

if [ -z "$commit" ]; then
  echo "Aucun déploiement stable à restaurer." >&2
  exit 1
fi

echo "Version à restaurer : $commit"
echo "commit=$commit" >> "$GITHUB_OUTPUT"
