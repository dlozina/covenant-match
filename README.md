# CovenantMatch

A matchmaking application for Nightreign players. Find teammates, create game sessions, and track your statistics.

## Features

- User profiles and matchmaking
- Game session management with password protection
- Statistics tracking with consensus verification
- Real-time updates and notifications

## Project Structure

```
covenant-match/
├── frontend/               # Next.js application with shadcn-ui
├── backend/                # Rust Actix-web backend
├── nginx/                  # Nginx configuration
├── mongodb/                # MongoDB initialization
├── docker-compose.yml      # Production configuration
├── docker-compose.dev.yml  # Development configuration
└── scripts/                # Utility scripts
```

## Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/) (for local frontend development)
- [Rust](https://www.rust-lang.org/tools/install) (for local backend development)

### Setup

1. Clone the repository
2. Run the setup script:

```bash
./scripts/setup.sh
```

### Running the Development Environment

Start the development environment with:

```bash
./scripts/dev.sh
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:8080
- MongoDB at localhost:27017

### Rebuilding Containers

If you make changes to the Dockerfile or dependencies:

```bash
./scripts/rebuild.sh
```

You can also rebuild specific services:

```bash
./scripts/rebuild.sh frontend backend
```

## Production Deployment

To deploy to production:

```bash
./scripts/deploy.sh
```

## File structure

```
covenant-match/
├── .github/                    # GitHub Actions and CI/CD configurations
│   └── workflows/              # CI/CD workflow definitions
├── .gitignore                  # Git ignore file
├── README.md                   # Project documentation
├── docker-compose.yml          # Main docker-compose for the entire stack
├── docker-compose.dev.yml      # Development docker-compose overrides
├── frontend/                   # Next.js frontend application
│   ├── Dockerfile              # Frontend build instructions
│   ├── .dockerignore           # Docker ignore for frontend
│   ├── package.json            # NPM dependencies
│   ├── next.config.js          # Next.js configuration
│   ├── public/                 # Static assets
│   ├── src/                    # Frontend source code
│   │   ├── app/                # Next.js App Router
│   │   ├── components/         # React components
│   │   │   ├── ui/             # Radix UI components
│   │   │   ├── layout/         # Layout components
│   │   │   ├── forms/          # Form components
│   │   │   └── session/        # Session-related components
│   │   ├── lib/                # Utilities and helpers
│   │   ├── hooks/              # Custom React hooks
│   │   ├── api/                # API client functions
│   │   ├── types/              # TypeScript type definitions
│   │   └── styles/             # Global styles
│   └── tests/                  # Frontend tests
├── backend/                    # Rust Actix-web backend application
│   ├── Dockerfile              # Backend build instructions
│   ├── .dockerignore           # Docker ignore for backend
│   ├── Cargo.toml              # Rust dependencies
│   ├── Cargo.lock              # Locked dependencies
│   ├── src/                    # Backend source code
│   │   ├── main.rs             # Application entry point
│   │   ├── config.rs           # Configuration handling
│   │   ├── routes/             # API route handlers
│   │   ├── models/             # Data models
│   │   ├── services/           # Business logic services
│   │   ├── repository/         # Database access layer
│   │   ├── middleware/         # Custom middlewares
│   │   └── utils/              # Utility functions
│   └── tests/                  # Backend tests
├── nginx/                      # Nginx configuration
│   ├── Dockerfile              # Nginx container setup
│   ├── nginx.conf              # Base configuration
│   ├── sites/                  # Site configurations
│   │   └── covenant-match.conf # App-specific configuration
│   └── ssl/                    # SSL certificates (gitignored)
├── mongodb/                    # MongoDB configuration
│   ├── init-mongo.js           # Initial database setup
│   └── mongod.conf             # MongoDB configuration
├── scripts/                    # Utility scripts
│   ├── setup.sh                # Project setup script
│   ├── dev.sh                  # Development environment script
│   └── deploy.sh               # Deployment script
└── docs/                       # Additional documentation
    ├── api/                    # API documentation
    ├── architecture/           # Architecture diagrams
    └── development/            # Development guidelines
```


## Deployment Components
                  +------------------+
                  |   Load Balancer  |
                  |      (Nginx)     |
                  +--------+---------+
                           |
              +------------+------------+
              |                         |
    +---------v----------+   +---------v---------+
    |  Frontend Server   |   |  Backend Server   |
    |    (Next.js SSR)   |   |    (Rust/Actix)   |
    +--------------------+   +---------+---------+
                                       |
                             +---------v---------+
                             |    MongoDB Atlas  |
                             |    (Database)     |
                             +-------------------+ 

## Docker Compose development commands

Rebuild the nginx container:
```
docker compose -f docker-compose.dev.yml build nginx
```

Rebuild the backend container:
```
docker compose -f docker-compose.dev.yml build backend
```

Rebuild the frontend container:
```
docker compose -f docker-compose.dev.yml build frontend
```

Start the development environment:
```
docker compose -f docker-compose.dev.yml up
```

Stop and restart the development environment:
```
docker compose -f docker-compose.dev.yml down && docker compose -f docker-compose.dev.yml up
```


## License

Copyright (c) 2025 Dino Lozina
All Rights Reserved

This software and associated documentation files (the "Software") are the 
exclusive property of Dino Lozina. The Software is proprietary and confidential.

No part of the Software may be used, copied, modified, distributed, or 
otherwise exploited without the express written permission of Dino Lozina.

