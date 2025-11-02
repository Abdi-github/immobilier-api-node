import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { propertyController } from './property.controller.js';
import {
  propertyQueryValidators,
  cursorPaginationValidators,
  propertyIdParamValidator,
  externalIdParamValidator,
  cantonIdParamValidator,
  cityIdParamValidator,
  agencyIdParamValidator,
  categoryIdParamValidator,
} from './property.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/public/properties
 * @desc    Get all published properties (offset pagination)
 * @access  Public
 */
router.get('/', validate(propertyQueryValidators), propertyController.getAll);

/**
 * @route   GET /api/v1/public/properties/cursor
 * @desc    Get all published properties (cursor pagination)
 * @access  Public
 */
router.get(
  '/cursor',
  validate([...propertyQueryValidators, ...cursorPaginationValidators]),
  propertyController.getAllWithCursor
);

/**
 * @route   GET /api/v1/public/properties/external/:externalId
 * @desc    Get property by external ID
 * @access  Public
 */
router.get(
  '/external/:externalId',
  validate(externalIdParamValidator),
  propertyController.getByExternalId
);

/**
 * @route   GET /api/v1/public/properties/canton/:cantonId
 * @desc    Get properties by canton
 * @access  Public
 */
router.get(
  '/canton/:cantonId',
  validate([...cantonIdParamValidator, ...propertyQueryValidators]),
  propertyController.getByCanton
);

/**
 * @route   GET /api/v1/public/properties/city/:cityId
 * @desc    Get properties by city
 * @access  Public
 */
router.get(
  '/city/:cityId',
  validate([...cityIdParamValidator, ...propertyQueryValidators]),
  propertyController.getByCity
);

/**
 * @route   GET /api/v1/public/properties/agency/:agencyId
 * @desc    Get properties by agency
 * @access  Public
 */
router.get(
  '/agency/:agencyId',
  validate([...agencyIdParamValidator, ...propertyQueryValidators]),
  propertyController.getByAgency
);

/**
 * @route   GET /api/v1/public/properties/category/:categoryId
 * @desc    Get properties by category
 * @access  Public
 */
router.get(
  '/category/:categoryId',
  validate([...categoryIdParamValidator, ...propertyQueryValidators]),
  propertyController.getByCategory
);

/**
 * @route   GET /api/v1/public/properties/:id
 * @desc    Get property by ID
 * @access  Public
 */
router.get('/:id', validate(propertyIdParamValidator), propertyController.getById);

/**
 * @route   GET /api/v1/public/properties/:id/images
 * @desc    Get property images
 * @access  Public
 */
router.get('/:id/images', validate(propertyIdParamValidator), propertyController.getImages);

export default router;
