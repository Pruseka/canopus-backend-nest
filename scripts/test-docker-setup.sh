#!/bin/bash
set -e

echo "🧪 Testing Docker Setup for Canopus Backend"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test 1: Clean setup
log_info "Step 1: Cleaning up existing containers and volumes..."
docker compose down -v || true
docker system prune -f || true

# Test 2: Build containers
log_info "Step 2: Building containers..."
docker compose build --no-cache

# Test 3: Start database first
log_info "Step 3: Starting database container..."
docker compose up canopus-dev-db -d

# Wait for database to be healthy
log_info "Step 4: Waiting for database to be healthy..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if docker compose ps canopus-dev-db | grep -q "healthy"; then
        log_info "Database is healthy!"
        break
    fi
    echo "Waiting for database... ($counter/$timeout)"
    sleep 2
    counter=$((counter + 2))
done

if [ $counter -ge $timeout ]; then
    log_error "Database failed to become healthy in time"
    exit 1
fi

# Test 4: Start API container
log_info "Step 5: Starting API container..."
docker compose up canopus-api -d

# Test 5: Monitor API startup
log_info "Step 6: Monitoring API startup logs..."
docker compose logs -f canopus-api &
LOGS_PID=$!

# Wait for API to be healthy
log_info "Step 7: Waiting for API to be healthy..."
timeout=120
counter=0
while [ $counter -lt $timeout ]; do
    if docker compose ps canopus-api | grep -q "healthy"; then
        log_info "API is healthy!"
        kill $LOGS_PID 2>/dev/null || true
        break
    fi
    sleep 3
    counter=$((counter + 3))
done

if [ $counter -ge $timeout ]; then
    log_error "API failed to become healthy in time"
    docker compose logs canopus-api
    exit 1
fi

# Test 6: Verify API endpoints
log_info "Step 8: Testing API endpoints..."
if curl -f http://localhost:4000/health >/dev/null 2>&1; then
    log_info "Health endpoint is working!"
else
    log_error "Health endpoint is not responding"
    exit 1
fi

# Test 7: Check database tables
log_info "Step 9: Verifying database schema..."
if docker compose exec canopus-api pnpm dlx prisma db pull >/dev/null 2>&1; then
    log_info "Database schema is accessible!"
else
    log_error "Database schema is not accessible"
    exit 1
fi

# Test 8: Final status check
log_info "Step 10: Final status check..."
docker compose ps

echo ""
log_info "🎉 All tests passed! Docker setup is working correctly."
echo ""
echo "Available endpoints:"
echo "  - API: http://localhost:4000"
echo "  - Health: http://localhost:4000/health"
echo "  - Database: localhost:5434"
echo ""
echo "Useful commands:"
echo "  - View logs: docker compose logs -f canopus-api"
echo "  - Enter container: docker compose exec canopus-api sh"
echo "  - Stop services: docker compose down"
echo "  - Stop with volumes: docker compose down -v"
