#!/usr/bin/env bash
# =============================================================
# HerdSync V2 — Automated PostgreSQL Backup Script
# Run via cron on the Lesotho Government Data Center server:
#   0 2 * * * /opt/herdsync/deployment/backup.sh >> /var/log/herdsync-backup.log 2>&1
# =============================================================
set -euo pipefail

BACKUP_DIR="/var/backups/herdsync"
RETENTION_DAYS=30
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/herdsync_${TIMESTAMP}.sql.gz"

# Load secrets from .env (same directory as this script)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  export $(grep -v '^#' "${SCRIPT_DIR}/.env" | xargs)
fi

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD not set}"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date)] Starting backup: ${BACKUP_FILE}"

# Dump the database
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" exec -T db \
  pg_dump -U postgres -Fc postgres \
  | gzip > "${BACKUP_FILE}"

chmod 600 "${BACKUP_FILE}"
echo "[$(date)] Backup complete: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Remove backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -name "herdsync_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date)] Pruned backups older than ${RETENTION_DAYS} days"

# Verify backup integrity
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "[$(date)] Integrity check passed"
else
  echo "[$(date)] ERROR: Backup integrity check failed!" >&2
  exit 1
fi
