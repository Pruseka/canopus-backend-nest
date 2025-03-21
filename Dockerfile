# Stage 1: Build the application and generate Prisma client
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./
COPY prisma ./prisma/  

# Install all dependencies (including dev dependencies for Prisma)
RUN npm install

# Copy the rest of the app files
COPY . .

# Build the app and generate the Prisma client
RUN npm run build
RUN npx prisma generate

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /usr/src/app

# Copy production dependencies from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma 

# Expose the port and start the app
EXPOSE 4000

# Optional: Run migrations before starting the app (see notes below)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]