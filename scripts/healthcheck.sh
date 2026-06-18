#!/usr/bin/env bash
# Liveness probe for the GameCloud API — wire into cron for self-healing/alerting.
set -uo pipefail

URL="${1:-http://127.0.0.1:8000/health}"
if curl -fsS --max-time 5 "$URL" >/dev/null 2>&1; then
  echo "[health] $(date -u +%H:%M:%S) OK $URL"
  exit 0
fi

echo "[health] $(date -u +%H:%M:%S) FAIL $URL — attempting restart"
# docker stack: restart just the backend; native: restart the systemd unit
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q gamecloud-backend; then
  docker restart gamecloud-backend
elif systemctl list-units --type=service 2>/dev/null | grep -q gamecloud-backend; then
  sudo systemctl restart gamecloud-backend
fi
exit 1
