FROM nginx:alpine

# Build argument for environment
ARG ENVIRONMENT=prod

# Removed default config to avoid conflicts
RUN rm /etc/nginx/conf.d/default.conf

# Install dig and other networking tools for troubleshooting
RUN apk add --no-cache bind-tools iputils

COPY nginx.conf /etc/nginx/nginx.conf

# Copy environment-specific config and rename it
COPY sites/covenant-match-${ENVIRONMENT}.conf /etc/nginx/sites/covenant-match.conf

# Create SSL directory only for production
RUN if [ "$ENVIRONMENT" = "prod" ]; then mkdir -p /etc/nginx/ssl; fi

# Set the correct port to expose based on environment
EXPOSE 80 443

# Test DNS resolution before starting Nginx
CMD ["sh", "-c", "echo 'Testing DNS resolution:' && ping -c 1 frontend || echo 'Cannot ping frontend' && ping -c 1 backend || echo 'Cannot ping backend' && nginx -g 'daemon off;'"]