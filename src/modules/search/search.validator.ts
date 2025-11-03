import { query } from 'express-validator';

/**
 * Property Search Validators
 */
export const propertySearchValidators = {
  /**
   * Validate property search query parameters
   */
  search: [
    query('q')
      .optional()
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 2, max: 200 })
      .withMessage('Search query must be between 2 and 200 characters')
      .trim()
      .escape(),

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

    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),

    query('sort')
      .optional()
      .isIn([
        'relevance',
        'price_asc',
        'price_desc',
        'date_newest',
        'date_oldest',
        'rooms_asc',
        'rooms_desc',
        'surface_asc',
        'surface_desc',
      ])
      .withMessage('Invalid sort option'),

    // Location filters
    query('canton_id')
      .optional()
      .isMongoId()
      .withMessage('Canton ID must be a valid MongoDB ObjectId'),

    query('canton_ids')
      .optional()
      .isString()
      .withMessage('Canton IDs must be a comma-separated string')
      .custom((value) => {
        const ids = value.split(',');
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        return ids.every((id: string) => mongoIdRegex.test(id.trim()));
      })
      .withMessage('All canton IDs must be valid MongoDB ObjectIds'),

    query('city_id').optional().isMongoId().withMessage('City ID must be a valid MongoDB ObjectId'),

    query('city_ids')
      .optional()
      .isString()
      .custom((value) => {
        const ids = value.split(',');
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        return ids.every((id: string) => mongoIdRegex.test(id.trim()));
      })
      .withMessage('All city IDs must be valid MongoDB ObjectIds'),

    query('postal_code')
      .optional()
      .isString()
      .isLength({ min: 4, max: 10 })
      .withMessage('Postal code must be between 4 and 10 characters'),

    query('postal_codes')
      .optional()
      .isString()
      .withMessage('Postal codes must be a comma-separated string'),

    // Property filters
    query('category_id')
      .optional()
      .isMongoId()
      .withMessage('Category ID must be a valid MongoDB ObjectId'),

    query('category_ids')
      .optional()
      .isString()
      .custom((value) => {
        const ids = value.split(',');
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        return ids.every((id: string) => mongoIdRegex.test(id.trim()));
      })
      .withMessage('All category IDs must be valid MongoDB ObjectIds'),

    query('transaction_type')
      .optional()
      .isIn(['rent', 'buy'])
      .withMessage('Transaction type must be either rent or buy'),

    query('agency_id')
      .optional()
      .isMongoId()
      .withMessage('Agency ID must be a valid MongoDB ObjectId'),

    // Price filters
    query('price_min')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum price must be a non-negative integer')
      .toInt(),

    query('price_max')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Maximum price must be a non-negative integer')
      .toInt()
      .custom((value, { req }) => {
        if (req.query?.price_min && value < parseInt(req.query.price_min as string, 10)) {
          throw new Error('Maximum price must be greater than or equal to minimum price');
        }
        return true;
      }),

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
      .toFloat()
      .custom((value, { req }) => {
        if (req.query?.rooms_min && value < parseFloat(req.query.rooms_min as string)) {
          throw new Error('Maximum rooms must be greater than or equal to minimum rooms');
        }
        return true;
      }),

    query('surface_min')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Minimum surface must be a non-negative integer')
      .toInt(),

    query('surface_max')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Maximum surface must be a non-negative integer')
      .toInt()
      .custom((value, { req }) => {
        if (req.query?.surface_min && value < parseInt(req.query.surface_min as string, 10)) {
          throw new Error('Maximum surface must be greater than or equal to minimum surface');
        }
        return true;
      }),

    // Amenities filter
    query('amenities')
      .optional()
      .isString()
      .custom((value) => {
        const ids = value.split(',');
        const mongoIdRegex = /^[0-9a-fA-F]{24}$/;
        return ids.every((id: string) => mongoIdRegex.test(id.trim()));
      })
      .withMessage('All amenity IDs must be valid MongoDB ObjectIds'),
  ],

  /**
   * Validate cursor-based pagination parameters
   */
  cursorSearch: [
    query('cursor').optional().isString().withMessage('Cursor must be a string'),

    query('cursor_direction')
      .optional()
      .isIn(['next', 'prev'])
      .withMessage('Cursor direction must be either next or prev'),
  ],
};

/**
 * Location Search Validators
 */
export const locationSearchValidators = {
  /**
   * Validate location search query parameters
   */
  search: [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters')
      .trim(),

    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
      .toInt(),

    query('include_cantons')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('include_cantons must be true or false'),

    query('include_cities')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('include_cities must be true or false'),
  ],
};

/**
 * Unified Search Validators
 */
export const unifiedSearchValidators = {
  /**
   * Validate unified search query parameters
   */
  search: [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 2, max: 200 })
      .withMessage('Search query must be between 2 and 200 characters')
      .trim(),

    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
      .toInt(),
  ],
};

/**
 * Suggestions Validators
 */
export const suggestionsValidators = {
  /**
   * Validate suggestions query parameters
   */
  getSuggestions: [
    query('q')
      .notEmpty()
      .withMessage('Search query is required')
      .isString()
      .withMessage('Search query must be a string')
      .isLength({ min: 2, max: 100 })
      .withMessage('Search query must be between 2 and 100 characters')
      .trim(),

    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20')
      .toInt(),
  ],
};

/**
 * Facets Validators
 */
export const facetsValidators = {
  /**
   * Validate facets query parameters
   */
  getFacets: [
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),

    query('fields')
      .optional()
      .isString()
      .custom((value) => {
        const validFields = ['category_id', 'canton_id', 'city_id', 'transaction_type'];
        const fields = value.split(',');
        return fields.every((f: string) => validFields.includes(f.trim()));
      })
      .withMessage('Fields must be one of: category_id, canton_id, city_id, transaction_type'),
  ],
};
