#!/usr/bin/env bash
# MySQL/MariaDB backup with rotation + optional S3 upload (RPO driver). Wire into cron.
# Env overrides: DB_HOST DB_PORT DB_USER DB_PASS DB_NAME BACKUP_DIR RETENTION_DAYS S3_BUCKET
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-gamecloud}"
DB_PASS="${DB_PASS:-gamecloud_pw}"
DB_NAME="${DB_NAME:-gamecloud}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/gamecloud}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BUCKET:-}"   # optional, e.g. s3://gamecloud-backups

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
FILE="$BACKUP_DIR/${DB_NAME}-${STAMP}.sql.gz"

echo "[backup] dumping ${DB_NAME} -> ${FILE}"
mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" \
  --single-transaction --routines --triggers "$DB_NAME" | gzip > "$FILE"

echo "[backup] pruning dumps older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime +"$RETENTION_DAYS" -delete

if [[ -n "$S3_BUCKET" ]]; then
  echo "[backup] uploading to ${S3_BUCKET} (cross-region durability)"
  aws s3 cp "$FILE" "${S3_BUCKET}/" --only-show-errors
fi

echo "[backup] done: $(du -h "$FILE" | cut -f1) ${FILE}"
