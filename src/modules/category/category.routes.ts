import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';

import { categoryController } from './category.controller.js';
import { categoryValidators } from './category.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/public/categories
 * @desc    Get all categories with optional filtering, pagination, and search
 * @access  Public
 */
router.get('/', categoryValidators.listQuery, validate, categoryController.getAll);

/**
 * @route   GET /api/v1/public/categories/slug/:slug
 * @desc    Get category by slug (e.g., apartment, house, office)
 * @access  Public
 */
router.get('/slug/:slug', categoryValidators.slugParam, validate, categoryController.getBySlug);

/**
 * @route   GET /api/v1/public/categories/section/:section
 * @desc    Get all categories in a section (residential, commercial, etc.)
 * @access  Public
 */
router.get(
  '/section/:section',
  categoryValidators.sectionParam,
  validate,
  categoryController.getBySection
);

/**
 * @route   GET /api/v1/public/categories/:id
 * @desc    Get category by ID
 * @access  Public
 */
router.get('/:id', categoryValidators.idParam, validate, categoryController.getById);

export default router;
