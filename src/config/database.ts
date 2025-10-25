import mongoose from 'mongoose';

import config from './index.js';
import { logger } from '../shared/logger/index.js';

// MongoDB connection options
const mongooseOptions: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4
};

/**
 * Connect to MongoDB database
 */
export const connectDatabase = async (): Promise<typeof mongoose> => {
  try {
    logger.info('Connecting to MongoDB...', {
      uri: config.mongodb.uri.replace(/\/\/.*@/, '//<credentials>@'),
    });

    const connection = await mongoose.connect(config.mongodb.uri, mongooseOptions);

    logger.info('MongoDB connected successfully', {
      host: connection.connection.host,
      port: connection.connection.port,
      name: connection.connection.name,
    });

    // Connection event handlers
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to app termination');
      process.exit(0);
    });

    return connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Check if database is connected
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

export default { connectDatabase, disconnectDatabase, isDatabaseConnected };
