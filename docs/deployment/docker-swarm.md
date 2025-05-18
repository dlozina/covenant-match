# How to deploy to Docker Swarm

## Prerequisites

- A Docker Swarm cluster
- A domain name

1. 
Before the deploy explicity pull images:

```
docker pull ghcr.io/dlozina/covenant-match-frontend:latest 
docker pull ghcr.io/dlozina/covenant-match-backend:latest 
docker pull ghcr.io/dlozina/covenant-match-nginx:latest
docker pull ghcr.io/dlozina/covenant-match-mongodb-backup:latest
```
Remove old images:

```
docker image rm 8272957559d3
```

2. Stop the swarm stack:

```
docker stack rm covenant-match
```

3. Deploy the stack:

```
docker stack deploy -c docker-compose.yml covenant-match
```

4. Check the status of the stack:

```
docker service ls
```

```
docker stack ps covenant-match
```

# How to deploy component when you have a new image without interrupting the service