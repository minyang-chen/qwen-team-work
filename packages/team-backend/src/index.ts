// @ts-nocheck
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
const rateLimit = require('express-rate-limit');
import { connectMongoDB } from './config/database';
import { configManager, backendLogger, errorHandler } from '@qwen-team/shared';
import routes from './routes';

// Load and validate configuration
const config = configManager.getBackendConfig();
const logger = backendLogger.child({ service: 'team-backend' });

const app = express();

// Middleware
app.use(helmet());

// Restrictive CORS - only allow team-ui-server
const allowedOrigins = [
  'http://localhost:8002',  // team-ui-server (development)
  'http://team-ui-server:8002',  // team-ui-server (Docker)
  config.TEAM_UI_SERVER_URL,  // configurable UI server URL
  config.CORS_ORIGIN !== '*' ? config.CORS_ORIGIN : undefined
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('Blocked CORS request from unauthorized origin', { origin });
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000
});
app.use(limiter as any);

// Routes
app.use(routes);

// Error handling
app.use(errorHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'team-backend'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectMongoDB();
    
    app.listen(config.PORT, () => {
      logger.info('Backend server started', {
        port: config.PORT,
        env: config.NODE_ENV,
        allowedOrigins
      });
    });
  } catch (error) {
    logger.error('Failed to start server', {}, error as Error);
    process.exit(1);
  }
};

startServer();
