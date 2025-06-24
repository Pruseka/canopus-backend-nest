#!/bin/sh
set -e

echo "🐳 Starting Canopus Backend API Container..."

# Function to wait for database
wait_for_db() {
    echo "⏳ Waiting for database to be ready..."
    
    until npx prisma db pull 2>/dev/null; do
        echo "Database not ready yet, waiting 2 seconds..."
        sleep 2
    done
    
    echo "✅ Database is ready!"
}

# Function to run database migrations
run_migrations() {
    echo "🔄 Running database migrations..."
    npx prisma migrate deploy
    echo "✅ Database migrations completed!"
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
        exec node dist/main.js
        ;;
    "development")
        echo "🔧 Starting in development mode..."
        wait_for_db
        generate_client
        run_migrations
        seed_database
        exec npm run start:dev
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