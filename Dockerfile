# Multi-stage Dockerfile for EliteCruit Full-Stack Deployment

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY Frontend/package*.json ./
RUN npm ci

COPY Frontend/ ./
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5400

# Install backend production dependencies
COPY Backend/package*.json ./Backend/
WORKDIR /app/Backend
RUN npm ci --only=production

# Copy backend source
COPY Backend/ ./

# Copy built frontend from Stage 1 into Frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/Frontend/dist

EXPOSE 5400

CMD ["node", "server.js"]
