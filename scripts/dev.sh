#!/bin/bash
set -e

echo "Starting CovenantMatch development environment..."
docker compose -f docker-compose.dev.yml up
