import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, ValidationError } from 'express-validator';

import { sendErrorResponse } from '../utils/response.helper.js';

/**
 * Middleware to validate request using express-validator
 * Can be used in two ways:
 * 1. As a standalone middleware after validation chains: router.post('/path', validators, validate, handler)
 * 2. By passing validation chains: router.post('/path', validate(validators), handler)
 */
export function validate(req: Request, res: Response, next: NextFunction): void;
export function validate(
  validations: ValidationChain[]
): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export function validate(
  reqOrValidations: Request | ValidationChain[],
  res?: Response,
  next?: NextFunction
): void | ((req: Request, res: Response, next: NextFunction) => Promise<void>) {
  // If called with validation chains (factory pattern)
  if (Array.isArray(reqOrValidations)) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Run all validations
      await Promise.all(reqOrValidations.map((validation) => validation.run(req)));

      // Check for validation errors
      const errors = validationResult(req);

      if (errors.isEmpty()) {
        next();
        return;
      }

      // Format errors
      const formattedErrors = errors.array().map((error: ValidationError) => ({
        field: error.type === 'field' ? (error as any).path : undefined,
        message: error.msg as string,
      }));

      sendErrorResponse(res, 400, 'Validation Error', formattedErrors);
    };
  }

  // If called as standalone middleware (after validation chains)
  const req = reqOrValidations as Request;
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    next!();
    return;
  }

  // Format errors
  const formattedErrors = errors.array().map((error: ValidationError) => ({
    field: error.type === 'field' ? (error as any).path : undefined,
    message: error.msg as string,
  }));

  sendErrorResponse(res!, 400, 'Validation Error', formattedErrors);
}

export default validate;
