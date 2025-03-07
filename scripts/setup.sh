#!/bin/bash
set -e

echo "Setting up CovenantMatch development environment..."

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Install cargo-watch for backend development
echo "Checking for cargo-watch..."
if ! command -v cargo-watch &> /dev/null
then
    echo "Installing cargo-watch..."
    cargo install cargo-watch
fi

# Create local MongoDB data directory
echo "Creating MongoDB data directory..."
mkdir -p mongodb/data

echo "Setup complete! Run './scripts/dev.sh' to start the development environment."
