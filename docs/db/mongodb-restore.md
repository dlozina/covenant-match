# MongoDB Restore

## Overview

The MongoDB restore process is used to restore a database from a backup. This process involves connecting to the backup container and using the `mongorestore` command to restore data from backup files into the running MongoDB database.

## Prerequisites

- Access to the backup container
- Backup files available in the backup container
- MongoDB container running and accessible via Docker network

## Process

### 1. Connect to the Backup Container

```bash
docker exec -it covenant-match-mongodb-backup-1 bash
```

### 2. Extract the Backup Archive

```bash
cd /backups
tar -xzf mongodb_backup_20250506_110502.tar.gz
```

### 3. Restore the Database

```bash
mongorestore --host mongodb --port 27017 --drop /backups/backups/mongodb_backup_20250506_110502
```

> **Note**: The `--drop` flag will remove existing collections before importing (prevents duplicate data).

## Important Notes

- All commands are executed from within the backup container
- The `--host mongodb` parameter in the `mongorestore` command connects to the MongoDB container using the service name "mongodb" in the Docker network
- The backup container is used because it:
  - Has MongoDB tools pre-installed
  - Has access to both the backup files and the MongoDB network

## Best Practices for Restoration

### Test in Staging Environment
- Test the restoration process in a staging environment first
- Verify data integrity and application functionality before proceeding to production

### Plan for Downtime
- Schedule restoration during maintenance windows
- Notify users of potential service disruption
- Consider impact on business operations

### Backup Current Data
- Take a snapshot of current data before starting restoration
- Maintain a fallback option in case of restoration issues

### Post-Restoration Verification
- Run validation queries to confirm data integrity
- Verify application functionality with restored data
- Monitor system performance after restoration

## Updating Backup Configuration

You can update the backup configuration without restarting your entire stack. There are two main approaches:

### Option 1: Run Backup Service Independently

```bash
docker compose -f docker-compose.dev.yml up -d --no-deps --build mongodb-backup
```

This command will:
- Rebuild the mongodb-backup service with any changes
- Only restart this service, leaving others untouched
- Apply your new configuration immediately

### Option 2: Update Without Rebuilding

1. Stop only the backup container:
```bash
docker compose -f docker-compose.dev.yml stop mongodb-backup
```

2. Update environment variables and restart just that service:
```bash
docker compose -f docker-compose.dev.yml up -d --no-deps mongodb-backup
```

### Docker Compose Configuration

Edit the environment section in your docker-compose file:

```yaml
mongodb-backup:
  environment:
    - BACKUP_SCHEDULE=0 4 * * *    # Change to 4AM
    - BACKUP_RETENTION_DAYS=14     # Keep for 14 days
```


