# Stage 1: Development environment
FROM rust:1.72-slim as development

WORKDIR /app

# Install development dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev && \
    cargo install cargo-watch && \
    rm -rf /var/lib/apt/lists/*

# Copy Cargo configuration files
COPY Cargo.toml Cargo.lock* ./

# Create a dummy source file to cache dependencies
RUN mkdir -p src && \
    echo "fn main() {}" > src/main.rs && \
    cargo build && \
    rm -rf src

# Set environment variables
ENV RUST_LOG=debug
EXPOSE 8080

# Development command will be provided in docker-compose

# Stage 2: Builder
FROM rust:1.72-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy Cargo configuration files
COPY Cargo.toml Cargo.lock* ./

# Copy the application source
COPY . .

# Build the application in release mode
RUN cargo build --release

# Stage 3: Production environment
FROM debian:bullseye-slim as production

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y pkg-config libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copy the built binary from the builder stage
COPY --from=builder /app/target/release/covenant-match-backend .

# Set environment variables
ENV RUST_LOG=info

EXPOSE 8080

# Set the entrypoint
CMD ["./covenant-match-backend"]
