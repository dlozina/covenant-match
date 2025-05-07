# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🌟 Project Overview

Covenant Match is a matchmaking application for Nightreign players. It helps players find teammates, create game sessions, and track statistics.

### Key Features

- User profiles and matchmaking
- Game session management with password protection
- Statistics tracking with consensus verification
- Real-time updates and notifications

## 🔧 Development Setup

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (for local frontend development)
- [Rust](https://www.rust-lang.org/tools/install) (for local backend development)

### Initial Setup

1. Clone the repository
2. Run the setup script (installs dependencies):

```bash
./scripts/setup.sh
```

### Starting the Development Environment

```bash
./scripts/dev.sh
```

This starts:
- Frontend at http://localhost:3000
- Backend at http://localhost:8080
- MongoDB at localhost:27018

### Rebuilding Containers

After changes to Dockerfiles or dependencies:

```bash
# Rebuild all containers
./scripts/rebuild.sh

# Rebuild specific services
./scripts/rebuild.sh frontend backend
```

## 🧪 Common Development Commands

### Frontend (Next.js)

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

### Backend (Rust)

```bash
# Navigate to backend directory
cd backend

# Run with cargo-watch (automatically recompiles on changes)
cargo watch -x run

# Run tests
cargo test

# Build for production
cargo build --release
```

### Docker Compose Commands

```bash
# Start development environment
docker compose -f docker-compose.dev.yml up

# Rebuild specific container
docker compose -f docker-compose.dev.yml build <service-name>

# Stop all containers
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Access MongoDB shell
docker exec -it covenant-match-mongodb-1 mongosh
```

## 🏗 Architecture Overview

### System Components

The application follows a standard three-tier architecture:

```
+------------------+
|   Load Balancer  |
|      (Nginx)     |
+--------+---------+
         |
+---------+---------+
|                   |
+--------+--------+ +---------+--------+
| Frontend Server | | Backend Server   |
|   (Next.js SSR) | |   (Rust/Actix)   |
+------------------+ +---------+--------+
                              |
                    +---------v---------+
                    |     MongoDB       |
                    |    (Database)     |
                    +-------------------+
```

### Tech Stack

#### Frontend
- Next.js 15.x (App Router)
- Tailwind CSS
- Shadcn UI (Radix UI components)
- TypeScript
- React Query & SWR for data fetching
- React Hook Form for form handling

#### Backend
- Rust with Actix-web framework
- MongoDB for database
- JWT for authentication
- EventSource API for real-time updates

#### Infrastructure
- Docker and Docker Compose
- Nginx for load balancing and routing
- MongoDB for database
- Automated MongoDB backups

## 📁 Project Structure

```
covenant-match/
├── frontend/               # Next.js application with shadcn-ui
│   ├── app/                # Next.js App Router
│   ├── components/         # React components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and helpers
│   ├── utils/              # API client functions
│   └── types/              # TypeScript type definitions
├── backend/                # Rust Actix-web backend
│   ├── src/                # Backend source code
│   │   ├── main.rs         # Application entry point
│   │   ├── routes/         # API route handlers
│   │   ├── models/         # Data models
│   │   ├── services/       # Business logic
│   │   ├── repository/     # Database access layer
│   │   ├── middleware/     # Custom middlewares
│   │   └── utils/          # Utility functions
│   └── config/             # Configuration files
├── nginx/                  # Nginx configuration
├── mongodb-backup/         # MongoDB backup configuration
├── docker-compose.yml      # Production configuration
├── docker-compose.dev.yml  # Development configuration
└── scripts/                # Utility scripts
```

## 🔄 Key Features and Implementation

### Authentication

Authentication is managed via JWT tokens. The backend generates tokens upon successful login, and the frontend stores them for subsequent requests.

### Real-time Updates

The application uses Server-Sent Events (SSE) via the EventSource API for real-time updates:
- Session status changes
- Player join/leave events
- Chat messages
- Game results reporting

### Session Management

Sessions are the core feature of the application:
- Created by host players
- Can be public or password-protected
- Track player participation and game outcomes
- Support real-time chat

### Database Structure

MongoDB is used as the primary database:
- Collections include users, sessions, game_data, news, and more
- Automated backups via the mongodb-backup container

## ⚙️ Configuration

### Backend Configuration

The backend uses a layered configuration system:
1. Base configuration in `default.toml`
2. Environment-specific configuration based on `RUST_ENV`
3. Local overrides in `local.toml` (optional)
4. Environment variables with `CONFIG__` prefix

Example of environment variable format:
- `CONFIG_DATABASE__URL` sets `database.url`
- `CONFIG_SERVER__WORKERS` sets `server.workers`

### Frontend Configuration

Environment variables control frontend behavior:
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - Cloudflare Turnstile key
- `NEXT_PUBLIC_TESTER_MODE` - Enable tester mode for development

## 🗄️ Database Management

For MongoDB operations:

```bash
# Access MongoDB shell
docker exec -it covenant-match-mongodb-1 mongosh

# Show all databases
show dbs

# Connect to database
use covenant_match

# List collections
show collections

# Query documents
db.users.find({ username: "exampleUser" })
```

## 📝 MongoDB Backup and Restore

Automated backups are configured via the mongodb-backup container. Backups are performed daily and stored in a persistent volume.

## 🚀 Deployment

Deployment is managed via the deployment script:

```bash
./scripts/deploy.sh
```

## 📚 Additional Resources

- [EventSource API Documentation](docs/tech/EventSourceAPI.md)
- [Backend Configuration Guide](docs/deployment/backend-config.md)
- [MongoDB Command Reference](docs/db/mongose-commands.md)