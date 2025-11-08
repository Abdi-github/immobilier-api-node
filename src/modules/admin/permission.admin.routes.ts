import { Router } from 'express';
import { permissionController } from './permission.controller.js';
import { permissionValidators } from './permission.validator.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/v1/admin/permissions/resources
 * @desc    Get all unique resources
 * @access  Admin (admin:read)
 */
router.get('/resources', requirePermission('admin:read'), permissionController.getResources);

/**
 * @route   GET /api/v1/admin/permissions/grouped
 * @desc    Get permissions grouped by resource
 * @access  Admin (admin:read)
 */
router.get(
  '/grouped',
  requirePermission('admin:read'),
  permissionValidators.getAll,
  validate,
  permissionController.getGrouped
);

/**
 * @route   GET /api/v1/admin/permissions/active
 * @desc    Get all active permissions
 * @access  Admin (admin:read)
 */
router.get(
  '/active',
  requirePermission('admin:read'),
  permissionValidators.getAll,
  validate,
  permissionController.getAllActive
);

/**
 * @route   GET /api/v1/admin/permissions/name/:name
 * @desc    Get permission by name
 * @access  Admin (admin:read)
 */
router.get(
  '/name/:name',
  requirePermission('admin:read'),
  permissionValidators.getByName,
  validate,
  permissionController.getByName
);

/**
 * @route   GET /api/v1/admin/permissions/resource/:resource
 * @desc    Get permissions by resource
 * @access  Admin (admin:read)
 */
router.get(
  '/resource/:resource',
  requirePermission('admin:read'),
  permissionValidators.getByResource,
  validate,
  permissionController.getByResource
);

/**
 * @route   GET /api/v1/admin/permissions
 * @desc    Get all permissions with pagination
 * @access  Admin (admin:read)
 */
router.get(
  '/',
  requirePermission('admin:read'),
  permissionValidators.getAll,
  validate,
  permissionController.getAll
);

/**
 * @route   GET /api/v1/admin/permissions/:id
 * @desc    Get permission by ID
 * @access  Admin (admin:read)
 */
router.get(
  '/:id',
  requirePermission('admin:read'),
  permissionValidators.getById,
  validate,
  permissionController.getById
);

/**
 * @route   POST /api/v1/admin/permissions
 * @desc    Create a new permission
 * @access  Admin (admin:create)
 */
router.post(
  '/',
  requirePermission('admin:create'),
  permissionValidators.create,
  validate,
  permissionController.create
);

/**
 * @route   PUT /api/v1/admin/permissions/:id
 * @desc    Update a permission
 * @access  Admin (admin:manage)
 */
router.put(
  '/:id',
  requirePermission('admin:manage'),
  permissionValidators.update,
  validate,
  permissionController.update
);

/**
 * @route   DELETE /api/v1/admin/permissions/:id
 * @desc    Soft delete (deactivate) a permission
 * @access  Admin (admin:manage)
 */
router.delete(
  '/:id',
  requirePermission('admin:manage'),
  permissionValidators.delete,
  validate,
  permissionController.softDelete
);

/**
 * @route   DELETE /api/v1/admin/permissions/:id/permanent
 * @desc    Permanently delete a permission
 * @access  Admin (admin:manage)
 */
router.delete(
  '/:id/permanent',
  requirePermission('admin:manage'),
  permissionValidators.delete,
  validate,
  permissionController.delete
);

export default router;
