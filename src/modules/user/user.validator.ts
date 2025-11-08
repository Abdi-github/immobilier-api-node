import { body, param, query } from 'express-validator';

import { USER_TYPES, USER_STATUSES } from './user.model.js';
import { ALERT_FREQUENCIES } from './user.types.js';

/**
 * User Validators
 * Validation rules for user operations
 */

// ==========================================
// Shared Validators
// ==========================================

const mongoIdParam = (field: string) =>
  param(field).isMongoId().withMessage(`Invalid ${field} format`);

const paginationQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

// ==========================================
// Admin User Query Validators
// ==========================================

export const userQueryValidators = [
  ...paginationQuery,
  query('user_type')
    .optional()
    .isIn(USER_TYPES)
    .withMessage(`User type must be one of: ${USER_TYPES.join(', ')}`),
  query('status')
    .optional()
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),
  query('agency_id').optional().isMongoId().withMessage('Invalid agency_id format'),
  query('email_verified')
    .optional()
    .isBoolean()
    .withMessage('email_verified must be a boolean')
    .toBoolean(),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('sort')
    .optional()
    .isIn(['created_at', 'updated_at', 'email', 'first_name', 'last_name'])
    .withMessage('Sort must be one of: created_at, updated_at, email, first_name, last_name'),
  query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be either asc or desc'),
];

// ==========================================
// Admin User Create Validators
// ==========================================

export const userCreateValidators = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('first_name')
    .notEmpty()
    .withMessage('First name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('last_name')
    .notEmpty()
    .withMessage('Last name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('user_type')
    .optional()
    .isIn(USER_TYPES)
    .withMessage(`User type must be one of: ${USER_TYPES.join(', ')}`),
  body('status')
    .optional()
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),
  body('phone')
    .optional()
    .isString()
    .trim()
    .matches(/^[+]?[\d\s()-]{6,20}$/)
    .withMessage('Invalid phone number format'),
  body('agency_id').optional().isMongoId().withMessage('Invalid agency_id format'),
  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Preferred language must be one of: en, fr, de, it'),
  body('email_verified').optional().isBoolean().withMessage('email_verified must be a boolean'),
];

// ==========================================
// Admin User Update Validators
// ==========================================

export const userAdminUpdateValidators = [
  mongoIdParam('id'),
  body('email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('first_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('last_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('user_type')
    .optional()
    .isIn(USER_TYPES)
    .withMessage(`User type must be one of: ${USER_TYPES.join(', ')}`),
  body('status')
    .optional()
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),
  body('phone')
    .optional()
    .isString()
    .trim()
    .matches(/^[+]?[\d\s()-]{6,20}$/)
    .withMessage('Invalid phone number format'),
  body('agency_id').optional().isMongoId().withMessage('Invalid agency_id format'),
  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Preferred language must be one of: en, fr, de, it'),
  body('email_verified').optional().isBoolean().withMessage('email_verified must be a boolean'),
];

// ==========================================
// User Status Update Validators
// ==========================================

export const userStatusValidators = [
  mongoIdParam('id'),
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(USER_STATUSES)
    .withMessage(`Status must be one of: ${USER_STATUSES.join(', ')}`),
];

// ==========================================
// Profile Update Validators
// ==========================================

export const profileUpdateValidators = [
  body('first_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('last_name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .isString()
    .trim()
    .matches(/^[+]?[\d\s()-]{6,20}$/)
    .withMessage('Invalid phone number format'),
  body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL'),
  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Preferred language must be one of: en, fr, de, it'),
];

// ==========================================
// Favorites Validators
// ==========================================

export const favoriteValidators = [
  body('property_id')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid property_id format'),
];

export const favoritePropertyIdValidators = [mongoIdParam('propertyId')];

export const favoritePaginationValidators = [...paginationQuery];

// ==========================================
// Alerts Validators
// ==========================================

export const alertCreateValidators = [
  body('name')
    .notEmpty()
    .withMessage('Alert name is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Alert name must be between 1 and 100 characters'),
  body('frequency')
    .optional()
    .isIn(ALERT_FREQUENCIES)
    .withMessage(`Frequency must be one of: ${ALERT_FREQUENCIES.join(', ')}`),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),

  // Criteria validation
  body('criteria')
    .notEmpty()
    .withMessage('Alert criteria is required')
    .isObject()
    .withMessage('Criteria must be an object'),
  body('criteria.canton_id').optional().isMongoId().withMessage('Invalid canton_id format'),
  body('criteria.city_ids').optional().isArray().withMessage('city_ids must be an array'),
  body('criteria.city_ids.*').optional().isMongoId().withMessage('Invalid city_id format'),
  body('criteria.category_ids').optional().isArray().withMessage('category_ids must be an array'),
  body('criteria.category_ids.*').optional().isMongoId().withMessage('Invalid category_id format'),
  body('criteria.transaction_type')
    .optional()
    .isIn(['rent', 'buy'])
    .withMessage('Transaction type must be rent or buy'),
  body('criteria.price_min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('price_min must be a non-negative integer')
    .toInt(),
  body('criteria.price_max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('price_max must be a non-negative integer')
    .toInt(),
  body('criteria.rooms_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('rooms_min must be a non-negative number')
    .toFloat(),
  body('criteria.rooms_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('rooms_max must be a non-negative number')
    .toFloat(),
  body('criteria.surface_min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('surface_min must be a non-negative integer')
    .toInt(),
  body('criteria.surface_max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('surface_max must be a non-negative integer')
    .toInt(),
  body('criteria.amenities').optional().isArray().withMessage('amenities must be an array'),
  body('criteria.amenities.*').optional().isMongoId().withMessage('Invalid amenity_id format'),
];

export const alertUpdateValidators = [
  mongoIdParam('id'),
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Alert name must be between 1 and 100 characters'),
  body('frequency')
    .optional()
    .isIn(ALERT_FREQUENCIES)
    .withMessage(`Frequency must be one of: ${ALERT_FREQUENCIES.join(', ')}`),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),

  // Criteria validation (optional on update)
  body('criteria').optional().isObject().withMessage('Criteria must be an object'),
  body('criteria.canton_id').optional().isMongoId().withMessage('Invalid canton_id format'),
  body('criteria.city_ids').optional().isArray().withMessage('city_ids must be an array'),
  body('criteria.city_ids.*').optional().isMongoId().withMessage('Invalid city_id format'),
  body('criteria.category_ids').optional().isArray().withMessage('category_ids must be an array'),
  body('criteria.category_ids.*').optional().isMongoId().withMessage('Invalid category_id format'),
  body('criteria.transaction_type')
    .optional()
    .isIn(['rent', 'buy'])
    .withMessage('Transaction type must be rent or buy'),
  body('criteria.price_min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('price_min must be a non-negative integer')
    .toInt(),
  body('criteria.price_max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('price_max must be a non-negative integer')
    .toInt(),
  body('criteria.rooms_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('rooms_min must be a non-negative number')
    .toFloat(),
  body('criteria.rooms_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('rooms_max must be a non-negative number')
    .toFloat(),
  body('criteria.surface_min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('surface_min must be a non-negative integer')
    .toInt(),
  body('criteria.surface_max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('surface_max must be a non-negative integer')
    .toInt(),
  body('criteria.amenities').optional().isArray().withMessage('amenities must be an array'),
  body('criteria.amenities.*').optional().isMongoId().withMessage('Invalid amenity_id format'),
];

export const alertIdValidators = [mongoIdParam('id')];

export const alertPaginationValidators = [...paginationQuery];

// ==========================================
// User ID Param Validator
// ==========================================

export const userIdValidators = [mongoIdParam('id')];

// Export as groups
export const userValidators = {
  query: userQueryValidators,
  create: userCreateValidators,
  adminUpdate: userAdminUpdateValidators,
  status: userStatusValidators,
  profile: profileUpdateValidators,
  userId: userIdValidators,
  favorite: favoriteValidators,
  favoritePropertyId: favoritePropertyIdValidators,
  favoritePagination: favoritePaginationValidators,
  alertCreate: alertCreateValidators,
  alertUpdate: alertUpdateValidators,
  alertId: alertIdValidators,
  alertPagination: alertPaginationValidators,
};

export default userValidators;
