#!/bin/bash
set -e

echo "Rebuilding CovenantMatch containers..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build $@
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
