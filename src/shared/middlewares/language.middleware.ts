import { Request, Response, NextFunction } from 'express';

import { resolveLanguage } from '../utils/language.helper.js';
import { SupportedLanguage } from '../../config/index.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      language: SupportedLanguage;
    }
  }
}

/**
 * Middleware to resolve and attach language to request
 */
export const languageMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  req.language = resolveLanguage(req);
  next();
};

export default languageMiddleware;
