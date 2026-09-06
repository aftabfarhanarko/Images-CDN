# Multi-stage Dockerfile for NestJS + Sharp Image CDN
# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only (including Sharp C++ bindings)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create uploads directory with appropriate permissions
RUN mkdir -p /app/uploads && chown -node /app/uploads

USER node

EXPOSE 8000

CMD ["node", "dist/main.js"]
