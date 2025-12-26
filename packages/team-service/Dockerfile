FROM node:20-alpine

WORKDIR /app

# Copy root package files and workspace config
COPY package*.json ./
COPY packages/core/package*.json ./packages/core/
COPY packages/web-ui/server/package*.json ./packages/web-ui/server/

# Install all dependencies (including workspace deps)
RUN npm ci

# Copy core package source
COPY packages/core ./packages/core

# Build core package
RUN npm run build -w @qwen-code/core

# Copy server source
COPY packages/web-ui/server ./packages/web-ui/server

# Build server
RUN npm run build -w @qwen-code/web-ui-server

WORKDIR /app/packages/web-ui/server

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "start"]
