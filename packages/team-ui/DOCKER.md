# Docker Deployment Guide

## Quick Start

```bash
# From packages/web-ui directory
docker-compose up -d
```

Access the web UI at: http://localhost

## Important Note

The Docker build requires the monorepo context because the server depends on `@qwen-code/core`. The `docker-compose.yml` is configured to build from the repository root (`context: ../..`).

## Configuration

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Edit `.env` with your credentials:

```bash
# Required
JWT_SECRET=your-secret-key-here

# Optional: OpenAI-compatible API
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4

# Optional: Qwen OAuth
QWEN_CLIENT_ID=your-client-id
QWEN_CLIENT_SECRET=your-client-secret
```

3. Start the services:

```bash
docker-compose up -d
```

## Services

- **client**: Nginx serving React frontend on port 80
- **server**: Node.js backend on port 3000
- **network**: Bridge network for inter-service communication

## Building Images

Build individual images from the repository root:

```bash
# From repository root (qwen-code/)
# Server
docker build -f packages/web-ui/server/Dockerfile -t qwen-code-server .

# Client
docker build -f packages/web-ui/client/Dockerfile -t qwen-code-client .
```

The build context must be the repository root to include the `@qwen-code/core` package.

## Volumes

The server container mounts `~/.qwen` to persist OAuth credentials:

```yaml
volumes:
  - ~/.qwen:/root/.qwen
```

## Ports

- `80`: Client (nginx)
- `3000`: Server (API + WebSocket)

## Logs

View logs:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
```

## Stopping

```bash
# Stop services
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes
docker-compose down -v
```

## Production Deployment

For production, consider:

1. **Use a reverse proxy** (nginx/traefik) with SSL
2. **Set strong JWT_SECRET**
3. **Configure CORS_ORIGIN** to your domain
4. **Use Docker secrets** for sensitive data
5. **Set up health checks**
6. **Configure resource limits**

Example with SSL:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - '443:443'
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - client
      - server
```

## Troubleshooting

### Container won't start

Check logs:

```bash
docker-compose logs server
```

### Can't connect to server

Ensure services are on the same network:

```bash
docker network inspect qwen-network
```

### OAuth credentials not persisting

Check volume mount:

```bash
docker-compose exec server ls -la /root/.qwen
```

## Development

For development with hot reload:

```bash
# Use the dev setup instead
npm run web-ui:dev
```

Docker is recommended for production deployment only.
