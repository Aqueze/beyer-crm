#!/bin/bash
# BeyCRM Database Backup Script
# Run via cron: 0 2 * * * /opt/beyercrm/scripts/backup.sh

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/beyercrm/backups"
CONTAINER_NAME="beyercrm-db"
DB_NAME="beyercrm"
DB_USER="beyercrm"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Perform backup
echo "[$(date)] Starting database backup..."
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" -Fc -f "/backups/beyercrm_${TIMESTAMP}.dump"

# Copy backup to host
docker cp "${CONTAINER_NAME}:/backups/beyercrm_${TIMESTAMP}.dump" "${BACKUP_DIR}/beyercrm_${TIMESTAMP}.dump"

# Create latest symlink
ln -sf "${BACKUP_DIR}/beyercrm_${TIMESTAMP}.dump" "${BACKUP_DIR}/beyercrm_latest.dump"

# Remove old backups (older than RETENTION_DAYS)
find "${BACKUP_DIR}" -name "beyercrm_*.dump" -mtime +${RETENTION_DAYS} -delete

# Cleanup in container
docker exec "${CONTAINER_NAME}" rm -f "/backups/beyercrm_${TIMESTAMP}.dump"

echo "[$(date)] Backup completed: beyercrm_${TIMESTAMP}.dump"
