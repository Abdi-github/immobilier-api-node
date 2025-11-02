import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import {
  authenticate,
  requirePermission,
  requirePropertyOwnership,
} from '../auth/auth.middleware.js';
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
  approvePropertyValidators,
  rejectPropertyValidators,
  updateStatusValidators,
  addImageValidators,
  updateImageValidators,
  deleteImageValidators,
  reorderImagesValidators,
  uploadImageFromUrlValidators,
  externalImageValidators,
} from './property.validator.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/admin/properties/statistics
 * @desc    Get property statistics
 * @access  Admin (properties:read)
 */
router.get('/statistics', requirePermission('properties:read'), propertyController.getStatistics);

/**
 * @route   GET /api/v1/admin/properties
 * @desc    Get all properties (including unpublished)
 * @access  Admin (properties:read)
 */
router.get(
  '/',
  requirePermission('properties:read'),
  validate(propertyQueryValidators),
  propertyController.adminGetAll
);

/**
 * @route   GET /api/v1/admin/properties/:id
 * @desc    Get property by ID (admin view with all details)
 * @access  Admin (properties:read)
 */
router.get(
  '/:id',
  requirePermission('properties:read'),
  validate(propertyIdParamValidator),
  propertyController.adminGetById
);

/**
 * @route   POST /api/v1/admin/properties
 * @desc    Create a new property
 * @access  Admin (properties:create)
 */
router.post(
  '/',
  requirePermission('properties:create'),
  validate(createPropertyValidators),
  propertyController.create
);

/**
 * @route   PUT /api/v1/admin/properties/:id
 * @desc    Update a property
 * @access  Admin (properties:update)
 */
router.put(
  '/:id',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(updatePropertyValidators),
  propertyController.update
);

/**
 * @route   DELETE /api/v1/admin/properties/:id
 * @desc    Delete a property
 * @access  Admin (properties:delete)
 */
router.delete(
  '/:id',
  requirePermission('properties:delete'),
  validate(propertyIdParamValidator),
  propertyController.delete
);

/**
 * @route   POST /api/v1/admin/properties/:id/submit
 * @desc    Submit property for approval
 * @access  Admin (properties:update)
 */
router.post(
  '/:id/submit',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.submitForApproval
);

/**
 * @route   POST /api/v1/admin/properties/:id/approve
 * @desc    Approve a property
 * @access  Admin (properties:approve)
 */
router.post(
  '/:id/approve',
  requirePermission('properties:approve'),
  validate(approvePropertyValidators),
  propertyController.approve
);

/**
 * @route   POST /api/v1/admin/properties/:id/reject
 * @desc    Reject a property
 * @access  Admin (properties:reject)
 */
router.post(
  '/:id/reject',
  requirePermission('properties:reject'),
  validate(rejectPropertyValidators),
  propertyController.reject
);

/**
 * @route   POST /api/v1/admin/properties/:id/publish
 * @desc    Publish an approved property
 * @access  Admin (properties:publish)
 */
router.post(
  '/:id/publish',
  requirePermission('properties:publish'),
  validate(propertyIdParamValidator),
  propertyController.publish
);

/**
 * @route   POST /api/v1/admin/properties/:id/archive
 * @desc    Archive a property
 * @access  Admin (properties:archive)
 */
router.post(
  '/:id/archive',
  requirePermission('properties:archive'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.archive
);

/**
 * @route   PATCH /api/v1/admin/properties/:id/status
 * @desc    Update property status
 * @access  Admin (properties:manage)
 */
router.patch(
  '/:id/status',
  requirePermission('properties:manage'),
  validate(updateStatusValidators),
  propertyController.updateStatus
);

// ==========================================
// Image Management Routes
// ==========================================

/**
 * @route   GET /api/v1/admin/properties/:id/images
 * @desc    Get property images
 * @access  Admin (properties:read)
 */
router.get(
  '/:id/images',
  requirePermission('properties:read'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.getImages
);

/**
 * @route   GET /api/v1/admin/properties/:id/images/count
 * @desc    Get property image count
 * @access  Admin (properties:read)
 */
router.get(
  '/:id/images/count',
  requirePermission('properties:read'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.getImageCount
);

/**
 * @route   GET /api/v1/admin/properties/:id/images/upload-url
 * @desc    Get signed upload URL for direct client uploads
 * @access  Admin (properties:update)
 */
router.get(
  '/:id/images/upload-url',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(propertyIdParamValidator),
  propertyController.getUploadUrl
);

/**
 * @route   POST /api/v1/admin/properties/:id/images
 * @desc    Add image to property (URL-based, legacy method)
 * @access  Admin (properties:update)
 */
router.post(
  '/:id/images',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(addImageValidators),
  propertyController.addImage
);

/**
 * @route   POST /api/v1/admin/properties/:id/images/upload
 * @desc    Upload single image to property via Cloudinary
 * @access  Admin (properties:update)
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
 * @route   POST /api/v1/admin/properties/:id/images/upload-multiple
 * @desc    Upload multiple images to property via Cloudinary
 * @access  Admin (properties:update)
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
 * @route   POST /api/v1/admin/properties/:id/images/upload-url
 * @desc    Upload image from external URL to Cloudinary
 * @access  Admin (properties:update)
 */
router.post(
  '/:id/images/upload-url',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(uploadImageFromUrlValidators),
  propertyController.uploadImageFromUrl
);

/**
 * @route   POST /api/v1/admin/properties/:id/images/external
 * @desc    Add external image reference (no Cloudinary upload)
 * @access  Admin (properties:update)
 */
router.post(
  '/:id/images/external',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(externalImageValidators),
  propertyController.addExternalImage
);

/**
 * @route   PUT /api/v1/admin/properties/:id/images/:imageId
 * @desc    Update property image
 * @access  Admin (properties:update)
 */
router.put(
  '/:id/images/:imageId',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(updateImageValidators),
  propertyController.updateImage
);

/**
 * @route   DELETE /api/v1/admin/properties/:id/images
 * @desc    Delete all property images
 * @access  Admin (properties:delete)
 */
router.delete(
  '/:id/images',
  requirePermission('properties:delete'),
  validate(propertyIdParamValidator),
  propertyController.deleteAllImages
);

/**
 * @route   DELETE /api/v1/admin/properties/:id/images/:imageId
 * @desc    Delete property image
 * @access  Admin (properties:delete)
 */
router.delete(
  '/:id/images/:imageId',
  requirePermission('properties:delete'),
  validate(deleteImageValidators),
  propertyController.deleteImage
);

/**
 * @route   POST /api/v1/admin/properties/:id/images/reorder
 * @desc    Reorder property images
 * @access  Admin (properties:update)
 */
router.post(
  '/:id/images/reorder',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(reorderImagesValidators),
  propertyController.reorderImages
);

/**
 * @route   POST /api/v1/admin/properties/:id/images/:imageId/primary
 * @desc    Set image as primary for property
 * @access  Admin (properties:update)
 */
router.post(
  '/:id/images/:imageId/primary',
  requirePermission('properties:update'),
  requirePropertyOwnership(),
  validate(deleteImageValidators), // Reuse same validator for id + imageId
  propertyController.setPrimaryImage
);

export default router;
