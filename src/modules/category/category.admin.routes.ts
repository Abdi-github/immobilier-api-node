import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { categoryController } from './category.controller.js';
import { categoryValidators } from './category.validator.js';

const router = Router();

/**
 * @route   POST /api/v1/admin/categories
 * @desc    Create a new category
 * @access  Admin (requires categories:create permission)
 */
router.post(
  '/',
  authenticate,
  requirePermission('categories:create'),
  categoryValidators.createBody,
  validate,
  categoryController.create
);

/**
 * @route   PATCH /api/v1/admin/categories/:id
 * @desc    Update a category
 * @access  Admin (requires categories:create permission - used for both create and update)
 */
router.patch(
  '/:id',
  authenticate,
  requirePermission('categories:create'),
  categoryValidators.idParam,
  categoryValidators.updateBody,
  validate,
  categoryController.update
);

/**
 * @route   DELETE /api/v1/admin/categories/:id
 * @desc    Delete a category
 * @access  Admin (requires categories:delete permission)
 */
router.delete(
  '/:id',
  authenticate,
  requirePermission('categories:delete'),
  categoryValidators.idParam,
  validate,
  categoryController.delete
);

export default router;
