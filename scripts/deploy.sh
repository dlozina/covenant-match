#!/bin/bash
set -e

echo "Deploying CovenantMatch to production..."

# Pull latest changes
git pull

# Build and start containers
docker-compose build
docker-compose up -d

echo "Deployment complete!"
