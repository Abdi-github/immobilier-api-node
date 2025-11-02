import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { amenityController } from './amenity.controller.js';
import { amenityValidator } from './amenity.validator.js';

const router = Router();

/**
 * All admin routes require authentication
 */
router.use(authenticate);

/**
 * @route   GET /api/v1/admin/amenities
 * @desc    Get all amenities (including inactive)
 * @access  Admin (amenities:read)
 * @query   page, limit, sort, is_active, group, search, lang
 */
router.get(
  '/',
  requirePermission('amenities:read'),
  amenityValidator.listQuery,
  validate,
  amenityController.getAll
);

/**
 * @route   POST /api/v1/admin/amenities
 * @desc    Create a new amenity
 * @access  Admin (amenities:create)
 */
router.post(
  '/',
  requirePermission('amenities:create'),
  amenityValidator.createBody,
  validate,
  amenityController.create
);

/**
 * @route   PATCH /api/v1/admin/amenities/:id
 * @desc    Update an amenity
 * @access  Admin (amenities:create)
 */
router.patch(
  '/:id',
  requirePermission('amenities:create'),
  amenityValidator.idParam,
  amenityValidator.updateBody,
  validate,
  amenityController.update
);

/**
 * @route   DELETE /api/v1/admin/amenities/:id
 * @desc    Delete an amenity
 * @access  Admin (amenities:delete)
 */
router.delete(
  '/:id',
  requirePermission('amenities:delete'),
  amenityValidator.idParam,
  validate,
  amenityController.delete
);

export default router;
