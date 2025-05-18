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

Preview images:
```
docker pull ghcr.io/dlozina/covenant-match-frontend:preview 
docker pull ghcr.io/dlozina/covenant-match-backend:preview 
docker pull ghcr.io/dlozina/covenant-match-nginx:preview
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

Watch the update:

```
watch -n 1 "docker service ps covenant-match_frontend --no-trunc"
```

Cool stuff, check resource usage:

```
docker stats
```

```
watch -n 1 "docker stats"
```

There are 2 approaches:

1. Update the image tag in the docker-compose.yml file
2. Run docker `service update --image ghcr.io/dlozina/covenant-match-frontend:latest covenant-match_frontend`





