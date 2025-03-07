FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY sites/ /etc/nginx/sites/

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
