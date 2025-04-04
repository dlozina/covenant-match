How NGINX Routes to Service Replicas in Docker Swarm
When you're running with replicas: 2 in your Docker Compose file for the frontend and backend services, Docker Swarm creates an internal load balancer and DNS resolution. Here's how it works:
1. Service Discovery

In Docker Swarm, each service name (like "frontend" or "backend") automatically becomes a DNS entry
When NGINX uses proxy_pass http://frontend:3000, it's actually hitting a virtual IP address that Docker Swarm manages
This virtual IP (VIP) represents the service, not individual containers

2. Load Balancing

When a request arrives at this VIP, Swarm's built-in load balancer distributes it across all healthy replicas
The load balancing is done at the transport layer (L4) using IPVS (IP Virtual Server)
By default, it uses a round-robin algorithm to distribute requests

3. What You Don't Need to Change

In your NGINX configuration, you don't need to list individual replicas
You don't need to update the configuration when scaling services up or down
The service discovery is automatic and handled by Docker Swarm