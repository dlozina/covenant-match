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

# Command to run in development mode
CMD ["npm", "run", "dev"]

# Stage 2: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application code
COPY . .

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
COPY --from=builder /app/next.config.js ./

# Set production environment
ENV NODE_ENV=production
EXPOSE 3000

# Command to run in production mode
CMD ["npm", "start"]
