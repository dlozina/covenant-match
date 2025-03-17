# Nightreign Matchmaking App Project Brief

## Project Overview

I'm developing a matchmaking web application for a new game called "Nightreign" from FromSoft. Nightreign is a 3-player game where playing sessions can end in win, draw, or disconnection. The primary purpose of the app is to help players find others to play with, create sessions, and track their game statistics.

## Core Requirements

### User Profiles & Matchmaking

* Users can create personal profiles
* Users can create "Looking For Group" posts when they're online
* Posts include game password that other players can use to join
* The app should matchmake players so they can play the game together

### Game Session Management

* Session host can create a session with password
* Two other players can join the session
* Password is revealed only when all players have joined
* Post is removed from pool of available sessions
* All players confirm when game starts

### Statistics Tracking

* Self-reporting system for game outcomes (win/loss/disconnect)
* Users report results after completing a game
* Statistics track performance with different characters
* Results require majority consensus (2 of 3 players)
* Sessions without consensus within 2 hours are discarded

## User Experience Flow

1. User creates a game session
2. Other players find and join the session
3. When full, password is revealed to all participants
4. Players join the game using the password
5. All players confirm game has started
6. After playing, players report the outcome
7. Players can rate the session experience

## Technical Considerations

### Self-Reporting Integrity

* Design a system that encourages accurate reporting
* Implement consensus verification (majority agreement)
* Avoid excessive friction in the reporting process

### Real-time Features

* Players should see updates without constant manual refreshing
* Host should be notified when players want to join
* Session status updates should be visible to all participants

### Technology Stack

* **Frontend**: Next.js with React + Tailwind and shadcn (https://ui.shadcn.com/)
* **Backend**: Rust with Actix-web for real-time communication
* **Database**: MongoDB
* **Hosting**: Fixed-price VPS solution (DigitalOcean Basic Droplet)

### Infrastructure & Scaling

* Starting with ~$5-6/month VPS for a hobby project
* Vertical scaling first when user base grows
* Service separation and horizontal scaling for significant growth

### UI Design Elements

* Character selection during session creation
* Password reveal screen with copy functionality
* One-click result reporting (Win/Loss/Disconnect)
* Player statistics dashboard
* Achievement system for engagement

### Additional Engagement Features

* Achievement and badge system
* Match statistics
* Friends list functionality
* Rating system for play experiences
* Reputation system for self-reporting

### Deployment

* Docker-Based Deployment with Nginx Reverse Proxy

## Project Context

This is a hobby project born from passion for the game, with no expected revenue except possible donations. Cost predictability is important, with an initial expectation of 1-2K users potentially growing to more. This application is a PlayStation companion app. Players will play the game on the PlayStation and just track progress in this web application. The core of the app is one React component that creates a session and waits for players to join.

## Architecture Considerations

Your technology stack of Next.js with React for frontend and Rust with Actix-web for the backend is solid for real-time features. MongoDB is a good choice for flexibility, especially in the early stages of development.

For a DigitalOcean Basic Droplet ($5-6/month), you should be able to handle your initial expected user base of 1-2K users, particularly if they're not all active simultaneously. Some considerations:

1. Connection pooling will be important for your MongoDB implementation to manage resources efficiently
2. Caching strategies (like Redis) might help reduce database load for frequently accessed data
3. WebSockets via Actix-web will be crucial for your real-time notification requirements

## Feature Implementation

For your core matchmaking functionality:

* Consider implementing a "heartbeat" system to verify users are still active/online
* The password revelation mechanic should include proper encryption in transit
* For the self-reporting system, you might want to add a reputation system that gives more weight to players with consistent reporting histories

## User Experience Refinements

Some enhancements to consider:

1. **Matchmaking filters** - Allow users to find games based on preferred play styles, experience levels, or time availability
2. **Session templates** - Let frequent hosts save their preferred session settings
3. **Quick-join option** - One-click joining for players who don't want to browse sessions
4. **Post-game feedback** - Structured feedback forms beyond simple ratings

## Technical Challenges to Plan For

1. **Handling disconnections** - Both in-app and during gameplay
2. **Data validation** - Ensuring consensus on game results
3. **Scaling strategy** - How will you partition data if you need to scale horizontally?
4. **Security considerations** - Preventing manipulation of the reporting system

## Deployment Workflow

### Development Environment

* Local development with Docker Compose to mimic production
* Test environment that mirrors production

### Production Deployment

* Build artifacts for both frontend and backend
* Deploy frontend as static files served by Nginx
* Deploy backend as a managed service
* Database migrations run as part of deployment

### Monitoring

* Set up basic monitoring with Prometheus/Grafana or a simpler solution
* Configure alerts for downtime or performance issues
* Log aggregation for troubleshooting

## Docker-Based Deployment

If you're already familiar with Docker or want a more reproducible setup:

1. **Create Docker images for your services**:
   * One for your Next.js frontend
   * One for your Rust backend
   * Use the official MongoDB image

2. **Use Docker Compose to orchestrate these containers**:
   * Define services in a docker-compose.yml file
   * Set up networking between containers
   * Configure volume mounts for persistent data

3. **Deploy to DigitalOcean**:
   * Install Docker and Docker Compose on your droplet
   * Copy your docker-compose.yml file to the server
   * Run with docker-compose up -d

## Realistic Assessment

Your current implementation is actually quite solid for a small to medium-sized application. The WebSocket service with Actix is efficient, and your reconnection logic and error handling are well-implemented.

For a game-like application with session-based interactions, you could realistically support:
* 500-1,000 concurrent users on a basic $10-20/month droplet
* 2,000-5,000 concurrent users on a $40-60/month droplet

This is more than enough for an initial launch and early growth phase. You'd only need the more complex distributed architecture described earlier when approaching tens of thousands of concurrent users.

## Recommendations

1. Deploy your current solution as-is on a 2GB or 4GB droplet
2. Add monitoring (Prometheus + Grafana or a simpler solution)
3. Implement the simple optimizations mentioned above
4. Set up load testing to verify actual capacity with your specific workload

This approach gives you the best balance of cost-effectiveness and scalability for your current stage, while providing a clear upgrade path when you need it.

## Resource Optimization

**Q: Will we save resources if we are only connected with web sockets while on this run page and when we are not on this page the web socket is disconnected again?**

A: Yes, connecting to WebSockets only when needed (while on the relevant page) and disconnecting when navigating away will significantly reduce server resource usage. Each WebSocket connection maintains state on the server, consuming memory and potentially CPU for heartbeats and connection management. By implementing connection lifecycle management tied to page visibility, you'll optimize resource usage, especially important on a smaller VPS.
