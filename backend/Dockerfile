# Stage 1: Development environment
FROM rust:1.82-slim as development

WORKDIR /app

# Install development dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev curl && \
    cargo install cargo-watch && \
    rm -rf /var/lib/apt/lists/*

# Copy the entire application -> We are using local mounts for the backend
#COPY . .

# Build the application to cache dependencies -> We are using local mounts for the backend, build is done in the docker-compose.dev.yml file
#RUN cargo build --bin covenant-match-backend

# Set environment variables
ENV RUST_LOG=debug
ENV RUST_ENV=docker
EXPOSE 8080

# Development command
CMD ["cargo", "watch", "-x", "run"]

# Stage 2: Builder
FROM rust:1.82-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Copy Cargo configuration files
COPY Cargo.toml Cargo.lock* ./

# Copy the application source
COPY . .

# Build the application in release mode
RUN cargo build --release

# Stage 3: Production environment
FROM debian:bookworm-slim as production

WORKDIR /app

# Install runtime dependencies with correct libssl version
RUN apt-get update && \
    apt-get install -y pkg-config libssl3 ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# Copy the built binary from the builder stage
COPY --from=builder /app/target/release/covenant-match-backend .

# Copy configuration files
COPY --from=builder /app/config ./config

# Set environment variables
ENV RUST_LOG=info
ENV RUST_ENV=docker

EXPOSE 8080

# Set the entrypoint
CMD ["./covenant-match-backend"]
