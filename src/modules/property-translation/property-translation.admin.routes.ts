import { Router } from 'express';

import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';

import { propertyTranslationController } from './property-translation.controller.js';
import {
  translationQueryValidators,
  translationIdParamValidator,
  propertyIdParamValidator,
  createTranslationValidators,
  updateTranslationValidators,
  requestTranslationsValidators,
  rejectTranslationValidators,
  bulkApproveValidators,
} from './property-translation.validator.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/admin/translations
 * @desc    Get all translations (with filtering/pagination)
 * @access  Admin (translations:read)
 */
router.get(
  '/',
  requirePermission('translations:read'),
  translationQueryValidators,
  validate,
  propertyTranslationController.adminGetAll
);

/**
 * @route   GET /api/v1/admin/translations/pending
 * @desc    Get pending translations
 * @access  Admin (translations:read)
 */
router.get(
  '/pending',
  requirePermission('translations:read'),
  translationQueryValidators,
  validate,
  propertyTranslationController.adminGetPending
);

/**
 * @route   GET /api/v1/admin/translations/statistics
 * @desc    Get translation statistics
 * @access  Admin (translations:read)
 */
router.get(
  '/statistics',
  requirePermission('translations:read'),
  propertyTranslationController.adminGetStatistics
);

/**
 * @route   GET /api/v1/admin/translations/:id
 * @desc    Get translation by ID
 * @access  Admin (translations:read)
 */
router.get(
  '/:id',
  requirePermission('translations:read'),
  translationIdParamValidator,
  validate,
  propertyTranslationController.adminGetById
);

/**
 * @route   POST /api/v1/admin/translations
 * @desc    Create a new translation
 * @access  Admin (translations:create)
 */
router.post(
  '/',
  requirePermission('translations:create'),
  createTranslationValidators,
  validate,
  propertyTranslationController.adminCreate
);

/**
 * @route   POST /api/v1/admin/translations/bulk-approve
 * @desc    Bulk approve translations
 * @access  Admin (translations:approve)
 */
router.post(
  '/bulk-approve',
  requirePermission('translations:approve'),
  bulkApproveValidators,
  validate,
  propertyTranslationController.adminBulkApprove
);

/**
 * @route   PATCH /api/v1/admin/translations/:id
 * @desc    Update a translation
 * @access  Admin (translations:create)
 */
router.patch(
  '/:id',
  requirePermission('translations:create'),
  [...translationIdParamValidator, ...updateTranslationValidators],
  validate,
  propertyTranslationController.adminUpdate
);

/**
 * @route   POST /api/v1/admin/translations/:id/approve
 * @desc    Approve a translation
 * @access  Admin (translations:approve)
 */
router.post(
  '/:id/approve',
  requirePermission('translations:approve'),
  translationIdParamValidator,
  validate,
  propertyTranslationController.adminApprove
);

/**
 * @route   POST /api/v1/admin/translations/:id/reject
 * @desc    Reject a translation
 * @access  Admin (translations:approve)
 */
router.post(
  '/:id/reject',
  requirePermission('translations:approve'),
  [...translationIdParamValidator, ...rejectTranslationValidators],
  validate,
  propertyTranslationController.adminReject
);

/**
 * @route   POST /api/v1/admin/translations/:id/reset
 * @desc    Reset translation to pending
 * @access  Admin (translations:approve)
 */
router.post(
  '/:id/reset',
  requirePermission('translations:approve'),
  translationIdParamValidator,
  validate,
  propertyTranslationController.adminReset
);

/**
 * @route   DELETE /api/v1/admin/translations/:id
 * @desc    Delete a translation
 * @access  Admin (translations:delete or translations:manage)
 */
router.delete(
  '/:id',
  requirePermission('translations:delete', 'translations:manage'),
  translationIdParamValidator,
  validate,
  propertyTranslationController.adminDelete
);

// ==========================================
// Property-specific translation routes
// ==========================================

/**
 * @route   GET /api/v1/admin/properties/:propertyId/translations
 * @desc    Get all translations for a property
 * @access  Admin (translations:read)
 */
router.get(
  '/properties/:propertyId/translations',
  requirePermission('translations:read'),
  propertyIdParamValidator,
  validate,
  propertyTranslationController.adminGetByPropertyId
);

/**
 * @route   GET /api/v1/admin/properties/:propertyId/translations/status
 * @desc    Get translation status summary for a property
 * @access  Admin (translations:read)
 */
router.get(
  '/properties/:propertyId/translations/status',
  requirePermission('translations:read'),
  propertyIdParamValidator,
  validate,
  propertyTranslationController.adminGetTranslationStatus
);

/**
 * @route   POST /api/v1/admin/properties/:propertyId/translations/request
 * @desc    Request translations for missing languages
 * @access  Admin (translations:create)
 */
router.post(
  '/properties/:propertyId/translations/request',
  requirePermission('translations:create'),
  [...propertyIdParamValidator, ...requestTranslationsValidators],
  validate,
  propertyTranslationController.adminRequestTranslations
);

export default router;
