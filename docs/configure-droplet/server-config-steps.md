# Configure Droplet

Select the droplet you want to configure.
We have chosen Europe Frankfurt as a location for the server.

Operating system: Ubuntu 24.10 x64

Development server:
1 CPU
1GB RAM
25GB SSD

ssh root@161.35.67.181

Production server:
4 CPU
8GB RAM
160GB SSD

ssh root@139.59.151.158

# Step by step guide

## Update package index
apt update

## Install required packages
apt install -y apt-transport-https ca-certificates curl software-properties-common

## Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

## Set up the Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

## Update package index again
apt update

## Install Docker Engine
apt install -y docker-ce docker-ce-cli containerd.io

## Install Docker Compose
apt install -y docker-compose-plugin

# Verify installations
docker --version
docker compose version

## Create a directory for your application
mkdir -p /opt/myapp
cd /opt/myapp

## Set Up Docker to Pull from GitHub Container Registry

Login to GitHub Container Registry:

echo 'YOUR_GITHUB_TOKEN' | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

Replace `YOUR_GITHUB_TOKEN` with a personal access token with appropriate permissions and `YOUR_GITHUB_USERNAME` with your GitHub username.

You can now pull images from GitHub Container Registry!
Example:

```
docker pull ghcr.io/dlozina/covenant-match-backend:dev
```


## Set Up Firewall Rules

### Install UFW (Uncomplicated Firewall) if not already installed
apt install -y ufw

### Allow SSH connections
ufw allow 22/tcp

### Allow HTTP and HTTPS traffic
ufw allow 80/tcp
ufw allow 443/tcp

### Enable the firewall
ufw enable


## Set Up Nginx -> SSL Certificate

We use Cloudflare for SSL certificates. It can be created with Cloudflare UI and then copied to the server. (NGINX config is already set up to use it, it needs to be copied in the right folder on the droplet - server)

## Copy from server to local

```
scp -r root@139.59.151.158:/etc/nginx/ssl ./ssl
```

You can copy files from a remote server to your local machine securely using SCP (Secure Copy Protocol) or SFTP (SSH File Transfer Protocol). Both methods use SSH for secure file transfer.
Here's how to copy those SSL certificate files using SCP:
From your local machine, open a terminal and run:

```
scp root@139.59.151.158:/opt/myapp/ssl/certificate.pem ~/Downloads/
```

```
scp root@139.59.151.158:/opt/myapp/ssl/private.key ~/Downloads/
```

## Copy to another server

```
scp ~/Downloads/certificate.pem ~/Downloads/private.key root@161.35.67.181:/opt/myapp/ssl/
```

## Initialize the docker swarm

```
docker swarm init --advertise-addr $(hostname -i)
```

or

```
docker swarm init --advertise-addr 161.35.67.181
```

successful response:

```
Swarm initialized: current node (sw7yvatr36zrj3gyd4rdb48k8) is now a manager.

To add a worker to this swarm, run the following command:

    docker swarm join --token SWMTKN-1-0llrdyd59jxnrttfbuifgu128zyuohxy302ot4d0dy7bf3u85o-elor10i02jnscl76i5tmjxlju 161.35.67.181:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```

## Set up the secrets for the application
In our application we have 3 secrets:
- mongodb_uri
- jwt_secret
- turnstile_secret_key
- mailersend_api_key

## Docker swarm explanation
Docker Swarm uses a manager-worker architecture for container orchestration. Let me explain these roles in detail:
Manager Nodes
Managers are responsible for the control plane of the swarm, handling:

Cluster management: They maintain the cluster state, schedule services, and make global decisions about the swarm.
Orchestration: Managers assign tasks to worker nodes based on placement constraints and resource availability.
Service management: They handle service creation, scaling, updates, and removal.
Raft consensus: Multiple manager nodes use the Raft consensus algorithm to maintain a consistent state across the swarm. This requires an odd number of managers (3, 5, 7) for fault tolerance.
API endpoints: They expose the Docker Swarm API for cluster management operations.

Manager nodes can also run containers like workers, but in production environments, they're often dedicated to management tasks only.
Worker Nodes
Workers are the production horses of your swarm:

Container execution: They run the actual application containers (tasks).
Resource provision: They contribute their CPU, memory, network, and storage resources to the swarm.
Status reporting: They report their health and the status of their running tasks to manager nodes.
Scale out capacity: Workers allow you to horizontally scale your applications by adding more nodes.

Workers cannot perform any cluster management functions - they can't create services, schedule tasks, or participate in the raft consensus.
Key Differences

Responsibility: Managers make decisions; workers execute tasks
Number: Generally fewer managers (3-5 for most deployments) and many workers
Failure impact: Manager failure can affect cluster operations; worker failure only affects tasks running on that node
Resource requirements: Managers need more stable networking and typically less workload pressure

In your output, you've successfully initialized a swarm with one manager node. The command to add a worker provides a token that allows nodes to securely join your swarm in the worker role.
Would you like me to explain more about how to manage your swarm, such as adding more managers or configuring high availability?RetryClaude can make mistakes. Please double-check responses. 3.7 Sonnet













