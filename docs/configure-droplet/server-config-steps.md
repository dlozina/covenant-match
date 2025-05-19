# Configure Droplet

## Server Information

### Development Server
- **Location**: Europe Frankfurt
- **Specs**: 1 CPU, 1GB RAM, 25GB SSD
- **SSH**: `ssh root@161.35.67.181`

### Production Server
- **Location**: Europe Frankfurt
- **Specs**: 4 CPU, 8GB RAM, 160GB SSD
- **SSH**: `ssh root@139.59.151.158`

## Step by Step Guide

### 1. System Setup

#### Update package index
```bash
apt update
```

#### Install required packages
```bash
apt install -y apt-transport-https ca-certificates curl software-properties-common
```

### 2. Docker Installation

#### Add Docker's official GPG key
```bash
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
```

#### Set up the Docker repository
```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
```

#### Update package index again
```bash
apt update
```

#### Install Docker Engine
```bash
apt install -y docker-ce docker-ce-cli containerd.io
```

#### Install Docker Compose
```bash
apt install -y docker-compose-plugin
```

#### Verify installations
```bash
docker --version
docker compose version
```

### 3. Application Setup

#### Create application directory
```bash
mkdir -p /opt/myapp
cd /opt/myapp
```

### 4. GitHub Container Registry Setup

#### Login to GitHub Container Registry
```bash
echo 'YOUR_GITHUB_TOKEN' | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

> **Note**: Replace `YOUR_GITHUB_TOKEN` with a personal access token with appropriate permissions and `YOUR_GITHUB_USERNAME` with your GitHub username.

#### Example pull command
```bash
docker pull ghcr.io/dlozina/covenant-match-backend:dev
```

### 5. Firewall Configuration

#### Install UFW
```bash
apt install -y ufw
```

#### Configure firewall rules
```bash
# Allow SSH connections
ufw allow 22/tcp

# Allow HTTP and HTTPS traffic
ufw allow 80/tcp
ufw allow 443/tcp

# Enable the firewall
ufw enable
```

### 6. SSL Certificate Setup

We use Cloudflare for SSL certificates. The certificates can be created with Cloudflare UI and then copied to the server. (NGINX config is already set up to use it, it needs to be copied in the right folder on the droplet - server)

#### Copy from server to local
```bash
# Copy SSL directory
scp -r root@139.59.151.158:/etc/nginx/ssl ./ssl

# Copy individual certificate files
scp root@139.59.151.158:/opt/myapp/ssl/certificate.pem ~/Downloads/
scp root@139.59.151.158:/opt/myapp/ssl/private.key ~/Downloads/
```

#### Copy to another server
```bash
scp ~/Downloads/certificate.pem ~/Downloads/private.key root@161.35.67.181:/opt/myapp/ssl/
```

### 7. Docker Swarm Setup

#### Initialize the docker swarm
```bash
# Using hostname
docker swarm init --advertise-addr $(hostname -i)

# Or using specific IP
docker swarm init --advertise-addr 161.35.67.181
```

Successful response will look like:
```
Swarm initialized: current node (sw7yvatr36zrj3gyd4rdb48k8) is now a manager.

To add a worker to this swarm, run the following command:
    docker swarm join --token SWMTKN-1-0llrdyd59jxnrttfbuifgu128zyuohxy302ot4d0dy7bf3u85o-elor10i02jnscl76i5tmjxlju 161.35.67.181:2377

To add a manager to this swarm, run 'docker swarm join-token manager' and follow the instructions.
```

### 8. Application Secrets

The application requires the following secrets:
- `mongodb_uri`
- `jwt_secret`
- `turnstile_secret_key`
- `mailersend_api_key`

## Docker Swarm Architecture

### Manager Nodes
Managers are responsible for the control plane of the swarm, handling:
- **Cluster management**: Maintains cluster state, schedules services, and makes global decisions
- **Orchestration**: Assigns tasks to worker nodes based on placement constraints
- **Service management**: Handles service creation, scaling, updates, and removal
- **Raft consensus**: Uses Raft consensus algorithm for consistent state (requires odd number of managers)
- **API endpoints**: Exposes Docker Swarm API for cluster management

### Worker Nodes
Workers are the production horses of your swarm:
- **Container execution**: Runs the actual application containers (tasks)
- **Resource provision**: Contributes CPU, memory, network, and storage resources
- **Status reporting**: Reports health and task status to manager nodes
- **Scale out capacity**: Enables horizontal scaling of applications

### Key Differences
- **Responsibility**: Managers make decisions; workers execute tasks
- **Number**: Fewer managers (3-5) and many workers
- **Failure impact**: Manager failure affects cluster operations; worker failure only affects local tasks
- **Resource requirements**: Managers need stable networking and typically less workload pressure













