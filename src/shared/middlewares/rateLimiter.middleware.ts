import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

import config from '../../config/index.js';
import { sendErrorResponse } from '../utils/response.helper.js';

/**
 * Create rate limiter for different user types
 */
const createRateLimiter = (maxRequests: number, keyPrefix: string) => {
  const options: Parameters<typeof rateLimit>[0] = {
    windowMs: config.rateLimit.windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: async (_req: Request, res: Response) => {
      sendErrorResponse(res, 429, 'Too many requests, please try again later.');
    },
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise use IP
      const userId = (req as any).user?.id;
      return userId ? `${keyPrefix}:user:${userId}` : `${keyPrefix}:ip:${req.ip}`;
    },
    skip: (_req: Request) => {
      // Skip rate limiting in test environment
      return config.isTest;
    },
  };

  // Note: Redis store is set up lazily in the middleware if needed
  // For now, we use in-memory store which is fine for development and testing

  return rateLimit(options);
};

/**
 * Rate limiter for guest users
 */
export const guestRateLimiter = createRateLimiter(config.rateLimit.maxRequestsGuest, 'guest');

/**
 * Rate limiter for authenticated users
 */
export const authRateLimiter = createRateLimiter(config.rateLimit.maxRequestsAuth, 'auth');

/**
 * Rate limiter for admin users
 */
export const adminRateLimiter = createRateLimiter(config.rateLimit.maxRequestsAdmin, 'admin');

/**
 * Strict rate limiter for sensitive endpoints (login, register, password reset)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: async (_req: Request, res: Response) => {
    sendErrorResponse(res, 429, 'Too many attempts, please try again after 15 minutes.');
  },
  keyGenerator: (req: Request) => {
    return `strict:${req.ip}:${req.path}`;
  },
  skip: () => config.isTest,
});

export default {
  guestRateLimiter,
  authRateLimiter,
  adminRateLimiter,
  strictRateLimiter,
};
