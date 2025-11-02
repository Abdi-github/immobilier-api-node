import { query, param, body, ValidationChain } from 'express-validator';
import { AGENCY_STATUS } from './agency.model.js';
import { AGENCY_SORT_FIELDS } from './agency.types.js';

/**
 * Supported languages for validation
 */
const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'it'];

/**
 * Validation rules for listing agencies
 */
export const listAgenciesValidator: ValidationChain[] = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort')
    .optional()
    .isIn(AGENCY_SORT_FIELDS)
    .withMessage(`Sort must be one of: ${AGENCY_SORT_FIELDS.join(', ')}`),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Search must be between 1 and 200 characters'),
  query('canton_id').optional().isMongoId().withMessage('Invalid canton ID format'),
  query('city_id').optional().isMongoId().withMessage('Invalid city ID format'),
  query('status')
    .optional()
    .isIn(AGENCY_STATUS)
    .withMessage(`Status must be one of: ${AGENCY_STATUS.join(', ')}`),
  query('is_verified')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('is_verified must be true or false'),
  query('include_inactive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('include_inactive must be true or false'),
  query('lang')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),
];

/**
 * Validation rules for getting agency by ID
 */
export const getAgencyByIdValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid agency ID format'),
  query('lang')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),
];

/**
 * Validation rules for getting agency by slug
 */
export const getAgencyBySlugValidator: ValidationChain[] = [
  param('slug')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Slug must be between 1 and 200 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  query('lang')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),
];

/**
 * Validation rules for getting agencies by canton
 */
export const getAgenciesByCantonValidator: ValidationChain[] = [
  param('cantonId').isMongoId().withMessage('Invalid canton ID format'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort')
    .optional()
    .isIn(AGENCY_SORT_FIELDS)
    .withMessage(`Sort must be one of: ${AGENCY_SORT_FIELDS.join(', ')}`),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  query('lang')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),
];

/**
 * Validation rules for getting agencies by city
 */
export const getAgenciesByCityValidator: ValidationChain[] = [
  param('cityId').isMongoId().withMessage('Invalid city ID format'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('sort')
    .optional()
    .isIn(AGENCY_SORT_FIELDS)
    .withMessage(`Sort must be one of: ${AGENCY_SORT_FIELDS.join(', ')}`),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  query('lang')
    .optional()
    .isIn(SUPPORTED_LANGUAGES)
    .withMessage(`Language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`),
];

/**
 * Validation rules for creating an agency
 */
export const createAgencyValidator: ValidationChain[] = [
  body('name')
    .notEmpty()
    .withMessage('Agency name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  body('slug')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Slug must be between 1 and 200 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description').optional().isObject().withMessage('Description must be an object'),
  body('description.en')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('English description cannot exceed 2000 characters'),
  body('description.fr')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('French description cannot exceed 2000 characters'),
  body('description.de')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('German description cannot exceed 2000 characters'),
  body('description.it')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Italian description cannot exceed 2000 characters'),
  body('logo_url').optional().isURL().withMessage('Logo URL must be a valid URL'),
  body('website').optional().isURL().withMessage('Website must be a valid URL'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone cannot exceed 50 characters'),
  body('contact_person')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Contact person cannot exceed 200 characters'),
  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address must be between 1 and 500 characters'),
  body('city_id')
    .notEmpty()
    .withMessage('City ID is required')
    .isMongoId()
    .withMessage('Invalid city ID format'),
  body('canton_id')
    .notEmpty()
    .withMessage('Canton ID is required')
    .isMongoId()
    .withMessage('Invalid canton ID format'),
  body('postal_code')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Postal code cannot exceed 10 characters'),
  body('status')
    .optional()
    .isIn(AGENCY_STATUS)
    .withMessage(`Status must be one of: ${AGENCY_STATUS.join(', ')}`),
  body('is_verified').optional().isBoolean().withMessage('is_verified must be a boolean'),
];

/**
 * Validation rules for updating an agency
 */
export const updateAgencyValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid agency ID format'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  body('slug')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Slug must be between 1 and 200 characters')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
  body('description').optional().isObject().withMessage('Description must be an object'),
  body('description.en')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('English description cannot exceed 2000 characters'),
  body('description.fr')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('French description cannot exceed 2000 characters'),
  body('description.de')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('German description cannot exceed 2000 characters'),
  body('description.it')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Italian description cannot exceed 2000 characters'),
  body('logo_url').optional().isURL().withMessage('Logo URL must be a valid URL'),
  body('website').optional().isURL().withMessage('Website must be a valid URL'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Email must be a valid email address')
    .normalizeEmail(),
  body('phone')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Phone cannot exceed 50 characters'),
  body('contact_person')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Contact person cannot exceed 200 characters'),
  body('address')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Address must be between 1 and 500 characters'),
  body('city_id').optional().isMongoId().withMessage('Invalid city ID format'),
  body('canton_id').optional().isMongoId().withMessage('Invalid canton ID format'),
  body('postal_code')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Postal code cannot exceed 10 characters'),
  body('status')
    .optional()
    .isIn(AGENCY_STATUS)
    .withMessage(`Status must be one of: ${AGENCY_STATUS.join(', ')}`),
  body('is_verified').optional().isBoolean().withMessage('is_verified must be a boolean'),
];

/**
 * Validation rules for deleting an agency
 */
export const deleteAgencyValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid agency ID format'),
];

/**
 * Validation rules for verifying an agency
 */
export const verifyAgencyValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid agency ID format'),
];

/**
 * Validation rules for updating agency status
 */
export const updateAgencyStatusValidator: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid agency ID format'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(AGENCY_STATUS)
    .withMessage(`Status must be one of: ${AGENCY_STATUS.join(', ')}`),
];
