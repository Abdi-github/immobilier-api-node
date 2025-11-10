import { Request, Response, NextFunction } from 'express';

import { isAppError } from './AppError.js';
import { logger } from '../logger/index.js';
import config from '../../config/index.js';
import { sendErrorResponse } from '../utils/response.helper.js';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Error caught by global handler:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Handle AppError instances
  if (isAppError(err)) {
    sendErrorResponse(res, err.statusCode, err.message, err.errors);
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values((err as any).errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    sendErrorResponse(res, 400, 'Validation Error', errors);
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    sendErrorResponse(res, 400, `Invalid ${(err as any).path}: ${(err as any).value}`);
    return;
  }

  // Handle Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue)[0];
    sendErrorResponse(res, 409, `Duplicate field value: ${field}. Please use another value.`);
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendErrorResponse(res, 401, 'Invalid token. Please log in again.');
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendErrorResponse(res, 401, 'Your token has expired. Please log in again.');
    return;
  }

  // Default error response
  const statusCode = 500;
  const message = config.isProduction ? 'Internal Server Error' : err.message;

  sendErrorResponse(res, statusCode, message);
};

/**
 * Handle 404 Not Found errors
 */
export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  const message = `Cannot ${req.method} ${req.originalUrl}`;
  sendErrorResponse(res, 404, message);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default { errorHandler, notFoundHandler, asyncHandler };
