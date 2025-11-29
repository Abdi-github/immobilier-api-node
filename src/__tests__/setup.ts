/**
 * Jest Test Setup
 *
 * This file runs before all tests and sets up the test environment.
 * It handles database connections, test data cleanup, and global mocks.
 */

import mongoose from 'mongoose';

// Increase timeout for setup
jest.setTimeout(60000);

/**
 * Connect to MongoDB test database before all tests
 * Uses the Docker MongoDB container with a test database
 */
beforeAll(async () => {
  // Use test database in Docker MongoDB container
  const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://mongodb:27017/immobilier_test';

  await mongoose.connect(mongoUri);
});

/**
 * Clear all test data after each test
 */
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

/**
 * Disconnect from MongoDB after all tests
 */
afterAll(async () => {
  await mongoose.disconnect();
});

// Mock Redis client for testing
jest.mock('../config/redis.js', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    exists: jest.fn().mockResolvedValue(0),
    expire: jest.fn().mockResolvedValue(1),
    quit: jest.fn().mockResolvedValue('OK'),
  }),
  closeRedisClient: jest.fn().mockResolvedValue(undefined),
}));

// Mock logger to reduce noise in tests
jest.mock('../shared/logger/index.js', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
  morganStream: {
    write: jest.fn(),
  },
}));

// Suppress console output during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
