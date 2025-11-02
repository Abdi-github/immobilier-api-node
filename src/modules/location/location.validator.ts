import { body, param, query } from 'express-validator';

/**
 * Canton Validators
 */
export const cantonValidators = {
  /**
   * Validate canton ID parameter
   */
  idParam: [
    param('id')
      .notEmpty()
      .withMessage('Canton ID is required')
      .isMongoId()
      .withMessage('Invalid canton ID format'),
  ],

  /**
   * Validate canton code parameter
   */
  codeParam: [
    param('code')
      .notEmpty()
      .withMessage('Canton code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Canton code must be exactly 2 characters')
      .isAlpha()
      .withMessage('Canton code must contain only letters'),
  ],

  /**
   * Validate query parameters for listing cantons
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
        'code',
        '-code',
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
    query('code')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Canton code must be exactly 2 characters'),
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
   * Validate create canton body (Admin only)
   */
  createBody: [
    body('code')
      .notEmpty()
      .withMessage('Canton code is required')
      .isLength({ min: 2, max: 2 })
      .withMessage('Canton code must be exactly 2 characters')
      .isAlpha()
      .withMessage('Canton code must contain only letters')
      .toUpperCase(),
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isObject()
      .withMessage('Name must be an object with language keys'),
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
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Validate update canton body (Admin only)
   */
  updateBody: [
    body('code')
      .optional()
      .isLength({ min: 2, max: 2 })
      .withMessage('Canton code must be exactly 2 characters')
      .isAlpha()
      .withMessage('Canton code must contain only letters')
      .toUpperCase(),
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
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],
};

/**
 * City Validators
 */
export const cityValidators = {
  /**
   * Validate city ID parameter
   */
  idParam: [
    param('id')
      .notEmpty()
      .withMessage('City ID is required')
      .isMongoId()
      .withMessage('Invalid city ID format'),
  ],

  /**
   * Validate postal code parameter
   */
  postalCodeParam: [
    param('postalCode')
      .notEmpty()
      .withMessage('Postal code is required')
      .isString()
      .withMessage('Postal code must be a string')
      .isLength({ min: 4, max: 4 })
      .withMessage('Postal code must be 4 characters'),
  ],

  /**
   * Validate query parameters for listing cities
   */
  listQuery: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 500 })
      .withMessage('Limit must be between 1 and 500')
      .toInt(),
    query('sort')
      .optional()
      .isString()
      .withMessage('Sort must be a string')
      .isIn(['name', '-name', 'postal_code', '-postal_code', 'created_at', '-created_at'])
      .withMessage('Invalid sort field'),
    query('is_active')
      .optional()
      .isBoolean()
      .withMessage('is_active must be a boolean')
      .toBoolean(),
    query('canton_id').optional().isMongoId().withMessage('Invalid canton_id format'),
    query('postal_code')
      .optional()
      .isString()
      .withMessage('Postal code must be a string')
      .isLength({ min: 4, max: 4 })
      .withMessage('Postal code must be 4 characters'),
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
   * Validate create city body (Admin only)
   */
  createBody: [
    body('canton_id')
      .notEmpty()
      .withMessage('Canton ID is required')
      .isMongoId()
      .withMessage('Invalid canton ID format'),
    body('name').notEmpty().withMessage('Name is required'),
    body('postal_code')
      .notEmpty()
      .withMessage('Postal code is required')
      .isString()
      .withMessage('Postal code must be a string')
      .isLength({ min: 4, max: 4 })
      .withMessage('Postal code must be 4 characters'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Validate update city body (Admin only)
   */
  updateBody: [
    body('canton_id').optional().isMongoId().withMessage('Invalid canton ID format'),
    body('name').optional(),
    body('postal_code')
      .optional()
      .isString()
      .withMessage('Postal code must be a string')
      .isLength({ min: 4, max: 4 })
      .withMessage('Postal code must be 4 characters'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],
};

/**
 * Search Validators
 */
export const searchValidators = {
  /**
   * Validate search query
   */
  searchQuery: [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ],
};
