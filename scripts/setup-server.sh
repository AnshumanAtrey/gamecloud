#!/usr/bin/env bash
# One-shot Linux administration for the GameCloud host (Amazon Linux 2023 or Ubuntu).
# Demonstrates: package management, users/groups, file permissions, services (systemctl).
set -euo pipefail

echo "[setup] installing packages…"
if command -v dnf >/dev/null 2>&1; then
  sudo dnf update -y
  sudo dnf install -y docker git nginx mariadb105 cronie
  sudo systemctl enable --now crond
else
  sudo apt-get update -y
  sudo apt-get install -y docker.io git nginx mariadb-client cron
fi
sudo systemctl enable --now docker
sudo systemctl enable --now nginx

echo "[setup] users & groups…"
sudo groupadd -f gamecloud
id gamecloud >/dev/null 2>&1 || sudo useradd -m -g gamecloud -s /bin/bash gamecloud
sudo usermod -aG docker gamecloud || true

echo "[setup] directories & permissions…"
sudo mkdir -p /opt/gamecloud /var/backups/gamecloud /var/log/gamecloud
sudo chown -R gamecloud:gamecloud /opt/gamecloud /var/backups/gamecloud /var/log/gamecloud
sudo chmod 750 /opt/gamecloud /var/backups/gamecloud

echo "[setup] installing nginx site + logrotate…"
sudo cp "$(dirname "$0")/../infra/nginx/gamecloud.conf" /etc/nginx/conf.d/gamecloud.conf
sudo cp "$(dirname "$0")/logrotate-gamecloud" /etc/logrotate.d/gamecloud
sudo nginx -t && sudo systemctl reload nginx

echo "[setup] done. Next: ./scripts/deploy.sh"
