#!/usr/bin/env bash
# Deploy ONLY Vite dist/ as an orphan gh-pages branch.
# Never run from a dirty tree that would include node_modules.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
npm run build:pages
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT
cp -a dist/. "$TMP/"
touch "$TMP/.nojekyll"
# Sanity: refuse if node_modules sneaks in
if [[ -e "$TMP/node_modules" ]]; then
  echo "Refusing deploy: node_modules present in staging dir" >&2
  exit 1
fi
COUNT="$(find "$TMP" -type f | wc -l | tr -d ' ')"
echo "Staging $COUNT files from dist/"
cd "$TMP"
git init
git checkout -b gh-pages
git add -A
git -c user.email="bot@local" -c user.name="Pages Deploy" commit -m "Pages deploy ($(date -u +%Y-%m-%d))"
git remote add origin "$(cd "$ROOT" && git remote get-url origin)"
git push -f origin gh-pages
echo "Pushed orphan gh-pages ($COUNT files)"
