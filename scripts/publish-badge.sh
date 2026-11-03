#!/usr/bin/env bash
# Publie le badge de couverture sur la branche badges, séparée du code.
set -euo pipefail

directory=$(mktemp -d)
cp coverage/badge/coverage.svg "$directory/"
cd "$directory"

git init --quiet --initial-branch=badges
git add coverage.svg
git -c user.name='github-actions[bot]' \
  -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
  commit --quiet --message 'Mise à jour du badge de couverture'
git push --quiet --force "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" badges
