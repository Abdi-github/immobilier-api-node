import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { cantonController } from './location.controller.js';
import { cantonValidators } from './location.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/public/locations/cantons
 * @desc    Get all cantons with optional filtering, pagination, and search
 * @access  Public
 */
router.get('/', cantonValidators.listQuery, validate, cantonController.getAll);

/**
 * @route   GET /api/v1/public/locations/cantons/code/:code
 * @desc    Get canton by code (e.g., VD, FR, GE)
 * @access  Public
 */
router.get('/code/:code', cantonValidators.codeParam, validate, cantonController.getByCode);

/**
 * @route   GET /api/v1/public/locations/cantons/:id
 * @desc    Get canton by ID
 * @access  Public
 */
router.get('/:id', cantonValidators.idParam, validate, cantonController.getById);

/**
 * @route   GET /api/v1/public/locations/cantons/:id/cities
 * @desc    Get all cities in a canton
 * @access  Public
 */
// Note: This route is defined here for convenience, but cities are handled by city.routes.ts
// It redirects to the city controller's getByCantonId method
import { cityController } from './location.controller.js';
import { cityValidators } from './location.validator.js';

router.get(
  '/:id/cities',
  cantonValidators.idParam,
  cityValidators.listQuery,
  validate,
  cityController.getByCantonId
);

export default router;
