import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { cityController } from './location.controller.js';
import { cityValidators, searchValidators } from './location.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/public/locations/cities
 * @desc    Get all cities with optional filtering, pagination, and search
 * @access  Public
 */
router.get('/', cityValidators.listQuery, validate, cityController.getAll);

/**
 * @route   GET /api/v1/public/locations/cities/popular
 * @desc    Get popular cities with property counts for homepage tiles
 * @access  Public
 */
router.get('/popular', cityController.getPopular);

/**
 * @route   GET /api/v1/public/locations/cities/search
 * @desc    Search cities by name (text search)
 * @access  Public
 */
router.get('/search', searchValidators.searchQuery, validate, cityController.search);

/**
 * @route   GET /api/v1/public/locations/cities/postal/:postalCode
 * @desc    Get cities by postal code
 * @access  Public
 */
router.get(
  '/postal/:postalCode',
  cityValidators.postalCodeParam,
  validate,
  cityController.getByPostalCode
);

/**
 * @route   GET /api/v1/public/locations/cities/:id
 * @desc    Get city by ID
 * @access  Public
 */
router.get('/:id', cityValidators.idParam, validate, cityController.getById);

export default router;
