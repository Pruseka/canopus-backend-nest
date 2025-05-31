# Use Node.js 20.11.1 Alpine base image
FROM node:20.11.1-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies efficiently
RUN npm ci --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Generate Prisma Client code
RUN npx prisma generate

# Expose the port the app runs on
EXPOSE 4000

# Set entry point
ENTRYPOINT ["sh", "-c"]

# Command to run the app
CMD ["npm", "run", "start:migrate:prod"]
