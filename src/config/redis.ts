import { Redis as RedisClass, RedisOptions } from 'ioredis';

import config from './index.js';
import { logger } from '../shared/logger/index.js';

let redisClient: RedisClass | null = null;

/**
 * Create and connect Redis client
 */
export const connectRedis = async (): Promise<RedisClass> => {
  try {
    logger.info('Connecting to Redis...', {
      host: config.redis.host,
      port: config.redis.port,
    });

    const options: RedisOptions = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry attempt ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    const client = new RedisClass(options);

    // Connection event handlers
    client.on('connect', () => {
      logger.info('Redis client connected');
    });

    client.on('ready', () => {
      logger.info('Redis client ready');
    });

    client.on('error', (error: Error) => {
      logger.error('Redis connection error:', error);
    });

    client.on('close', () => {
      logger.warn('Redis connection closed');
    });

    client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    // Wait for connection to be ready
    await new Promise<void>((resolve, reject) => {
      if (client.status === 'ready') {
        resolve();
        return;
      }

      client.once('ready', () => resolve());
      client.once('error', (err: Error) => reject(err));
    });

    redisClient = client;
    logger.info('Redis connected successfully');
    return client;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
};

/**
 * Get Redis client instance
 */
export const getRedisClient = (): RedisClass => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

/**
 * Disconnect Redis client
 */
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('Redis disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
      throw error;
    }
  }
};

/**
 * Check if Redis is connected
 */
export const isRedisConnected = (): boolean => {
  return redisClient?.status === 'ready';
};

export default { connectRedis, getRedisClient, disconnectRedis, isRedisConnected };
