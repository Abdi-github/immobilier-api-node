import { body, param, query } from 'express-validator';

/**
 * Valid amenity groups
 */
const VALID_GROUPS = [
  'general',
  'kitchen',
  'bathroom',
  'outdoor',
  'security',
  'parking',
  'accessibility',
  'energy',
  'other',
];

/**
 * Valid languages
 */
const VALID_LANGUAGES = ['en', 'fr', 'de', 'it'];

/**
 * Amenity Validators
 */
export const amenityValidator = {
  /**
   * Validate amenity ID parameter
   */
  idParam: [
    param('id')
      .notEmpty()
      .withMessage('Amenity ID is required')
      .isMongoId()
      .withMessage('Invalid amenity ID format'),
  ],

  /**
   * Validate group parameter
   */
  groupParam: [
    param('group')
      .notEmpty()
      .withMessage('Group is required')
      .isIn(VALID_GROUPS)
      .withMessage(`Group must be one of: ${VALID_GROUPS.join(', ')}`),
  ],

  /**
   * Validate list query parameters
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
      .isIn(['sort_order', '-sort_order', 'name.en', '-name.en', 'created_at', '-created_at'])
      .withMessage('Invalid sort field'),

    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),

    query('group')
      .optional()
      .isIn(VALID_GROUPS)
      .withMessage(`Group must be one of: ${VALID_GROUPS.join(', ')}`),

    query('search')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search must be between 1 and 100 characters'),

    query('lang')
      .optional()
      .isIn(VALID_LANGUAGES)
      .withMessage(`Language must be one of: ${VALID_LANGUAGES.join(', ')}`),
  ],

  /**
   * Validate create amenity body
   */
  createBody: [
    body('name')
      .notEmpty()
      .withMessage('Name is required')
      .isObject()
      .withMessage('Name must be an object'),

    body('name.en')
      .notEmpty()
      .withMessage('English name is required')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('English name must be between 1 and 200 characters')
      .trim(),

    body('name.fr')
      .notEmpty()
      .withMessage('French name is required')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('French name must be between 1 and 200 characters')
      .trim(),

    body('name.de')
      .notEmpty()
      .withMessage('German name is required')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('German name must be between 1 and 200 characters')
      .trim(),

    body('name.it')
      .notEmpty()
      .withMessage('Italian name is required')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Italian name must be between 1 and 200 characters')
      .trim(),

    body('group')
      .notEmpty()
      .withMessage('Group is required')
      .isIn(VALID_GROUPS)
      .withMessage(`Group must be one of: ${VALID_GROUPS.join(', ')}`),

    body('icon')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Icon must be at most 100 characters')
      .trim(),

    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer')
      .toInt(),

    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Validate update amenity body
   */
  updateBody: [
    body('name').optional().isObject().withMessage('Name must be an object'),

    body('name.en')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('English name must be between 1 and 200 characters')
      .trim(),

    body('name.fr')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('French name must be between 1 and 200 characters')
      .trim(),

    body('name.de')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('German name must be between 1 and 200 characters')
      .trim(),

    body('name.it')
      .optional()
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Italian name must be between 1 and 200 characters')
      .trim(),

    body('group')
      .optional()
      .isIn(VALID_GROUPS)
      .withMessage(`Group must be one of: ${VALID_GROUPS.join(', ')}`),

    body('icon')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Icon must be at most 100 characters')
      .trim(),

    body('sort_order')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Sort order must be a non-negative integer')
      .toInt(),

    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],
};
