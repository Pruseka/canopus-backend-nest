# 🚀 Canopus Backend API

A comprehensive NestJS-based API for network infrastructure management, providing real-time monitoring and control of WANs, LANs, network interfaces, and user management with Snake Ways service integration.

## 📖 Overview

Canopus Backend is a robust network management API that:

- **Manages Network Infrastructure**: WANs, LANs, and network interfaces
- **User Management**: Authentication, authorization, and user history tracking
- **Real-time Synchronization**: Integrates with Snake Ways service for live network data
- **Usage Analytics**: Comprehensive network usage tracking and reporting
- **System Route Control**: Dynamic WAN routing and failover management

### 🏗️ **Tech Stack**

- **Framework**: NestJS (Node.js/TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with refresh tokens & cookie-based sessions
- **API Documentation**: Swagger/OpenAPI
- **External Integration**: Snake Ways service
- **Containerization**: Docker & Docker Compose
- **Validation**: class-validator with custom pipes
- **Scheduling**: Cron jobs for data synchronization

---

## 🐳 **Docker Setup & Deployment**

### **Prerequisites**

- Docker 20.10+
- Docker Compose 2.0+
- Git

### **🚀 Quick Start with Docker**

1. **Clone the repository**

```bash
git clone <repository-url>
cd canopus-backend-nest
```

2. **Create environment file**

you can also paste what we directly sent to you and skip the step below

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
nano .env  # or use your preferred editor
```

3. **Start the full application stack**

```bash
# Production deployment
docker compose up -d

# The following services will be available:
# - API: http://localhost:4000
# - Database: localhost:5434
# - Swagger: http://localhost:4000/api
# - Health Check: http://localhost:4000/health

# If anything changed on backend, run the following scripts
docker compose down
docker compose build --no-cache
docker compose up
```

### **🔧 Development with Docker**

```bash
# Start development environment with hot reload and Prisma Studio
docker compose --profile dev up -d

# Services available in development mode:
# - API (dev): http://localhost:4001 (hot reload)
# - Database: localhost:5434
# - Prisma Studio: http://localhost:5555
# - Swagger: http://localhost:4001/api
```

### **📋 Docker Commands Reference**

#### **Application Management**

```bash
# Build the application
pnpm run docker:build

# Start production stack
pnpm run docker:up

# Start development stack
pnpm run docker:up:dev

# Stop all services
pnpm run docker:down

# Stop and remove volumes (⚠️ deletes database data)
pnpm run docker:down:volumes

# Restart the API service
pnpm run docker:restart

# View logs
pnpm run docker:logs         # Production logs
pnpm run docker:logs:dev     # Development logs

# Access container shell
pnpm run docker:shell
```

#### **Database Operations in Docker**

```bash
# Run database migrations
docker compose exec canopus-api pnpm run prisma:migrate:prod

# Access Prisma Studio
pnpm run docker:prisma:studio

# Seed the database
docker compose exec canopus-api pnpm run prisma:seed

# Reset database (⚠️ deletes all data)
docker compose exec canopus-api pnpm run prisma:reset

# Generate Prisma client
docker compose exec canopus-api pnpm run prisma:generate
```

### **🏗️ Multi-Stage Docker Build**

The Dockerfile uses multi-stage builds for optimal production images:

- **base**: Common dependencies and setup
- **development**: Development environment with hot reload
- **deps**: Production dependencies only
- **build**: Application build stage
- **production**: Final optimized runtime image

---

## 🛠️ **Local Development Setup**

### **Prerequisites**

- Node.js 18+
- pnpm
- PostgreSQL 13+ (or use Docker)

### **1. Installation**

```bash
git clone <repository-url>
cd canopus-backend-nest
pnpm install
```

### **2. Environment Setup**

Create a `.env` file in the root directory:

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5434/canopus?schema=public"
JWT_SECRET="canpous-jwt"
JWT_REFRESH_SECRET="canopus-refresh-jwt"
SNAKE_WAYS_BASE_URL="https://192.168.77.1:3001/api/v1"
SNAKE_WAYS_API_KEY="95BA3727E9D411EF900E96000020287C"
SNAKE_WAYS_USERS_POLLING_INTERVAL=30
SNAKE_WAYS_WAN_POLLING_INTERVAL=30
SNAKE_WAYS_WAN_USAGE_POLLING_INTERVAL=30
SNAKE_WAYS_LAN_POLLING_INTERVAL=30
SNAKE_WAYS_LAN_USAGE_POLLING_INTERVAL=30
SNAKE_WAYS_INTERFACE_POLLING_INTERVAL=30
```

### **3. Database Setup**

```bash
# Start PostgreSQL container
pnpm run db:dev:up

# Run database migrations
pnpm run prisma:dev:deploy
```

### **4. Start Development Server**

```bash
# Development mode with hot reload
pnpm run start:dev

# Production build
pnpm run build && pnpm run start:prod
```

---

## 🗄️ **Database Management**

### **Prisma Commands**

#### **Migration Management**

```bash
# Create a new migration
pnpm run prisma:migrate
# or
npx prisma migrate dev --name your-migration-name

# Deploy migrations (production)
pnpm run prisma:migrate:prod
# or
npx prisma migrate deploy

# Reset database (⚠️ deletes all data)
pnpm run prisma:reset
# or
npx prisma migrate reset
```

#### **Prisma Client**

```bash
# Generate Prisma client after schema changes
pnpm run prisma:generate
# or
npx prisma generate
```

#### **Prisma Studio - Database GUI**

```bash
# Open Prisma Studio (local development)
pnpm run prisma:studio
# or
npx prisma studio

# Access at: http://localhost:5555

# For Docker environment
pnpm run docker:prisma:studio
# Access at: http://localhost:5555
```

### **Database Schema Overview**

#### **Core Models**

##### **User Management**

- **`User`**: Core user data with authentication and credits
- **`UserHistorySnapshot`**: Historical user state tracking

##### **Network Infrastructure**

- **`Wan`**: WAN connection configurations and status
- **`Lan`**: LAN network configurations
- **`NetworkInterface`**: Physical/virtual network interfaces
- **`LanInterface`**: LAN-to-interface mappings

##### **Usage Tracking**

- **`WanUsage`**: WAN bandwidth usage over time
- **`LanUsage`**: LAN traffic through specific WANs

### **Database Development Workflow**

1. **Make Schema Changes**: Edit `prisma/schema.prisma`
2. **Create Migration**: `pnpm run prisma:migrate`
3. **Generate Client**: `pnpm run prisma:generate`
4. **Update TypeScript**: Restart your IDE/development server

---

## 🔌 **Snake Ways Integration**

### **🏗️ Service Architecture**

The Snake Ways integration consists of multiple specialized services:

- **`SnakeWaysUserService`**: User synchronization and history tracking
- **`SnakeWaysWanService`**: WAN data synchronization and route control
- **`SnakeWaysLanService`**: LAN configuration synchronization
- **`SnakeWaysInterfaceService`**: Network interface monitoring
- **`SnakeWaysWanUsageService`**: WAN usage data tracking
- **`SnakeWaysLanUsageService`**: LAN usage data tracking

### **⚙️ Polling Configuration**

Each service runs on configurable polling intervals:

```bash
# Environment variables for polling intervals (in seconds)
SNAKE_WAYS_USER_POLLING_INTERVAL=5           # User data sync
SNAKE_WAYS_WAN_POLLING_INTERVAL=5            # WAN configuration sync
SNAKE_WAYS_LAN_POLLING_INTERVAL=5            # LAN configuration sync
SNAKE_WAYS_INTERFACE_POLLING_INTERVAL=5      # Network interface sync
SNAKE_WAYS_WAN_USAGE_POLLING_INTERVAL=5      # WAN usage data sync
SNAKE_WAYS_LAN_USAGE_POLLING_INTERVAL=5      # LAN usage data sync
SNAKE_WAYS_USER_SNAPSHOT_POLLING_INTERVAL=5 # User history snapshots
```

### **🔄 Restart Polling Services**

When polling services stop due to consecutive failures, use these endpoints to restart them:

#### **Restart User Polling**

```bash
# Restart user data polling
POST /users/restart-polling

# Restart user snapshots polling
POST /users/restart-snapshots-polling

# Example response:
{
  "message": "Snake Ways polling restarted successfully",
  "service": "user",
  "status": "active"
}
```

#### **Restart WAN Polling**

```bash
# Restart WAN data polling
POST /wans/restart-polling

# Restart WAN usage polling
POST /wan-usage/restart-polling

# Example response:
{
  "message": "Snake Ways WAN service polling restarted successfully",
  "service": "wan",
  "status": "active"
}
```

#### **Restart LAN Polling**

```bash
# Restart LAN data polling
POST /lans/restart-polling

# Restart LAN usage polling
POST /lan-usage/restart-polling

# Example response:
{
  "message": "Snake Ways LAN service polling restarted successfully",
  "service": "lan",
  "status": "active"
}
```

#### **Restart Interface Polling**

```bash
# Restart interface polling
POST /interfaces/restart-polling

# Example response:
{
  "message": "Snake Ways interface service polling restarted successfully",
  "service": "interface",
  "status": "active"
}
```

### **⚡ Real-time Data Access**

Get live data directly from Snake Ways without waiting for polling:

#### **Live User Data**

```bash
# Get users directly from Snake Ways
GET /users/snake-ways

# Get users with current usage data
GET /users/snake-ways/with-usage
```

#### **Live WAN Data**

```bash
# Get WANs directly from Snake Ways
GET /wans/snake-ways

# Get current system route status
GET /wans/route

# Change system route
PUT /wans/route
Body: {
  "WanID": "979FC0CE166A11EDA4F51737CD617E52"  // or "AUTO" or "OFF"
}
```

#### **Live LAN Data**

```bash
# Get LANs directly from Snake Ways
GET /lans/snake-ways
```

#### **Live Interface Data**

```bash
# Get interfaces directly from Snake Ways
GET /interfaces/snake-ways
```

### **🛠️ Error Handling & Resilience**

#### **Circuit Breaker Pattern**

- Services automatically stop polling after consecutive failures
- Configurable failure threshold: `SNAKE_WAYS_MAX_CONSECUTIVE_FAILURES=5`
- Manual restart available via API endpoints

#### **Exponential Backoff**

- Automatic retry with increasing delays
- Base delay: `SNAKE_WAYS_BASE_RETRY_DELAY=1000ms`
- Maximum delay: `SNAKE_WAYS_MAX_RETRY_DELAY=30000ms`
- Multiplier: `SNAKE_WAYS_RETRY_DELAY_MULTIPLIER=2`

#### **Service Health Monitoring**

Each service tracks its health status:

- **Active**: Polling normally
- **Stopped**: Stopped due to failures
- **Error**: Temporary error state

### **🔧 Troubleshooting Snake Ways Integration**

#### **Check Service Status**

Monitor logs for service health:

```bash
# View live logs
docker compose logs -f canopus-api

# Or for local development
pnpm run start:dev
```

#### **Common Issues & Solutions**

1. **Connection Refused**

   ```
   Error: Snake Ways service connection refused
   Solution: Check SNAKE_WAYS_BASE_URL and ensure the service is running
   ```

2. **Authentication Failed**

   ```
   Error: 401 Unauthorized
   Solution: Verify SNAKE_WAYS_API_KEY, SNAKE_WAYS_USERNAME, and SNAKE_WAYS_PASSWORD
   ```

3. **Polling Stopped**

   ```
   Error: Polling stopped due to consecutive failures
   Solution: Use restart-polling endpoints or check service connectivity
   ```

4. **Timeout Issues**
   ```
   Error: Request timeout
   Solution: Increase SNAKE_WAYS_TIMEOUT or check network connectivity
   ```

---

## 🌐 **API Endpoints**

### **Base URL**: `http://localhost:4000`

### **Swagger Documentation**: `http://localhost:4000/api`

### **Health Check**: `http://localhost:4000/health`

### **Authentication** (`/auth`)

```bash
POST   /auth/signup           # User registration
POST   /auth/signin           # User login
POST   /auth/refresh          # Refresh access token
GET    /auth/profile          # Get current user profile
```

### **User Management** (`/users`)

```bash
GET    /users                      # Get all users from database
GET    /users/snake-ways           # Get users directly from Snake Ways
GET    /users/snake-ways/with-usage # Get users with usage from Snake Ways
POST   /users/sync                 # Force sync with Snake Ways
POST   /users/restart-polling      # Restart Snake Ways user polling
POST   /users/restart-snapshots-polling # Restart user snapshots polling
GET    /users/history              # Get user history snapshots
GET    /users/history/:userId      # Get specific user history
```

### **WAN Management** (`/wans`)

```bash
GET    /wans                  # Get all WANs from database
GET    /wans/snake-ways       # Get WANs directly from Snake Ways
POST   /wans/sync             # Force sync with Snake Ways
POST   /wans/restart-polling  # Restart WAN polling
GET    /wans/route            # Get current system route status
PUT    /wans/route            # Change system route to specific WAN
```

#### **WAN Route Control**

```bash
# Get current route status
GET /wans/route
Response: {
  "wanId": "979FC0CE166A11EDA4F51737CD617E52",
  "status": "DEFAULT_ROUTE_SET",
  "routeType": "SWITCH_FORCED_TO_WAN"
}

# Change system route
PUT /wans/route
Body: {
  "WanID": "979FC0CE166A11EDA4F51737CD617E52"  // or "AUTO" or "OFF"
}
```

### **LAN Management** (`/lans`)

```bash
GET    /lans                  # Get all LANs from database
GET    /lans/snake-ways       # Get LANs directly from Snake Ways
POST   /lans/sync             # Force sync with Snake Ways
POST   /lans/restart-polling  # Restart LAN polling
```

### **Interface Management** (`/interfaces`)

```bash
GET    /interfaces            # Get all network interfaces
GET    /interfaces/snake-ways # Get interfaces from Snake Ways
POST   /interfaces/sync       # Force sync with Snake Ways
POST   /interfaces/restart-polling # Restart interface polling
```

### **Usage Analytics** (`/wan-usage`, `/lan-usage`)

```bash
# WAN Usage
GET    /wan-usage                      # Get WAN usage data with filters
GET    /wan-usage/chart/:period        # Get chart data (daily/weekly/monthly)
GET    /wan-usage/aggregated/:period   # Get aggregated usage data
POST   /wan-usage/restart-polling      # Restart WAN usage polling

# LAN Usage
GET    /lan-usage                      # Get LAN usage data with filters
POST   /lan-usage/restart-polling      # Restart LAN usage polling
```

#### **Usage Query Parameters**

```bash
# Filtering options for usage endpoints
?wanId=<wan-id>           # Filter by specific WAN
?lanId=<lan-id>           # Filter by specific LAN
?startDate=2023-01-01     # Start date (inclusive)
?endDate=2023-12-31       # End date (inclusive)
?limit=100                # Limit results

# Chart data with multiple WANs
/wan-usage/chart/daily?wanIds=wan1,wan2,wan3
```

---

<!-- ## 🧪 **Testing**

### **Test Configuration**

```bash
# Unit tests
pnpm run test

# End-to-end tests
pnpm run test:e2e

# Coverage report
pnpm run test:cov

# Watch mode for development
pnpm run test:watch
```

### **Testing with Docker**

```bash
# Run tests in Docker container
docker compose exec canopus-api pnpm run test

# Run e2e tests
docker compose exec canopus-api pnpm run test:e2e
```

--- -->

## 📱 **API Documentation (Swagger)**

### **Accessing Swagger UI**

- **Local Development**: `http://localhost:4000/api`
- **Docker Production**: `http://localhost:4000/api`
- **Docker Development**: `http://localhost:4001/api`

### **Key Features**

- **Interactive Testing**: Execute API calls directly from the browser
- **Authentication**: JWT bearer token input for protected routes
- **Request/Response Examples**: Complete payload examples
- **Schema Documentation**: Detailed models and validation rules
- **Snake Ways Integration**: Documented endpoints for all services

---

## 📋 **Common Development Tasks**

### **Adding New Endpoints**

1. **Create/Update DTOs** in `dto/` folders
2. **Add Controller Methods** with Swagger decorators
3. **Implement Service Logic**
4. **Update Database Schema** (if needed)
5. **Run Migrations**: `pnpm run prisma:migrate`

### **Database Schema Changes**

```bash
# 1. Modify prisma/schema.prisma
# 2. Create and apply migration
pnpm run prisma:migrate

# 3. Generate new Prisma client
pnpm run prisma:generate

# 4. Restart development server or rebuild Docker
```

### **Adding Snake Ways Integration**

1. **Create Service** extending `SnakeWaysBaseService`
2. **Implement Polling Logic** with configurable intervals
3. **Add Data Mapping** between Snake Ways and internal models
4. **Configure Environment Variables** for polling intervals
5. **Add Force Sync and Restart Endpoints**

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**

```bash
# Check if database container is running
docker ps | grep canopus-postgres

# Restart database
pnpm run db:dev:restart

# Check connection
pnpm run prisma:generate
```

#### **Docker Issues**

```bash
# Check container status
docker compose ps

# View container logs
docker compose logs canopus-api

# Rebuild containers
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### **Snake Ways Service Issues**

```bash
# Check service connectivity
curl http://your-snake-ways-service-url/health

# Restart specific polling services
POST /users/restart-polling
POST /wans/restart-polling
POST /lans/restart-polling

# Force sync specific data
POST /users/sync
POST /wans/sync
POST /lans/sync
```

## 📚 **Additional Resources**

- **NestJS Documentation**: https://docs.nestjs.com
- **Prisma Documentation**: https://www.prisma.io/docs
- **Docker Documentation**: https://docs.docker.com
- **PostgreSQL Documentation**: https://www.postgresql.org/docs

---
