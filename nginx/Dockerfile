FROM nginx:alpine

# Remove default config to avoid conflicts
RUN rm /etc/nginx/conf.d/default.conf

# Install dig and other networking tools for troubleshooting
RUN apk add --no-cache bind-tools iputils

COPY nginx.conf /etc/nginx/nginx.conf
COPY sites/ /etc/nginx/sites/

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443

# Test DNS resolution before starting Nginx
CMD ["sh", "-c", "echo 'Testing DNS resolution:' && ping -c 1 frontend || echo 'Cannot ping frontend' && ping -c 1 backend || echo 'Cannot ping backend' && nginx -g 'daemon off;'"]