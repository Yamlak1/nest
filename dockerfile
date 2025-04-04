# Stage 1: Build the application
FROM node:18 AS builder

# Set the working directory
WORKDIR /app

# Copy package files and install all dependencies
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the NestJS app (ensure your package.json has a "build" script)
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose port 8080 so Cloud Run can route traffic
EXPOSE 8080

# Start the application; ensure your main.ts uses process.env.PORT
CMD ["node", "dist/main.js"]
