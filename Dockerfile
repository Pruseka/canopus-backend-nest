# Multi-stage build for production optimization
FROM node:20.11.1-alpine AS base

# Install necessary system dependencies
RUN apk add --no-cache libc6-compat openssl

# Create app directory and non-root user
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy package files
COPY package*.json pnpm-lock.yaml* ./

# Install pnpm and dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod=false

# Development stage
FROM base AS development
COPY . .
# Generate Prisma client for development
RUN pnpm dlx prisma generate
RUN pnpm run build
EXPOSE 4000
USER nestjs
CMD ["pnpm", "run", "start:dev"]

# Production dependencies stage
FROM base AS deps
RUN pnpm install --frozen-lockfile --prod=true

# Production build stage
FROM base AS build
COPY . .
# Generate Prisma client before building
RUN pnpm dlx prisma generate
RUN pnpm run build

# Production runtime stage
FROM node:20.11.1-alpine AS production

# Install system dependencies and create user
RUN apk add --no-cache libc6-compat openssl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy built application and dependencies
COPY --from=deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./

# Copy the entire prisma directory including migrations
COPY --chown=nestjs:nodejs ./prisma ./prisma

# Install pnpm for production
RUN npm install -g pnpm

# Generate Prisma Client for production
RUN pnpm dlx prisma generate

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 4000

# Start the application
CMD ["pnpm", "run", "start:migrate:deploy"]
