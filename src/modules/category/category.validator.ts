import { body, param, query } from 'express-validator';

/**
 * Category Validators
 */
export const categoryValidators = {
  /**
   * Validate category ID parameter
   */
  idParam: [
    param('id')
      .notEmpty()
      .withMessage('Category ID is required')
      .isMongoId()
      .withMessage('Invalid category ID format'),
  ],

  /**
   * Validate category slug parameter
   * Accepts uppercase but normalizes to lowercase for case-insensitive lookup
   */
  slugParam: [
    param('slug')
      .notEmpty()
      .withMessage('Category slug is required')
      .isString()
      .withMessage('Slug must be a string')
      .isLength({ min: 2, max: 100 })
      .withMessage('Slug must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9-]+$/)
      .withMessage('Slug must contain only letters, numbers, and hyphens')
      .customSanitizer((value) => value.toLowerCase()),
  ],

  /**
   * Validate category section parameter
   */
  sectionParam: [
    param('section')
      .notEmpty()
      .withMessage('Section is required')
      .isIn(['residential', 'commercial', 'land', 'parking', 'special'])
      .withMessage('Section must be one of: residential, commercial, land, parking, special'),
  ],

  /**
   * Validate query parameters for listing categories
   */
  listQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort')
      .optional()
      .isString()
      .withMessage('Sort must be a string')
      .isIn([
        'sort_order',
        '-sort_order',
        'slug',
        '-slug',
        'section',
        '-section',
        'name.en',
        '-name.en',
        'name.fr',
        '-name.fr',
        'created_at',
        '-created_at',
      ])
      .withMessage('Invalid sort field'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
      .toBoolean(),
    query('section')
      .optional()
      .isIn(['residential', 'commercial', 'land', 'parking', 'special'])
      .withMessage('Section must be one of: residential, commercial, land, parking, special'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('Search must be between 1 and 100 characters'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ],

  /**
   * Validate create category body (Admin only)
   */
  createBody: [
    body('section')
      .notEmpty()
      .withMessage('Section is required')
      .isIn(['residential', 'commercial', 'land', 'parking', 'special'])
      .withMessage('Section must be one of: residential, commercial, land, parking, special'),
    body('slug')
      .notEmpty()
      .withMessage('Slug is required')
      .isString()
      .withMessage('Slug must be a string')
      .isLength({ min: 2, max: 100 })
      .withMessage('Slug must be between 2 and 100 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isObject()
      .withMessage('Name must be an object with language keys'),
    body('name.en')
      .notEmpty()
      .withMessage('English name is required')
      .isString()
      .withMessage('English name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('English name must be between 1 and 100 characters'),
    body('name.fr')
      .notEmpty()
      .withMessage('French name is required')
      .isString()
      .withMessage('French name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('French name must be between 1 and 100 characters'),
    body('name.de')
      .notEmpty()
      .withMessage('German name is required')
      .isString()
      .withMessage('German name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('German name must be between 1 and 100 characters'),
    body('name.it')
      .notEmpty()
      .withMessage('Italian name is required')
      .isString()
      .withMessage('Italian name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('Italian name must be between 1 and 100 characters'),
    body('icon')
      .optional()
      .isString()
      .withMessage('Icon must be a string')
      .isLength({ max: 50 })
      .withMessage('Icon must be at most 50 characters'),
    body('sort_order')
      .optional()
      .isInt({ min: 0, max: 999 })
      .withMessage('Sort order must be a number between 0 and 999'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Validate update category body (Admin only)
   */
  updateBody: [
    body('section')
      .optional()
      .isIn(['residential', 'commercial', 'land', 'parking', 'special'])
      .withMessage('Section must be one of: residential, commercial, land, parking, special'),
    body('slug')
      .optional()
      .isString()
      .withMessage('Slug must be a string')
      .isLength({ min: 2, max: 100 })
      .withMessage('Slug must be between 2 and 100 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug must contain only lowercase letters, numbers, and hyphens'),
    body('name').optional().isObject().withMessage('Name must be an object with language keys'),
    body('name.en')
      .optional()
      .isString()
      .withMessage('English name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('English name must be between 1 and 100 characters'),
    body('name.fr')
      .optional()
      .isString()
      .withMessage('French name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('French name must be between 1 and 100 characters'),
    body('name.de')
      .optional()
      .isString()
      .withMessage('German name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('German name must be between 1 and 100 characters'),
    body('name.it')
      .optional()
      .isString()
      .withMessage('Italian name must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('Italian name must be between 1 and 100 characters'),
    body('icon')
      .optional()
      .isString()
      .withMessage('Icon must be a string')
      .isLength({ max: 50 })
      .withMessage('Icon must be at most 50 characters'),
    body('sort_order')
      .optional()
      .isInt({ min: 0, max: 999 })
      .withMessage('Sort order must be a number between 0 and 999'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],
};
