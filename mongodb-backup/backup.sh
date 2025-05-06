#!/bin/bash
set -e

# Backup timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_NAME="mongodb_backup_$TIMESTAMP"

# Get retention days (default to 7 if not set)
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Create backup (no auth needed)
mongodump --host=mongodb --port=27017 --out=$BACKUP_DIR/$BACKUP_NAME

# Compress backup
tar -czf $BACKUP_DIR/$BACKUP_NAME.tar.gz $BACKUP_DIR/$BACKUP_NAME
rm -rf $BACKUP_DIR/$BACKUP_NAME

# Log successful backup
echo "Backup completed: $BACKUP_NAME.tar.gz at $(date)" >> $BACKUP_DIR/backup.log

# Rotate old backups based on configurable retention period
find $BACKUP_DIR -name "mongodb_backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete