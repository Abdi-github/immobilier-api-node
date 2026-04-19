import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';

import config from './config/index.js';
import { swaggerSpec } from './config/swagger.js';
import { logger, morganStream } from './shared/logger/index.js';
import { errorHandler, notFoundHandler } from './shared/errors/index.js';
import { languageMiddleware, guestRateLimiter } from './shared/middlewares/index.js';
import { sendSuccessResponse } from './shared/utils/response.helper.js';
import publicRoutes from './api/v1/public/index.js';
import adminRoutes from './api/v1/admin/index.js';
import agencyRoutes from './api/v1/agency/index.js';
import agentRoutes from './api/v1/agent/index.js';

export const createApp = (): Application => {
  const app = express();

  // Trust proxy (for rate limiting behind reverse proxy)
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet());
  app.use(hpp()); // Prevent HTTP Parameter Pollution

  // CORS configuration
  app.use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language', 'X-Request-ID'],
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // HTTP request logging (skip in test environment)
  if (!config.isTest) {
    app.use(
      morgan(config.isDevelopment ? 'dev' : 'combined', {
        stream: morganStream,
      })
    );
  }

  // Language resolution middleware
  app.use(languageMiddleware);

  // Rate limiting for all routes (basic protection)
  app.use(guestRateLimiter);

  // Health check endpoint (before API routes)
  app.get(`${config.apiPrefix}/${config.apiVersion}/health`, (_req: Request, res: Response) => {
    sendSuccessResponse(res, 200, 'API is healthy', {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.env,
      version: config.apiVersion,
    });
  });

  // API Routes
  app.use(`${config.apiPrefix}/${config.apiVersion}/public`, publicRoutes);
  app.use(`${config.apiPrefix}/${config.apiVersion}/admin`, adminRoutes);
  app.use(`${config.apiPrefix}/${config.apiVersion}/agency`, agencyRoutes);
  app.use(`${config.apiPrefix}/${config.apiVersion}/agent`, agentRoutes);

  // Root route → redirect to docs
  const apiBase = `${config.apiPrefix}/${config.apiVersion}`;
  app.get('/', (_req: Request, res: Response) => {
    res.redirect(`${apiBase}/docs`);
  });
  app.get(apiBase, (_req: Request, res: Response) => {
    sendSuccessResponse(res, 200, 'Immobilier.ch API is running', {
      version: config.apiVersion,
      documentation: `${apiBase}/docs`,
    });
  });

  // Swagger API docs
  app.use(
    `${apiBase}/docs`,
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Immobilier.ch API Documentation',
    })
  );

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  logger.info('Express app created and configured');

  return app;
};

export default createApp;
