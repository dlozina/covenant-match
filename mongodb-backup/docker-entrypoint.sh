#!/bin/bash

# Default values if not specified
BACKUP_SCHEDULE=${BACKUP_SCHEDULE:-"0 2 * * *"}
BACKUP_RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-7}

# Replace the schedule in the template and create the actual crontab
sed "s|0 2 \* \* \*|${BACKUP_SCHEDULE}|" /etc/cron.d/backup-cron.template > /etc/cron.d/backup-cron

# Export the retention days as an environment variable for the backup script
echo "export BACKUP_RETENTION_DAYS=$BACKUP_RETENTION_DAYS" >> /etc/environment

chmod 0644 /etc/cron.d/backup-cron

# Execute the command passed to docker run
exec "$@" 