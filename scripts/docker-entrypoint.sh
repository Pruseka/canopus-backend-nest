#!/bin/sh
set -e

echo "🐳 Starting Canopus Backend API Container..."

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    
    # Wait for PostgreSQL to be accessible
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if pg_isready -h "${POSTGRES_HOST:-canopus-dev-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-canopus}" 2>/dev/null; then
            echo "✅ Database connection is ready!"
            break
        fi
        
        echo "Database not ready yet, waiting 2 seconds... (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)"
        sleep 2
        RETRY_COUNT=$((RETRY_COUNT + 1))
    done
    
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
        echo "❌ Database failed to become ready after $MAX_RETRIES attempts"
        exit 1
    fi
    
    # Additional check with Prisma
    echo "🔍 Verifying database schema access..."
    SCHEMA_RETRIES=10
    SCHEMA_COUNT=0
    
    while [ $SCHEMA_COUNT -lt $SCHEMA_RETRIES ]; do
        if pnpm dlx prisma db pull 2>/dev/null; then
            echo "✅ Database schema is accessible!"
            break
        fi
        
        echo "Schema not accessible yet, waiting 3 seconds... (attempt $((SCHEMA_COUNT + 1))/$SCHEMA_RETRIES)"
        sleep 3
        SCHEMA_COUNT=$((SCHEMA_COUNT + 1))
    done
    
    if [ $SCHEMA_COUNT -eq $SCHEMA_RETRIES ]; then
        echo "⚠️  Warning: Schema access verification failed, but continuing..."
    fi
}

# Function to run database migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    
    # Check if migrations exist
    if [ ! -d "./prisma/migrations" ] || [ -z "$(find ./prisma/migrations -name "*.sql" 2>/dev/null)" ]; then
        echo "⚠️  No migration files found, skipping migration deployment"
        return 0
    fi
    
    # Run migrations with retry logic
    MIGRATION_RETRIES=3
    MIGRATION_COUNT=0
    
    while [ $MIGRATION_COUNT -lt $MIGRATION_RETRIES ]; do
        if pnpm dlx prisma migrate deploy; then
            echo "✅ Database migrations completed!"
            return 0
        fi
        
        echo "❌ Migration failed, retrying... (attempt $((MIGRATION_COUNT + 1))/$MIGRATION_RETRIES)"
        sleep 5
        MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
    done
    
    echo "❌ All migration attempts failed!"
    exit 1
}

# Function to generate Prisma client
generate_client() {
    echo "⚙️  Generating Prisma client..."
    npx prisma generate
    echo "✅ Prisma client generated!"
}

# Function to seed database (optional)
seed_database() {
    if [ "$SEED_DATABASE" = "true" ]; then
        echo "🌱 Seeding database..."
        npx prisma db seed || echo "⚠️  Seeding failed or no seed script found"
        echo "✅ Database seeding completed!"
    fi
}

# Main execution flow
case "$1" in
    "production")
        echo "🚀 Starting in production mode..."
        wait_for_db
        generate_client
        run_migrations
        seed_database
        echo "🎯 Starting Node.js application..."
        exec node dist/src/main.js
        ;;
    "development")
        echo "🔧 Starting in development mode..."
        wait_for_db
        generate_client
        run_migrations
        seed_database
        echo "🔧 Starting development server..."
        exec pnpm run start:dev
        ;;
    "migrate")
        echo "📋 Running migrations only..."
        wait_for_db
        generate_client
        run_migrations
        echo "✅ Migrations completed, exiting..."
        ;;
    *)
        echo "🎯 Executing custom command: $@"
        exec "$@"
        ;;
esac 