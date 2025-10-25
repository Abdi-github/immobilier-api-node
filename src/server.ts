import { createApp } from './app.js';
import config, { validateConfig } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { logger } from './shared/logger/index.js';
import { initializeEmailService, shutdownEmailService } from './modules/email/index.js';

const startServer = async (): Promise<void> => {
  try {
    validateConfig();
    await connectDatabase();
    await connectRedis();
    await initializeEmailService(); // needs redis
    const app = createApp();

    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server started successfully`, {
        port: config.port,
        environment: config.env,
        apiVersion: config.apiVersion,
        healthEndpoint: `http://localhost:${config.port}${config.apiPrefix}/${config.apiVersion}/health`,
      });
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          const { disconnectDatabase } = await import('./config/database.js');
          const { disconnectRedis } = await import('./config/redis.js');

          // Shutdown email service (closes Bull queue)
          await shutdownEmailService();

          await disconnectDatabase();
          await disconnectRedis();

          logger.info('All connections closed. Exiting...');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // TODO(abdi): maybe make this configurable?
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
