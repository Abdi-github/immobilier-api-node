# =============================================
# MULTI-STAGE DOCKERFILE
# Immobilier Node API
# =============================================

# =============================================
# Stage 1: Base Image
# =============================================
FROM node:20-alpine AS base

# Install essential packages
RUN apk add --no-cache \
    dumb-init \
    libc6-compat

WORKDIR /app

# =============================================
# Stage 2: Dependencies
# =============================================
FROM base AS deps

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for building)
RUN npm ci

# =============================================
# Stage 3: Development
# =============================================
FROM base AS development

# Set environment
ENV NODE_ENV=development

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Copy source code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 4003

# Use dumb-init to handle PID 1
ENTRYPOINT ["dumb-init", "--"]

# Start development server with hot-reload
CMD ["npm", "run", "dev"]

# =============================================
# Stage 4: Builder
# =============================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm ci --only=production && npm cache clean --force

# =============================================
# Stage 5: Production
# =============================================
FROM base AS production

# Set environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 expressjs

WORKDIR /app

# Copy built application
COPY --from=builder --chown=expressjs:nodejs /app/dist ./dist
COPY --from=builder --chown=expressjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=expressjs:nodejs /app/package*.json ./

# Copy necessary files
COPY --chown=expressjs:nodejs data ./data

# Create logs directory with proper permissions
RUN mkdir -p logs && chown -R expressjs:nodejs logs

# Switch to non-root user
USER expressjs

# Expose port
EXPOSE 4003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:4003/api/v1/health || exit 1

# Use dumb-init to handle PID 1
ENTRYPOINT ["dumb-init", "--"]

# Start production server
CMD ["node", "dist/server.js"]
