-- Canopus Database Initialization Script
-- This script is executed when the PostgreSQL container starts for the first time

-- Create additional database if needed (optional)
-- CREATE DATABASE canopus_test;

-- Create extensions that might be useful
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';

-- Performance optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET log_statement = 'none';
ALTER SYSTEM SET log_duration = off;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Create a read-only user for monitoring (optional)
-- CREATE USER canopus_readonly WITH PASSWORD 'readonly_password';
-- GRANT CONNECT ON DATABASE canopus TO canopus_readonly;
-- GRANT USAGE ON SCHEMA public TO canopus_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO canopus_readonly;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO canopus_readonly;

-- Log the completion
\echo 'Canopus database initialization completed successfully!' 