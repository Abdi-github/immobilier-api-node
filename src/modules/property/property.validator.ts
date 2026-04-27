import { body, param, query, ValidationChain } from 'express-validator';

/**
 * Property Validators
 * Validation rules for property endpoints
 */

// Valid sort fields
const VALID_SORT_FIELDS = ['price', 'rooms', 'surface', 'published_at', 'created_at', 'updated_at'];
const VALID_LANGUAGES = ['en', 'fr', 'de', 'it'];
const VALID_TRANSACTION_TYPES = ['rent', 'buy'];
const VALID_STATUSES = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'PUBLISHED',
  'ARCHIVED',
];
const VALID_LOCATION_PRECISIONS = ['exact', 'postal_code', 'city', 'canton', 'unknown'];
const VALID_GEOCODING_SOURCES = ['manual', 'provider', 'city_centroid', 'canton_centroid'];

/**
 * MongoDB ObjectId validation helper
 */
const isValidObjectId = (value: string): boolean => {
  return /^[a-fA-F0-9]{24}$/.test(value);
};

/**
 * Common query parameter validators
 */
export const propertyQueryValidators: ValidationChain[] = [
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

  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search must be between 2 and 100 characters'),

  // Location filters
  query('canton_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Canton ID must be a valid ObjectId'),

  query('city_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('City ID must be a valid ObjectId'),

  query('postal_code')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('Postal code must be between 4 and 10 characters'),

  // Property filters
  query('category_id')
    .optional()
    .custom((value) => {
      // Support comma-separated ObjectIds for multi-select
      const ids = value.split(',').map((id: string) => id.trim());
      return ids.every((id: string) => isValidObjectId(id));
    })
    .withMessage('Category ID(s) must be valid ObjectId(s) (comma-separated for multiple)'),

  query('transaction_type')
    .optional()
    .isIn(VALID_TRANSACTION_TYPES)
    .withMessage(`Transaction type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`),

  query('section')
    .optional()
    .isIn(['residential', 'commercial'])
    .withMessage('Section must be one of: residential, commercial'),

  query('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  query('agency_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Agency ID must be a valid ObjectId'),

  // Price filters
  query('price_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a non-negative number')
    .toFloat(),

  query('price_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a non-negative number')
    .toFloat(),

  // Size filters
  query('rooms_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum rooms must be a non-negative number')
    .toFloat(),

  query('rooms_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum rooms must be a non-negative number')
    .toFloat(),

  query('surface_min')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum surface must be a non-negative number')
    .toFloat(),

  query('surface_max')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum surface must be a non-negative number')
    .toFloat(),

  // Amenities filter
  query('amenities')
    .optional()
    .customSanitizer((value) => {
      if (typeof value === 'string') return [value];
      return value;
    })
    .isArray()
    .withMessage('Amenities must be an array'),

  query('amenities.*')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Each amenity ID must be a valid ObjectId'),

  // Admin-only filters
  query('include_unpublished')
    .optional()
    .isBoolean()
    .withMessage('Include unpublished must be a boolean')
    .toBoolean(),
];

/**
 * Cursor pagination validators
 */
export const cursorPaginationValidators: ValidationChain[] = [
  query('cursor').optional().isString().withMessage('Cursor must be a string'),

  query('cursor_direction')
    .optional()
    .isIn(['next', 'prev'])
    .withMessage('Cursor direction must be next or prev'),
];

/**
 * Property ID parameter validator
 */
export const propertyIdParamValidator: ValidationChain[] = [
  param('id')
    .notEmpty()
    .withMessage('Property ID is required')
    .custom(isValidObjectId)
    .withMessage('Property ID must be a valid ObjectId'),
];

/**
 * External ID parameter validator
 */
export const externalIdParamValidator: ValidationChain[] = [
  param('externalId')
    .notEmpty()
    .withMessage('External ID is required')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('External ID must be between 1 and 50 characters'),
];

/**
 * Canton ID parameter validator
 */
export const cantonIdParamValidator: ValidationChain[] = [
  param('cantonId')
    .notEmpty()
    .withMessage('Canton ID is required')
    .custom(isValidObjectId)
    .withMessage('Canton ID must be a valid ObjectId'),
];

/**
 * City ID parameter validator
 */
export const cityIdParamValidator: ValidationChain[] = [
  param('cityId')
    .notEmpty()
    .withMessage('City ID is required')
    .custom(isValidObjectId)
    .withMessage('City ID must be a valid ObjectId'),
];

/**
 * Agency ID parameter validator
 */
export const agencyIdParamValidator: ValidationChain[] = [
  param('agencyId')
    .notEmpty()
    .withMessage('Agency ID is required')
    .custom(isValidObjectId)
    .withMessage('Agency ID must be a valid ObjectId'),
];

/**
 * Category ID parameter validator
 */
export const categoryIdParamValidator: ValidationChain[] = [
  param('categoryId')
    .notEmpty()
    .withMessage('Category ID is required')
    .custom(isValidObjectId)
    .withMessage('Category ID must be a valid ObjectId'),
];

/**
 * Create property validators
 */
export const createPropertyValidators: ValidationChain[] = [
  body('external_id')
    .optional() // Auto-generated if not provided
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('External ID must be between 1 and 50 characters'),

  body('external_url').optional().isURL().withMessage('External URL must be a valid URL'),

  body('source_language')
    .notEmpty()
    .withMessage('Source language is required')
    .isIn(VALID_LANGUAGES)
    .withMessage(`Source language must be one of: ${VALID_LANGUAGES.join(', ')}`),

  body('category_id')
    .notEmpty()
    .withMessage('Category ID is required')
    .custom(isValidObjectId)
    .withMessage('Category ID must be a valid ObjectId'),

  body('agency_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Agency ID must be a valid ObjectId'),

  body('owner_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Owner ID must be a valid ObjectId'),

  body('transaction_type')
    .notEmpty()
    .withMessage('Transaction type is required')
    .isIn(VALID_TRANSACTION_TYPES)
    .withMessage(`Transaction type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),

  body('currency').optional().equals('CHF').withMessage('Currency must be CHF'),

  body('additional_costs')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Additional costs must be a non-negative number'),

  body('rooms').optional().isFloat({ min: 0 }).withMessage('Rooms must be a non-negative number'),

  body('surface')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Surface must be a non-negative number'),

  body('address')
    .notEmpty()
    .withMessage('Address is required')
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Address must be between 3 and 500 characters'),

  body('city_id')
    .notEmpty()
    .withMessage('City ID is required')
    .custom(isValidObjectId)
    .withMessage('City ID must be a valid ObjectId'),

  body('canton_id')
    .notEmpty()
    .withMessage('Canton ID is required')
    .custom(isValidObjectId)
    .withMessage('Canton ID must be a valid ObjectId'),

  body('postal_code')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('Postal code must be between 4 and 10 characters'),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('location_precision')
    .optional()
    .isIn(VALID_LOCATION_PRECISIONS)
    .withMessage(
      `Location precision must be one of: ${VALID_LOCATION_PRECISIONS.join(', ')}`
    ),

  body('geocoding_source')
    .optional()
    .isIn(VALID_GEOCODING_SOURCES)
    .withMessage(`Geocoding source must be one of: ${VALID_GEOCODING_SOURCES.join(', ')}`),

  body('geocoded_at')
    .optional()
    .isISO8601()
    .withMessage('Geocoded at must be a valid ISO 8601 date'),

  body('proximity').optional().isObject().withMessage('Proximity must be an object'),

  body('amenities').optional().isArray().withMessage('Amenities must be an array'),

  body('amenities.*')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Each amenity ID must be a valid ObjectId'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

/**
 * Update property validators
 */
export const updatePropertyValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('external_id')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('External ID must be between 1 and 50 characters'),

  body('external_url').optional().isURL().withMessage('External URL must be a valid URL'),

  body('source_language')
    .optional()
    .isIn(VALID_LANGUAGES)
    .withMessage(`Source language must be one of: ${VALID_LANGUAGES.join(', ')}`),

  body('category_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Category ID must be a valid ObjectId'),

  body('agency_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Agency ID must be a valid ObjectId'),

  body('owner_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Owner ID must be a valid ObjectId'),

  body('transaction_type')
    .optional()
    .isIn(VALID_TRANSACTION_TYPES)
    .withMessage(`Transaction type must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`),

  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),

  body('currency').optional().equals('CHF').withMessage('Currency must be CHF'),

  body('additional_costs')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Additional costs must be a non-negative number'),

  body('rooms').optional().isFloat({ min: 0 }).withMessage('Rooms must be a non-negative number'),

  body('surface')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Surface must be a non-negative number'),

  body('address')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 500 })
    .withMessage('Address must be between 3 and 500 characters'),

  body('city_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('City ID must be a valid ObjectId'),

  body('canton_id')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Canton ID must be a valid ObjectId'),

  body('postal_code')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 4, max: 10 })
    .withMessage('Postal code must be between 4 and 10 characters'),

  body('latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('location_precision')
    .optional()
    .isIn(VALID_LOCATION_PRECISIONS)
    .withMessage(
      `Location precision must be one of: ${VALID_LOCATION_PRECISIONS.join(', ')}`
    ),

  body('geocoding_source')
    .optional()
    .isIn(VALID_GEOCODING_SOURCES)
    .withMessage(`Geocoding source must be one of: ${VALID_GEOCODING_SOURCES.join(', ')}`),

  body('geocoded_at')
    .optional()
    .isISO8601()
    .withMessage('Geocoded at must be a valid ISO 8601 date'),

  body('proximity').optional().isObject().withMessage('Proximity must be an object'),

  body('amenities').optional().isArray().withMessage('Amenities must be an array'),

  body('amenities.*')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Each amenity ID must be a valid ObjectId'),

  body('status')
    .optional()
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

/**
 * Approve property validators
 */
export const approvePropertyValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('reviewed_by')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Reviewed by must be a valid ObjectId'),
];

/**
 * Reject property validators
 */
export const rejectPropertyValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('reviewed_by')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Reviewed by must be a valid ObjectId'),

  body('rejection_reason')
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Rejection reason must be between 10 and 1000 characters'),
];

/**
 * Update property status validators
 */
export const updateStatusValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),

  body('reviewed_by')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Reviewed by must be a valid ObjectId'),

  body('rejection_reason')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Rejection reason must be between 10 and 1000 characters'),
];

/**
 * Add image validators
 */
export const addImageValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('url')
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Image URL must be a valid URL'),

  body('thumbnail_url').optional().isURL().withMessage('Thumbnail URL must be a valid URL'),

  body('alt_text')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Alt text must be between 1 and 200 characters'),

  body('caption')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Caption must be between 1 and 500 characters'),

  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  body('is_primary').optional().isBoolean().withMessage('Is primary must be a boolean'),
];

/**
 * Update image validators
 */
export const updateImageValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  param('imageId')
    .notEmpty()
    .withMessage('Image ID is required')
    .custom(isValidObjectId)
    .withMessage('Image ID must be a valid ObjectId'),

  body('url').optional().isURL().withMessage('Image URL must be a valid URL'),

  body('thumbnail_url').optional().isURL().withMessage('Thumbnail URL must be a valid URL'),

  body('alt_text')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Alt text must be between 1 and 200 characters'),

  body('caption')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Caption must be between 1 and 500 characters'),

  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  body('is_primary').optional().isBoolean().withMessage('Is primary must be a boolean'),
];

/**
 * Delete image validators
 */
export const deleteImageValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  param('imageId')
    .notEmpty()
    .withMessage('Image ID is required')
    .custom(isValidObjectId)
    .withMessage('Image ID must be a valid ObjectId'),
];

/**
 * Reorder images validators
 */
export const reorderImagesValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('orders').isArray({ min: 1 }).withMessage('Orders must be a non-empty array'),

  body('orders.*.id')
    .notEmpty()
    .withMessage('Image ID is required')
    .custom(isValidObjectId)
    .withMessage('Image ID must be a valid ObjectId'),

  body('orders.*.sort_order')
    .notEmpty()
    .withMessage('Sort order is required')
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),
];

/**
 * Upload image from URL validators
 */
export const uploadImageFromUrlValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('url')
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Image URL must be a valid URL'),

  body('alt_text')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Alt text must be between 1 and 200 characters'),

  body('caption')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Caption must be between 1 and 500 characters'),

  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  body('is_primary').optional().isBoolean().withMessage('Is primary must be a boolean'),
];

/**
 * External image reference validators
 */
export const externalImageValidators: ValidationChain[] = [
  ...propertyIdParamValidator,

  body('url')
    .notEmpty()
    .withMessage('Image URL is required')
    .isURL()
    .withMessage('Image URL must be a valid URL'),

  body('alt_text')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Alt text must be between 1 and 200 characters'),

  body('caption')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Caption must be between 1 and 500 characters'),

  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a non-negative integer'),

  body('is_primary').optional().isBoolean().withMessage('Is primary must be a boolean'),
];
