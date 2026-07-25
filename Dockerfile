# Use Bun image to run scripts and serve static build
FROM oven/bun:1.2.20-alpine

# Install curl for health checks, Node.js for Expo CLI, and build tools for native deps
RUN apk add --no-cache curl nodejs npm python3 make g++

# Set env vars (override NODE_ENV during install below)
ENV NODE_ENV=production
ENV EXPO_NO_TELEMETRY=1

WORKDIR /app

# Install dependencies (ajv@8 in package.json fixes codegen module issue)
COPY package.json bun.lock ./
RUN NODE_ENV=development bun install

# Copy the rest of the source
COPY . .

# EXPO_PUBLIC_* vars are inlined during `expo export` (build time). Receive the
# Stripe link as a build arg so a dashboard env var can override the code default.
ARG EXPO_PUBLIC_STRIPE_BUY_URL
ENV EXPO_PUBLIC_STRIPE_BUY_URL=$EXPO_PUBLIC_STRIPE_BUY_URL

# Build static web export to dist/ using Node (avoids Bun sideEffects warning)
RUN node ./node_modules/.bin/expo export --platform web

# Run post-build script to set up PWA manifest and icons
RUN node scripts/post-build.js

# Remove build tools and Node to slim image
RUN apk del python3 make g++

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership of the app directory
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check - optimized for faster startup
HEALTHCHECK --interval=15s --timeout=2s --start-period=3s --retries=2 \
  CMD curl -f http://localhost:$PORT/health || exit 1

CMD ["bun", "run", "serve:dist"]
