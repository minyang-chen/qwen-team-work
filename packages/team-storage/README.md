# Team Workspace Backend

Express.js backend API for Qwen Code team workspace feature.

## Features

- ✅ User authentication (signup, login)
- ✅ JWT session management
- ✅ Team creation and management
- ✅ API key generation
- ✅ NFS workspace provisioning
- ✅ PostgreSQL with pgvector
- ✅ MongoDB session storage

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.team
# Edit .env.team with your settings

# Start infrastructure (from project root)
docker-compose -f ../../infrastructure/infrastructure.yml up -d

# Start development server
npm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Authentication

**POST /api/auth/signup**
```json
{
  "username": "john",
  "email": "john@example.com",
  "full_name": "John Doe",
  "password": "password123"
}
```

**POST /api/auth/login**
```json
{
  "username": "john",
  "password": "password123"
}
```

### Teams (Requires Authentication)

**POST /api/teams/create**
```json
{
  "team_name": "AI Research Team",
  "specialization": "Machine Learning",
  "description": "Optional description"
}
```

**POST /api/teams/join**
```json
{
  "team_id": "uuid-of-team"
}
```

**POST /api/teams/signin**
```json
{
  "team_id": "uuid-of-team",
  "username": "john",
  "password": "password123"
}
```

## Environment Variables

```env
PORT=3001
NODE_ENV=development

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=admin
POSTGRES_PASSWORD=changeme
POSTGRES_DB=qwen_users

MONGODB_URI=mongodb://admin:changeme@localhost:27017/qwen_sessions?authSource=admin

NFS_BASE_PATH=../../infrastructure/nfs-data

JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h

OPENAI_API_KEY=your-openai-api-key

BCRYPT_ROUNDS=10
```

## Project Structure

```
src/
├── config/
│   ├── env.ts              # Environment configuration
│   └── database.ts         # Database connections
├── services/
│   ├── userService.ts      # User management
│   ├── sessionService.ts   # JWT sessions
│   ├── apiKeyService.ts    # API key generation
│   ├── nfsService.ts       # Workspace creation
│   └── teamService.ts      # Team management
├── controllers/
│   ├── authController.ts   # Auth endpoints
│   └── teamController.ts   # Team endpoints
├── middleware/
│   └── authMiddleware.ts   # JWT validation
├── routes/
│   └── index.ts           # API routes
└── index.ts               # Express server
```

## Development

```bash
# Development with auto-reload
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Testing

```bash
# Test signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","full_name":"Test User","password":"test123"}'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Test create team (replace TOKEN)
curl -X POST http://localhost:3001/api/teams/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"team_name":"Test Team"}'
```

## Database Schema

### PostgreSQL Tables
- `users` - User accounts
- `teams` - Team information
- `team_members` - User-team relationships
- `api_keys` - User API keys
- `file_embeddings` - Vector embeddings (for future search)

### MongoDB Collections
- `user_sessions` - User login sessions
- `team_sessions` - Team workspace sessions

## Security

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens for session management
- Rate limiting on all endpoints
- CORS enabled
- Helmet security headers
- SQL injection prevention (parameterized queries)

## License

Same as Qwen Code main project
