import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

import { userController } from './user.controller.js';
import {
  userQueryValidators,
  userCreateValidators,
  userAdminUpdateValidators,
  userStatusValidators,
  userIdValidators,
} from './user.validator.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

// ==========================================
// Admin User Management Routes
// ==========================================

/**
 * @route   GET /api/v1/admin/users/statistics
 * @desc    Get user statistics
 * @access  Admin (users:read)
 */
router.get('/statistics', requirePermission('users:read'), userController.getStatistics);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users with pagination and filters
 * @access  Admin (users:read)
 */
router.get(
  '/',
  requirePermission('users:read'),
  validate(userQueryValidators),
  userController.getAll
);

/**
 * @route   POST /api/v1/admin/users
 * @desc    Create new user
 * @access  Admin (users:create)
 */
router.post(
  '/',
  requirePermission('users:create'),
  validate(userCreateValidators),
  userController.create
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user by ID
 * @access  Admin (users:read)
 */
router.get(
  '/:id',
  requirePermission('users:read'),
  validate(userIdValidators),
  userController.getById
);

/**
 * @route   PUT /api/v1/admin/users/:id
 * @desc    Update user
 * @access  Admin (users:update)
 */
router.put(
  '/:id',
  requirePermission('users:update'),
  validate(userAdminUpdateValidators),
  userController.update
);

/**
 * @route   PATCH /api/v1/admin/users/:id/status
 * @desc    Update user status
 * @access  Admin (users:update)
 */
router.patch(
  '/:id/status',
  requirePermission('users:update'),
  validate(userStatusValidators),
  userController.updateStatus
);

/**
 * @route   POST /api/v1/admin/users/:id/suspend
 * @desc    Suspend user
 * @access  Admin (users:update)
 */
router.post(
  '/:id/suspend',
  requirePermission('users:update'),
  validate(userIdValidators),
  userController.suspend
);

/**
 * @route   POST /api/v1/admin/users/:id/activate
 * @desc    Activate user
 * @access  Admin (users:update)
 */
router.post(
  '/:id/activate',
  requirePermission('users:update'),
  validate(userIdValidators),
  userController.activate
);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Delete user
 * @access  Admin (users:delete)
 */
router.delete(
  '/:id',
  requirePermission('users:delete'),
  validate(userIdValidators),
  userController.delete
);

export default router;
