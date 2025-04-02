# Build stage
FROM node:20.11.1-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install all dependencies (including devDependencies)
RUN pnpm install

# Copy source code and config files
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generate Prisma Client and build the application
RUN npx prisma generate
RUN pnpm run build

# Production stage
FROM node:20.11.1-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod

# Copy prisma schema for migrations
COPY prisma ./prisma/

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Expose the port the app runs on
EXPOSE 4000

# Set entry point
ENTRYPOINT ["sh", "-c"]

# Command to run the app
CMD ["pnpm run prisma:migrate:deploy && pnpm run start:prod"]
