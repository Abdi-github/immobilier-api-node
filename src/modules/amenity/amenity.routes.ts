import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { amenityController } from './amenity.controller.js';
import { amenityValidator } from './amenity.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/public/amenities
 * @desc    Get all amenities (paginated)
 * @access  Public
 * @query   page, limit, sort, is_active, group, search, lang
 */
router.get('/', amenityValidator.listQuery, validate, amenityController.getAll);

/**
 * @route   GET /api/v1/public/amenities/group/:group
 * @desc    Get amenities by group
 * @access  Public
 * @param   group - The amenity group (general, kitchen, bathroom, outdoor, security, parking, accessibility, energy, other)
 * @query   lang
 */
router.get('/group/:group', amenityValidator.groupParam, validate, amenityController.getByGroup);

/**
 * @route   GET /api/v1/public/amenities/:id
 * @desc    Get amenity by ID
 * @access  Public
 * @param   id - The amenity MongoDB ID
 * @query   lang
 */
router.get('/:id', amenityValidator.idParam, validate, amenityController.getById);

export default router;
