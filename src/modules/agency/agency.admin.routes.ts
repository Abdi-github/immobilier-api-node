import { Router } from 'express';

import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import { validate } from '../../shared/middlewares/index.js';

import { agencyController } from './agency.controller.js';
import {
  listAgenciesValidator,
  getAgencyByIdValidator,
  createAgencyValidator,
  updateAgencyValidator,
  deleteAgencyValidator,
  verifyAgencyValidator,
  updateAgencyStatusValidator,
} from './agency.validator.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/admin/agencies/statistics
 * @desc    Get agency statistics
 * @access  Admin (agencies:read permission)
 */
router.get('/statistics', requirePermission('agencies:read'), agencyController.getStatistics);

/**
 * @route   GET /api/v1/admin/agencies
 * @desc    Get all agencies (admin view with all statuses)
 * @access  Admin (agencies:read permission)
 */
router.get(
  '/',
  requirePermission('agencies:read'),
  listAgenciesValidator,
  validate,
  agencyController.getAll
);

/**
 * @route   POST /api/v1/admin/agencies
 * @desc    Create a new agency
 * @access  Admin (agencies:create permission)
 */
router.post(
  '/',
  requirePermission('agencies:create'),
  createAgencyValidator,
  validate,
  agencyController.create
);

/**
 * @route   GET /api/v1/admin/agencies/:id
 * @desc    Get agency by ID (admin view)
 * @access  Admin (agencies:read permission)
 */
router.get(
  '/:id',
  requirePermission('agencies:read'),
  getAgencyByIdValidator,
  validate,
  agencyController.getById
);

/**
 * @route   PATCH /api/v1/admin/agencies/:id
 * @desc    Update an agency
 * @access  Admin (agencies:manage permission)
 */
router.patch(
  '/:id',
  requirePermission('agencies:manage'),
  updateAgencyValidator,
  validate,
  agencyController.update
);

/**
 * @route   DELETE /api/v1/admin/agencies/:id
 * @desc    Delete an agency
 * @access  Admin (agencies:delete permission)
 */
router.delete(
  '/:id',
  requirePermission('agencies:delete'),
  deleteAgencyValidator,
  validate,
  agencyController.delete
);

/**
 * @route   POST /api/v1/admin/agencies/:id/verify
 * @desc    Verify an agency
 * @access  Admin (agencies:manage permission)
 */
router.post(
  '/:id/verify',
  requirePermission('agencies:manage'),
  verifyAgencyValidator,
  validate,
  agencyController.verify
);

/**
 * @route   POST /api/v1/admin/agencies/:id/unverify
 * @desc    Remove agency verification
 * @access  Admin (agencies:manage permission)
 */
router.post(
  '/:id/unverify',
  requirePermission('agencies:manage'),
  verifyAgencyValidator,
  validate,
  agencyController.unverify
);

/**
 * @route   PATCH /api/v1/admin/agencies/:id/status
 * @desc    Update agency status
 * @access  Admin (agencies:manage permission)
 */
router.patch(
  '/:id/status',
  requirePermission('agencies:manage'),
  updateAgencyStatusValidator,
  validate,
  agencyController.updateStatus
);

export { router as agencyAdminRouter };
export default router;
