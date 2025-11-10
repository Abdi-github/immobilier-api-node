/**
 * Custom Application Error class
 * Extends the built-in Error class with additional properties for HTTP error handling
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly status: string;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly errors?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number,
    codeOrErrors?: string | Array<{ field?: string; message: string }>
  ) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Handle both error code (string) and validation errors (array)
    if (typeof codeOrErrors === 'string') {
      this.code = codeOrErrors;
    } else if (Array.isArray(codeOrErrors)) {
      this.errors = codeOrErrors;
    }

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Type guard to check if error is an AppError
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

// Common HTTP error factory functions
export const BadRequestError = (
  message = 'Bad Request',
  errors?: Array<{ field?: string; message: string }>
): AppError => new AppError(message, 400, errors);

export const UnauthorizedError = (message = 'Unauthorized'): AppError => new AppError(message, 401);

export const ForbiddenError = (message = 'Forbidden'): AppError => new AppError(message, 403);

export const NotFoundError = (message = 'Resource not found'): AppError =>
  new AppError(message, 404);

export const ConflictError = (message = 'Conflict'): AppError => new AppError(message, 409);

export const ValidationError = (errors: Array<{ field?: string; message: string }>): AppError =>
  new AppError('Validation Error', 422, errors);

export const TooManyRequestsError = (message = 'Too many requests'): AppError =>
  new AppError(message, 429);

export const InternalServerError = (message = 'Internal Server Error'): AppError =>
  new AppError(message, 500);

export default AppError;
