# syntax=docker/dockerfile:1

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev for build)
RUN npm ci

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application
RUN npm run build

# ============================================
# Stage 3: Production Dependencies
# ============================================
FROM node:20-alpine AS prod-deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev

# ============================================
# Stage 4: Runner (Production)
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy custom server and types (needed for Socket.io)
COPY --from=builder --chown=nextjs:nodejs /app/server.ts ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/types ./src/types

# Copy production node_modules (includes socket.io, express, etc.)
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy package.json for module resolution
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Install tsx globally for running TypeScript server
RUN npm install -g tsx

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3000

# Set the port environment variable (Railway uses this)
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the custom server
CMD ["tsx", "server.ts"]
