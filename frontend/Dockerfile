# Stage 1: Development environment
FROM node:20-alpine AS development
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Set development environment
ENV NODE_ENV=development
EXPOSE 3000

# Use the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application code
COPY . .

# Environment variables that need to be available at build time
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_TESTER_MODE
ARG NEXT_PUBLIC_TESTER_PASSWORD
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_TESTER_MODE=${NEXT_PUBLIC_TESTER_MODE}
ENV NEXT_PUBLIC_TESTER_PASSWORD=${NEXT_PUBLIC_TESTER_PASSWORD}
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production environment
FROM node:20-alpine AS production
WORKDIR /app

# Copy package files and install dependencies for production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy the built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create fallback entrypoint in case of issues
RUN echo '#!/bin/sh\nif [ -f "$NEXT_PUBLIC_TESTER_PASSWORD_FILE" ]; then\n  export NEXT_PUBLIC_TESTER_PASSWORD=$(cat $NEXT_PUBLIC_TESTER_PASSWORD_FILE)\n  echo "Loaded tester password from file: $NEXT_PUBLIC_TESTER_PASSWORD_FILE"\nfi\nexec "$@"' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Runtime environment variables 
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_TESTER_MODE=${NEXT_PUBLIC_TESTER_MODE}
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=${NEXT_PUBLIC_RECAPTCHA_SITE_KEY}

EXPOSE 3000

# Use the entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["npm", "start"]
