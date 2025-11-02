import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { cantonController, cityController } from './location.controller.js';
import { cantonValidators, cityValidators } from './location.validator.js';

const router = Router();

// ========================
// CANTON ADMIN ROUTES
// ========================

/**
 * @route   POST /api/v1/admin/locations/cantons
 * @desc    Create a new canton
 * @access  Admin (requires locations:create permission)
 */
router.post(
  '/cantons',
  authenticate,
  requirePermission('locations:create'),
  cantonValidators.createBody,
  validate,
  cantonController.create
);

/**
 * @route   PATCH /api/v1/admin/locations/cantons/:id
 * @desc    Update a canton
 * @access  Admin (requires locations:update permission)
 */
router.patch(
  '/cantons/:id',
  authenticate,
  requirePermission('locations:update'),
  cantonValidators.idParam,
  cantonValidators.updateBody,
  validate,
  cantonController.update
);

/**
 * @route   DELETE /api/v1/admin/locations/cantons/:id
 * @desc    Delete a canton
 * @access  Admin (requires locations:delete permission)
 */
router.delete(
  '/cantons/:id',
  authenticate,
  requirePermission('locations:delete'),
  cantonValidators.idParam,
  validate,
  cantonController.delete
);

// ========================
// CITY ADMIN ROUTES
// ========================

/**
 * @route   POST /api/v1/admin/locations/cities
 * @desc    Create a new city
 * @access  Admin (requires locations:create permission)
 */
router.post(
  '/cities',
  authenticate,
  requirePermission('locations:create'),
  cityValidators.createBody,
  validate,
  cityController.create
);

/**
 * @route   PATCH /api/v1/admin/locations/cities/:id
 * @desc    Update a city
 * @access  Admin (requires locations:update permission)
 */
router.patch(
  '/cities/:id',
  authenticate,
  requirePermission('locations:update'),
  cityValidators.idParam,
  cityValidators.updateBody,
  validate,
  cityController.update
);

/**
 * @route   DELETE /api/v1/admin/locations/cities/:id
 * @desc    Delete a city
 * @access  Admin (requires locations:delete permission)
 */
router.delete(
  '/cities/:id',
  authenticate,
  requirePermission('locations:delete'),
  cityValidators.idParam,
  validate,
  cityController.delete
);

export default router;
