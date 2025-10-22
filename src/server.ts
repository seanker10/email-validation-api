/**
 * Email Validation API Server
 * Main entry point for the application
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import 'express-async-errors';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import validationRoutes from './routes/validation';
import healthRoutes from './routes/health';
import { initializeRedis } from './config/redis';
import { initializeDatabase } from './config/database';
import { initializeDisposableDomains } from './utils/disposable';

// Load environment variables
dotenv.config();

// Initialize logger
const logger = createLogger();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create and configure Express application
 */
function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    credentials: true
  }));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Trust proxy if configured
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // Request logging middleware
  app.use(requestLogger);

  // Health check route (no authentication required)
  app.use('/health', healthRoutes);

  // API routes
  const apiBasePath = process.env.API_BASE_PATH || '/api';
  const apiVersion = process.env.API_VERSION || 'v1';
  app.use(`${apiBasePath}/${apiVersion}`, validationRoutes);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'Email Validation API',
      version: '1.0.0',
      status: 'running',
      documentation: `${apiBasePath}/${apiVersion}/docs`,
      endpoints: {
        validate: `${apiBasePath}/${apiVersion}/validate`,
        batch: `${apiBasePath}/${apiVersion}/batch`,
        health: '/health'
      }
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'The requested endpoint does not exist',
      path: req.path
    });
  });

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Initialize all services and start the server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting Email Validation API...', { env: NODE_ENV });

    // Initialize Redis connection
    logger.info('Connecting to Redis...');
    await initializeRedis();
    logger.info('Redis connected successfully');

    // Initialize database connection
    logger.info('Connecting to database...');
    await initializeDatabase();
    logger.info('Database connected successfully');

    // Initialize disposable domains list
    logger.info('Loading disposable domains list...');
    await initializeDisposableDomains();
    logger.info('Disposable domains loaded successfully');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server is running on ${HOST}:${PORT}`, {
        port: PORT,
        host: HOST,
        env: NODE_ENV
      });
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          // Close Redis connection
          const { getRedisClient } = await import('./config/redis');
          const redis = getRedisClient();
          if (redis) {
            await redis.quit();
            logger.info('Redis connection closed');
          }

          // Close database connection
          const { getDatabaseClient } = await import('./config/database');
          const db = getDatabaseClient();
          if (db) {
            await db.disconnect();
            logger.info('Database connection closed');
          }

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}

export { createApp, startServer };
