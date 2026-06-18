#!/usr/bin/env bash
# Restore a MySQL/MariaDB dump produced by backup-db.sh (RTO driver).
#   ./restore-db.sh /var/backups/gamecloud/gamecloud-20260618-023000.sql.gz
set -euo pipefail

FILE="${1:?usage: restore-db.sh <backup.sql.gz>}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-gamecloud}"
DB_PASS="${DB_PASS:-gamecloud_pw}"
DB_NAME="${DB_NAME:-gamecloud}"

echo "[restore] restoring ${FILE} -> ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
gunzip -c "$FILE" | mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
echo "[restore] done"
