/**
 * Property Agent Routes
 * Routes for agents, agency admins, and owners to manage their own properties.
 * These routes are mounted under /api/v1/agent/properties and do NOT require
 * admin user type — only authentication + permission + ownership checks.
 */
import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { requirePermission, requirePropertyOwnership } from '../auth/auth.middleware.js';
import {
  uploadPropertyImage,
  uploadPropertyImages,
} from '../../shared/middlewares/upload.middleware.js';

import { propertyController } from './property.controller.js';
import {
  propertyQueryValidators,
  propertyIdParamValidator,
  createPropertyValidators,
  updatePropertyValidators,
  addImageValidators,
  updateImageValidators,
  deleteImageValidators,
  reorderImagesValidators,
  uploadImageFromUrlValidators,
  externalImageValidators,
} from './property.validator.js';

const router = Router();

// NOTE: authenticate is applied at the parent router (/api/v1/agent)

// ==========================================
// Property CRUD (scoped to own properties)
// ==========================================

/**
 * @route   GET /api/v1/agent/properties/statistics
 * @desc    Get property statistics for current user's properties
 * @access  Agent/Owner (properties:read)
 */
router.get('/statistics', requirePermission('properties:read'), propertyController.getStatistics);

/**
 * @route   GET /api/v1/agent/properties
 * @desc    Get current user's properties (auto-scoped by user type)
 * @access  Agent/Owner (properties:read)
 */
router.get(
  '/',
  requirePermission('properties:read'),
  validate(propertyQueryValidators),
  propertyController.adminGetAll
);

/**
 * @route   GET /api/v1/agent/properties/:id
 * @desc    Get a property owned by the current user
 * @access  Agent/Owner (properties:read + ownership)
 */
router.get(
  '/:id',
  requirePermission('properties:read'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.adminGetById
);

/**
 * @route   POST /api/v1/agent/properties
 * @desc    Create a new property
 * @access  Agent/Owner (properties:create)
 */
router.post(
  '/',
  requirePermission('properties:create'),
  validate(createPropertyValidators),
  propertyController.create
);

/**
 * @route   PUT /api/v1/agent/properties/:id
 * @desc    Update own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.put(
  '/:id',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(updatePropertyValidators),
  propertyController.update
);

/**
 * @route   DELETE /api/v1/agent/properties/:id
 * @desc    Delete own property (only DRAFT or REJECTED)
 * @access  Agent/Owner (properties:delete + ownership)
 */
router.delete(
  '/:id',
  requirePermission('properties:delete'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.delete
);

/**
 * @route   POST /api/v1/agent/properties/:id/submit
 * @desc    Submit own property for approval
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/submit',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.submitForApproval
);

/**
 * @route   POST /api/v1/agent/properties/:id/archive
 * @desc    Archive own property (soft-delete)
 * @access  Agent/Owner (properties:archive + ownership)
 */
router.post(
  '/:id/archive',
  requirePermission('properties:archive'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.archive
);

// ==========================================
// Image Management (scoped to own properties)
// ==========================================

/**
 * @route   GET /api/v1/agent/properties/:id/images
 * @desc    Get images for own property
 * @access  Agent/Owner (properties:read + ownership)
 */
router.get(
  '/:id/images',
  requirePermission('properties:read'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.getImages
);

/**
 * @route   GET /api/v1/agent/properties/:id/images/count
 * @desc    Get image count for own property
 * @access  Agent/Owner (properties:read + ownership)
 */
router.get(
  '/:id/images/count',
  requirePermission('properties:read'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.getImageCount
);

/**
 * @route   GET /api/v1/agent/properties/:id/images/upload-url
 * @desc    Get signed upload URL for own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.get(
  '/:id/images/upload-url',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.getUploadUrl
);

/**
 * @route   POST /api/v1/agent/properties/:id/images
 * @desc    Add image to own property (URL-based)
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/images',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(addImageValidators),
  propertyController.addImage
);

/**
 * @route   POST /api/v1/agent/properties/:id/images/upload
 * @desc    Upload single image to own property via Cloudinary
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/images/upload',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  uploadPropertyImage,
  propertyController.uploadImage
);

/**
 * @route   POST /api/v1/agent/properties/:id/images/upload-multiple
 * @desc    Upload multiple images to own property via Cloudinary
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/images/upload-multiple',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  uploadPropertyImages,
  propertyController.uploadImages
);

/**
 * @route   POST /api/v1/agent/properties/:id/images/upload-url
 * @desc    Upload image from external URL to own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/images/upload-url',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(uploadImageFromUrlValidators),
  propertyController.uploadImageFromUrl
);

/**
 * @route   POST /api/v1/agent/properties/:id/images/external
 * @desc    Add external image reference to own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/images/external',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(externalImageValidators),
  propertyController.addExternalImage
);

/**
 * @route   PUT /api/v1/agent/properties/:id/images/:imageId
 * @desc    Update image on own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.put(
  '/:id/images/:imageId',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(updateImageValidators),
  propertyController.updateImage
);

/**
 * @route   DELETE /api/v1/agent/properties/:id/images/:imageId
 * @desc    Delete image from own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.delete(
  '/:id/images/:imageId',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(deleteImageValidators),
  propertyController.deleteImage
);

/**
 * @route   POST /api/v1/agent/properties/:id/images/reorder
 * @desc    Reorder images on own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/images/reorder',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(reorderImagesValidators),
  propertyController.reorderImages
);

/**
 * @route   POST /api/v1/agent/properties/:id/images/:imageId/primary
 * @desc    Set primary image on own property
 * @access  Agent/Owner (properties:update + ownership)
 */
router.post(
  '/:id/images/:imageId/primary',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(deleteImageValidators),
  propertyController.setPrimaryImage
);

export default router;
