import { Router } from 'express';
import { RoleController } from './role.controller.js';
import { roleValidators } from './role.validator.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/v1/admin/roles
 * @desc    Get all roles with pagination
 * @access  Admin (requires admin:read permission)
 */
router.get(
  '/',
  requirePermission('admin:read'),
  roleValidators.getAll,
  validate,
  RoleController.getAll
);

/**
 * @route   POST /api/v1/admin/roles
 * @desc    Create a new role
 * @access  Admin (requires admin:create permission)
 */
router.post(
  '/',
  requirePermission('admin:create'),
  roleValidators.create,
  validate,
  RoleController.create
);

/**
 * @route   GET /api/v1/admin/roles/name/:name
 * @desc    Get role by name
 * @access  Admin (requires admin:read permission)
 */
router.get(
  '/name/:name',
  requirePermission('admin:read'),
  roleValidators.getByName,
  validate,
  RoleController.getByName
);

/**
 * @route   GET /api/v1/admin/roles/:id
 * @desc    Get role by ID
 * @access  Admin (requires admin:read permission)
 */
router.get(
  '/:id',
  requirePermission('admin:read'),
  roleValidators.getById,
  validate,
  RoleController.getById
);

/**
 * @route   PUT /api/v1/admin/roles/:id
 * @desc    Update a role
 * @access  Admin (requires admin:manage permission)
 */
router.put(
  '/:id',
  requirePermission('admin:manage'),
  roleValidators.update,
  validate,
  RoleController.update
);

/**
 * @route   DELETE /api/v1/admin/roles/:id
 * @desc    Delete a role
 * @access  Admin (requires admin:manage permission)
 */
router.delete(
  '/:id',
  requirePermission('admin:manage'),
  roleValidators.delete,
  validate,
  RoleController.delete
);

/**
 * @route   GET /api/v1/admin/roles/:id/permissions
 * @desc    Get permissions for a role
 * @access  Admin (requires admin:read permission)
 */
router.get(
  '/:id/permissions',
  requirePermission('admin:read'),
  roleValidators.getById,
  validate,
  RoleController.getPermissions
);

/**
 * @route   PUT /api/v1/admin/roles/:id/permissions
 * @desc    Set permissions for a role (replace all)
 * @access  Admin (requires admin:manage permission)
 */
router.put(
  '/:id/permissions',
  requirePermission('admin:manage'),
  roleValidators.setPermissions,
  validate,
  RoleController.setPermissions
);

/**
 * @route   POST /api/v1/admin/roles/:id/permissions/assign
 * @desc    Assign permissions to a role (add to existing)
 * @access  Admin (requires admin:manage permission)
 */
router.post(
  '/:id/permissions/assign',
  requirePermission('admin:manage'),
  roleValidators.assignPermissions,
  validate,
  RoleController.assignPermissions
);

/**
 * @route   POST /api/v1/admin/roles/:id/permissions/revoke
 * @desc    Revoke permissions from a role
 * @access  Admin (requires admin:manage permission)
 */
router.post(
  '/:id/permissions/revoke',
  requirePermission('admin:manage'),
  roleValidators.assignPermissions,
  validate,
  RoleController.revokePermissions
);

export default router;
