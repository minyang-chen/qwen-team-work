FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY packages/web-ui/client/package*.json ./packages/web-ui/client/

# Install dependencies
RUN npm ci

# Copy client source
COPY packages/web-ui/client ./packages/web-ui/client

# Build client
RUN npm run build -w @qwen-code/web-ui-client

# Production stage with nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/packages/web-ui/client/dist /usr/share/nginx/html

# Copy nginx config
COPY packages/web-ui/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
