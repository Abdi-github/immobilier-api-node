import { Router } from 'express';

import { searchController } from './search.controller.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import {
  propertySearchValidators,
  locationSearchValidators,
  unifiedSearchValidators,
  suggestionsValidators,
  facetsValidators,
} from './search.validator.js';

const router = Router();

/**
 * @route   GET /api/v1/public/search
 * @desc    Unified search across properties and locations
 * @access  Public
 * @query   q (required), lang, limit
 */
router.get('/', unifiedSearchValidators.search, validate, searchController.unifiedSearch);

/**
 * @route   GET /api/v1/public/search/properties
 * @desc    Search properties with offset pagination
 * @access  Public
 * @query   q, page, limit, lang, sort, canton_id, city_id, category_id, transaction_type, price_min, price_max, rooms_min, rooms_max, surface_min, surface_max, amenities, agency_id
 */
router.get(
  '/properties',
  propertySearchValidators.search,
  validate,
  searchController.searchProperties
);

/**
 * @route   GET /api/v1/public/search/properties/cursor
 * @desc    Search properties with cursor-based pagination
 * @access  Public
 * @query   Same as /properties plus cursor, cursor_direction
 */
router.get(
  '/properties/cursor',
  [...propertySearchValidators.search, ...propertySearchValidators.cursorSearch],
  validate,
  searchController.searchPropertiesWithCursor
);

/**
 * @route   GET /api/v1/public/search/locations
 * @desc    Search locations (cantons and cities)
 * @access  Public
 * @query   q (required), lang, limit, include_cantons, include_cities
 */
router.get(
  '/locations',
  locationSearchValidators.search,
  validate,
  searchController.searchLocations
);

/**
 * @route   GET /api/v1/public/search/suggestions
 * @desc    Get search suggestions (autocomplete)
 * @access  Public
 * @query   q (required), lang, limit
 */
router.get(
  '/suggestions',
  suggestionsValidators.getSuggestions,
  validate,
  searchController.getSearchSuggestions
);

/**
 * @route   GET /api/v1/public/search/facets
 * @desc    Get search facets for filtering UI
 * @access  Public
 * @query   lang, fields, plus all property search filters
 */
router.get(
  '/facets',
  [...propertySearchValidators.search, ...facetsValidators.getFacets],
  validate,
  searchController.getSearchFacets
);

export default router;
