FROM node:18-alpine

# Build argument for environment
ARG ENVIRONMENT=prod

# Set environment variable from build arg
ENV NODE_ENV=${ENVIRONMENT}

# Create app directory
WORKDIR /usr/src/app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies and nodemon for development
RUN npm install && \
    if [ "$ENVIRONMENT" = "dev" ]; then \
      npm install -g nodemon; \
    fi

# In development, we'll mount the source code as a volume
# For production, copy the application code
COPY . .

# Set environment variable to pass to the app
ENV APP_ENVIRONMENT=${ENVIRONMENT}

# Expose the port the app runs on
EXPOSE 8000

# Use script defined in package.json
CMD ["npm", "start"]