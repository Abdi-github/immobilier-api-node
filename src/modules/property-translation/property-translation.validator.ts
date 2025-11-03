import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Property Translation Validators
 */

const VALID_LANGUAGES = ['en', 'fr', 'de', 'it'];
const VALID_SOURCES = ['original', 'deepl', 'human'];
const VALID_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const VALID_SORT_FIELDS = [
  'created_at',
  'updated_at',
  'language',
  'source',
  'approval_status',
  'quality_score',
];

/**
 * MongoDB ObjectId validation helper
 */
const isValidObjectId = (value: string): boolean => {
  return /^[a-fA-F0-9]{24}$/.test(value);
};

/**
 * Query parameter validators
 */
export const translationQueryValidators: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sort')
    .optional()
    .isIn(VALID_SORT_FIELDS)
    .withMessage(`Sort must be one of: ${VALID_SORT_FIELDS.join(', ')}`),

  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),

  query('lang')
    .optional()
    .isIn(VALID_LANGUAGES)
    .withMessage(`Language must be one of: ${VALID_LANGUAGES.join(', ')}`),

  query('property_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Property ID must be a valid ObjectId'),

  query('language')
    .optional()
    .isIn(VALID_LANGUAGES)
    .withMessage(`Language must be one of: ${VALID_LANGUAGES.join(', ')}`),

  query('source')
    .optional()
    .isIn(VALID_SOURCES)
    .withMessage(`Source must be one of: ${VALID_SOURCES.join(', ')}`),

  query('approval_status')
    .optional()
    .isIn(VALID_APPROVAL_STATUSES)
    .withMessage(`Approval status must be one of: ${VALID_APPROVAL_STATUSES.join(', ')}`),

  query('approved_by')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Approved by must be a valid ObjectId'),

  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search must be between 2 and 100 characters'),
];

/**
 * Translation ID parameter validator
 */
export const translationIdParamValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Translation ID is required')
    .custom(isValidObjectId)
    .withMessage('Translation ID must be a valid ObjectId'),
];

/**
 * Property ID parameter validator
 */
export const propertyIdParamValidator: ValidationChain[] = [
  param('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .custom(isValidObjectId)
    .withMessage('Property ID must be a valid ObjectId'),
];

/**
 * Language parameter validator
 */
export const languageParamValidator: ValidationChain[] = [
  param('language')
    .notEmpty()
    .withMessage('Language is required')
    .isIn(VALID_LANGUAGES)
    .withMessage(`Language must be one of: ${VALID_LANGUAGES.join(', ')}`),
];

/**
 * Create translation validators
 */
export const createTranslationValidators: ValidationChain[] = [
  body('property_id')
    .notEmpty()
    .withMessage('Property ID is required')
    .custom(isValidObjectId)
    .withMessage('Property ID must be a valid ObjectId'),

  body('language')
    .notEmpty()
    .withMessage('Language is required')
    .isIn(VALID_LANGUAGES)
    .withMessage(`Language must be one of: ${VALID_LANGUAGES.join(', ')}`),

  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Title must be between 1 and 300 characters'),

  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Description is required'),

  body('source')
    .optional()
    .isIn(VALID_SOURCES)
    .withMessage(`Source must be one of: ${VALID_SOURCES.join(', ')}`),

  body('quality_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Quality score must be between 0 and 100')
    .toInt(),
];

/**
 * Update translation validators
 */
export const updateTranslationValidators: ValidationChain[] = [
  body('title')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 300 })
    .withMessage('Title must be between 1 and 300 characters'),

  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Description must not be empty'),

  body('source')
    .optional()
    .isIn(VALID_SOURCES)
    .withMessage(`Source must be one of: ${VALID_SOURCES.join(', ')}`),

  body('quality_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Quality score must be between 0 and 100')
    .toInt(),
];

/**
 * Request translations validators
 */
export const requestTranslationsValidators: ValidationChain[] = [
  body('target_languages')
    .optional()
    .isArray({ min: 1, max: 4 })
    .withMessage('Target languages must be an array with 1-4 languages'),

  body('target_languages.*')
    .optional()
    .isIn(VALID_LANGUAGES)
    .withMessage(`Each target language must be one of: ${VALID_LANGUAGES.join(', ')}`),
];

/**
 * Reject translation validators
 */
export const rejectTranslationValidators: ValidationChain[] = [
  body('rejection_reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];

/**
 * Bulk approve validators
 */
export const bulkApproveValidators: ValidationChain[] = [
  body('ids').isArray({ min: 1, max: 100 }).withMessage('IDs must be an array with 1-100 items'),

  body('ids.*').custom(isValidObjectId).withMessage('Each ID must be a valid ObjectId'),
];
