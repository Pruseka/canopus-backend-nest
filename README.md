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

## 🛠️ **Quick Start**

### **Prerequisites**

- Node.js 18+
- pnpm (recommended) or npm
- Docker & Docker Compose
- PostgreSQL (provided via Docker)

### **1. Installation**

```bash
git clone <repository-url>
cd canopus-backend-nest
pnpm install
```

### **2. Environment Setup**

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5434/canopus"

# JWT Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-super-secure-refresh-secret-key-min-32-chars"

# Snake Ways Service Integration
SNAKE_WAYS_BASE_URL="http://your-snake-ways-service-url"
SNAKE_WAYS_API_KEY="your-snake-ways-api-key"
SNAKE_WAYS_USERNAME="your-username"
SNAKE_WAYS_PASSWORD="your-password"

# Polling Intervals (in minutes)
SNAKE_WAYS_USER_POLLING_INTERVAL=5
SNAKE_WAYS_WAN_POLLING_INTERVAL=5
SNAKE_WAYS_LAN_POLLING_INTERVAL=5
SNAKE_WAYS_INTERFACE_POLLING_INTERVAL=5

# Application Configuration
PORT=4000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN="http://localhost:3000"
```

### **3. Database Setup**

```bash
# Start PostgreSQL container
pnpm run db:dev:up

# Run database migrations
pnpm run prisma:dev:deploy

# Optional: Seed database with sample data
npx prisma db seed
```

### **4. Start Development Server**

```bash
# Development mode with hot reload
pnpm run start:dev

# Debug mode
pnpm run start:debug

# Production build
pnpm run build && pnpm run start:prod
```

### **5. Access Swagger Documentation**

Once the server is running, visit: **http://localhost:4000/api**

---

## 📊 **Database Schema**

### **Core Models**

#### **User Management**

- **`User`**: Core user data with authentication and credits
- **`UserHistorySnapshot`**: Historical user state tracking

#### **Network Infrastructure**

- **`Wan`**: WAN connection configurations and status
- **`Lan`**: LAN network configurations
- **`NetworkInterface`**: Physical/virtual network interfaces
- **`LanInterface`**: LAN-to-interface mappings

#### **Usage Tracking**

- **`WanUsage`**: WAN bandwidth usage over time
- **`LanUsage`**: LAN traffic through specific WANs

### **Key Enums**

```typescript
enum UserAccessLevel {
  ADMIN,
  SITE_ADMIN,
  SITE_MASTER,
  USER,
  PREPAID_USER,
}
enum WanStatus {
  READY,
  ERROR,
  SUSPENDED,
  INITIALIZING,
  ALL_WAN_FORCED_OFF,
  NOT_READY,
  QUOTA_REACHED,
  ONLINE,
}
enum PrepaidUsageMode {
  DISALLOW,
  ALLOW,
  LIMITED,
}
enum InterfaceType {
  ETHERNET,
  WIFI_AP,
  WIFI_MANAGED,
  LTE,
  LINK_EXTENDER,
  EXTENDER,
}
```

---

## 🌐 **API Endpoints**

### **Base URL**: `http://localhost:4000`

### **Swagger Documentation**: `http://localhost:4000/api`

### **Authentication** (`/auth`)

```bash
POST   /auth/signup           # User registration
POST   /auth/signin           # User login
POST   /auth/refresh          # Refresh access token
GET    /auth/profile          # Get current user profile
```

### **User Management** (`/users`)

```bash
GET    /users                 # Get all users from database
GET    /users/snake-ways      # Get users directly from Snake Ways
POST   /users/sync            # Force sync with Snake Ways
POST   /users/restart-polling # Restart Snake Ways polling
GET    /users/history         # Get user history snapshots
GET    /users/history/:userId # Get specific user history
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

### **Usage Analytics** (`/wan-usage`)

```bash
GET    /wan-usage             # Get WAN usage data with filters
GET    /wan-usage/chart/:period # Get chart data (daily/weekly/monthly)
GET    /wan-usage/aggregated/:period # Get aggregated usage data
```

#### **Usage Query Parameters**

```bash
# Filtering options for /wan-usage
?wanId=<wan-id>           # Filter by specific WAN
?startDate=2023-01-01     # Start date (inclusive)
?endDate=2023-12-31       # End date (inclusive)
?limit=100                # Limit results

# Chart data with multiple WANs
/wan-usage/chart/daily?wanIds=wan1,wan2,wan3
```

---

## 🔧 **Development Commands**

### **Database Management**

```bash
# Database lifecycle
pnpm run db:dev:restart     # Restart database container
pnpm run db:dev:rm          # Remove database container
pnpm run db:dev:up          # Start database container
pnpm run prisma:dev:deploy  # Run migrations

# Prisma commands
npx prisma generate         # Generate Prisma client
npx prisma migrate dev      # Create and apply migration
npx prisma studio           # Database GUI
npx prisma db seed          # Seed database
```

### **Application Commands**

```bash
# Development
pnpm run start:dev          # Hot reload development
pnpm run start:debug        # Debug mode with inspector

# Building & Production
pnpm run build              # Build for production
pnpm run start:prod         # Start production build
pnpm run start:migrate:deploy # Deploy migrations + start prod

# Code Quality
pnpm run lint               # Run ESLint
pnpm run format             # Format with Prettier
pnpm run test               # Run unit tests
pnpm run test:e2e           # Run end-to-end tests
pnpm run test:cov           # Test coverage report
```

---

## 🏛️ **Architecture Overview**

### **Module Structure**

```
src/
├── auth/                   # Authentication & authorization
├── user/                   # User management
├── wan/                    # WAN management & usage tracking
├── lan/                    # LAN management
├── interface/              # Network interface management
├── dashboard/              # Dashboard endpoints (placeholder)
├── snake-ways/             # Snake Ways service integration
│   ├── base/              # Shared Snake Ways functionality
│   ├── user/              # User sync service
│   ├── wan/               # WAN sync service
│   ├── lan/               # LAN sync service
│   └── interface/         # Interface sync service
├── common/                 # Shared utilities & pipes
├── prisma/                 # Database client
└── main.ts                # Application bootstrap
```

### **Key Design Patterns**

#### **Service Layer Architecture**

- **Controller**: HTTP request handling & validation
- **Service**: Business logic & data orchestration
- **Repository**: Database operations (Prisma)
- **Snake Ways Services**: External API integration

#### **Data Synchronization**

- **Polling Strategy**: Configurable intervals for each data type
- **Resilient Sync**: Automatic retry with exponential backoff
- **Data Mapping**: Clean separation between external API and internal models
- **Error Handling**: Comprehensive logging and graceful degradation

#### **Authentication Flow**

```
1. User login → JWT access token + HTTP-only refresh cookie
2. Protected routes → JWT verification middleware
3. Token refresh → Automatic via refresh token rotation
4. Logout → Token invalidation + cookie clearing
```

---

## 🔌 **Snake Ways Integration**

### **Service Architecture**

Each data type has its own synchronized service:

- **`SnakeWaysUserService`**: User synchronization
- **`SnakeWaysWanService`**: WAN data & route control
- **`SnakeWaysLanService`**: LAN configuration sync
- **`SnakeWaysInterfaceService`**: Network interface monitoring

### **Polling Configuration**

```typescript
// Environment variables control polling intervals
SNAKE_WAYS_USER_POLLING_INTERVAL = 5; // minutes
SNAKE_WAYS_WAN_POLLING_INTERVAL = 5; // minutes
SNAKE_WAYS_LAN_POLLING_INTERVAL = 5; // minutes
SNAKE_WAYS_INTERFACE_POLLING_INTERVAL = 5; // minutes
```

### **Data Flow**

```
Snake Ways API → Service Layer → Data Mapping → Database → REST API
```

### **Error Handling & Resilience**

- **Circuit Breaker**: Stops polling on consecutive failures
- **Exponential Backoff**: Increasing delays between retries
- **Service Health**: Individual service status tracking
- **Manual Recovery**: Force sync and restart polling endpoints

---

## 📱 **API Documentation (Swagger)**

### **Accessing Swagger UI**

Visit `http://localhost:4000/api` for interactive API documentation.

### **Key Features**

- **Interactive Testing**: Execute API calls directly from the browser
- **Request/Response Examples**: Complete payload examples for all endpoints
- **Authentication**: JWT bearer token input for protected routes
- **Schema Documentation**: Detailed models and validation rules
- **Error Responses**: Comprehensive error code documentation

### **Swagger Configuration**

```typescript
// Configured in src/main.ts
const config = new DocumentBuilder()
  .setTitle('Canopus API')
  .setDescription('API for Canopus Network Management')
  .setVersion('1.0')
  .addBearerAuth() // JWT authentication
  .build();
```

---

## 🔐 **Security & Authentication**

### **JWT Implementation**

- **Access Tokens**: Short-lived (15 minutes), stateless
- **Refresh Tokens**: Long-lived (7 days), stored as HTTP-only cookies
- **Token Rotation**: New refresh token on each refresh operation
- **Secure Cookies**: HTTP-only, secure, SameSite strict

### **Route Protection**

```typescript
// Global JWT guard applied to all routes by default
// Use @Public() decorator for open endpoints
@Public()
@Post('signin')
async signIn() { ... }

// Access current user in protected routes
@Get('profile')
getProfile(@GetCurrentUser() user: UserEntity) { ... }
```

### **CORS Configuration**

```typescript
// Configured for frontend integration
app.enableCors({
  origin: ['http://localhost:3000'],
  credentials: true, // Allow cookies
});
```

---

## 🐳 **Docker & Deployment**

### **Development with Docker Compose**

```bash
# Start development database
docker-compose up canopus-dev-db -d

# Full application stack (uncomment in docker-compose.yml)
docker-compose up -d
```

### **Production Deployment**

```bash
# Build production image
docker build -t canopus-backend .

# Deploy with migrations
docker run -e DATABASE_URL=... canopus-backend npm run start:migrate:deploy
```

### **Environment Variables for Production**

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=production-secret
SNAKE_WAYS_BASE_URL=https://production-snake-ways-api
```

---

## 🧪 **Testing**

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

### **Test Structure**

```
test/
├── unit/                   # Unit tests
├── integration/            # Integration tests
└── e2e/                   # End-to-end tests
```

---

## 📋 **Common Development Tasks**

### **Adding New Endpoints**

1. **Create/Update DTOs** in `dto/` folders
2. **Add Controller Methods** with Swagger decorators
3. **Implement Service Logic**
4. **Update Database Schema** (if needed)
5. **Run Migrations**: `npx prisma migrate dev`

### **Database Changes**

```bash
# 1. Modify prisma/schema.prisma
# 2. Generate migration
npx prisma migrate dev --name your-migration-name
# 3. Generate new client
npx prisma generate
```

### **Adding Snake Ways Integration**

1. **Create Service** extending `SnakeWaysBaseService`
2. **Implement Polling Logic** with configurable intervals
3. **Add Data Mapping** between Snake Ways and internal models
4. **Configure Environment Variables** for polling intervals

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**

```bash
# Check if database container is running
docker ps | grep canopus-dev-db

# Restart database
pnpm run db:dev:restart

# Check connection
npx prisma db pull
```

#### **Snake Ways Service Unavailable**

```bash
# Check service status in logs
# Look for polling restart endpoints:
POST /users/restart-polling
POST /wans/restart-polling
POST /lans/restart-polling
POST /interfaces/restart-polling
```

#### **Authentication Issues**

```bash
# Verify JWT secrets are set
echo $JWT_SECRET

# Check token expiration in client
# Use /auth/refresh endpoint for new tokens
```

### **Logging & Debugging**

- **Colored Logs**: Chalk-based logging with different colors per severity
- **Request Logging**: HTTP requests automatically logged
- **Service Health**: Individual service status in logs
- **Debug Mode**: `pnpm run start:debug` for Node.js inspector

---

## 📚 **Additional Resources**

- **NestJS Documentation**: https://docs.nestjs.com
- **Prisma Documentation**: https://www.prisma.io/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs
- **JWT Best Practices**: https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp
