#!/usr/bin/env bash
# Pull latest + (re)launch the GameCloud stack. Tries the docker compose plugin, then the
# docker-compose v1 binary; falls back to a note for native run.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "[deploy] pulling latest…"
git pull --ff-only 2>/dev/null || echo "[deploy] (not a git checkout or nothing to pull)"

if docker compose version >/dev/null 2>&1; then
  echo "[deploy] docker compose up --build -d"
  docker compose up --build -d
elif command -v docker-compose >/dev/null 2>&1; then
  echo "[deploy] docker-compose up --build -d"
  docker-compose up --build -d
else
  echo "[deploy] no compose tool found."
  echo "         native run:"
  echo "           backend : cd backend && uvicorn main:app --host 0.0.0.0 --port 8000"
  echo "           frontend: cd frontend && npm run build && npm start"
  exit 1
fi

echo "[deploy] up. console http://localhost:3100 · api http://localhost:8000"
