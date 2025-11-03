import { Request, Response } from 'express';

import { searchService } from './search.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse } from '../../shared/utils/response.helper.js';
import {
  PropertySearchQueryDto,
  LocationSearchQueryDto,
  UnifiedSearchQueryDto,
  SearchSuggestionsQueryDto,
  SupportedLanguage,
} from './search.types.js';
import { TransactionType } from '../property/property.model.js';

/**
 * Search Controller
 * Handles HTTP requests for search operations
 */
class SearchController {
  /**
   * Search properties with offset pagination
   * GET /api/v1/public/search/properties
   */
  searchProperties = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: PropertySearchQueryDto = {
      q: req.query.q as string,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      lang: (req.query.lang as SupportedLanguage) || 'en',
      sort: req.query.sort as PropertySearchQueryDto['sort'],

      // Location filters
      canton_id: req.query.canton_id as string,
      canton_ids: req.query.canton_ids ? (req.query.canton_ids as string).split(',') : undefined,
      city_id: req.query.city_id as string,
      city_ids: req.query.city_ids ? (req.query.city_ids as string).split(',') : undefined,
      postal_code: req.query.postal_code as string,
      postal_codes: req.query.postal_codes
        ? (req.query.postal_codes as string).split(',')
        : undefined,

      // Property filters
      category_id: req.query.category_id as string,
      category_ids: req.query.category_ids
        ? (req.query.category_ids as string).split(',')
        : undefined,
      transaction_type: req.query.transaction_type as TransactionType,

      // Price filters
      price_min: req.query.price_min ? parseInt(req.query.price_min as string, 10) : undefined,
      price_max: req.query.price_max ? parseInt(req.query.price_max as string, 10) : undefined,

      // Size filters
      rooms_min: req.query.rooms_min ? parseFloat(req.query.rooms_min as string) : undefined,
      rooms_max: req.query.rooms_max ? parseFloat(req.query.rooms_max as string) : undefined,
      surface_min: req.query.surface_min
        ? parseInt(req.query.surface_min as string, 10)
        : undefined,
      surface_max: req.query.surface_max
        ? parseInt(req.query.surface_max as string, 10)
        : undefined,

      // Amenities
      amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined,

      // Agency
      agency_id: req.query.agency_id as string,
    };

    const result = await searchService.searchProperties(query);

    sendSuccessResponse(res, 200, 'Properties search results', result);
  });

  /**
   * Search properties with cursor-based pagination
   * GET /api/v1/public/search/properties/cursor
   */
  searchPropertiesWithCursor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: PropertySearchQueryDto = {
      q: req.query.q as string,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      lang: (req.query.lang as SupportedLanguage) || 'en',
      sort: req.query.sort as PropertySearchQueryDto['sort'],
      cursor: req.query.cursor as string,
      cursor_direction: (req.query.cursor_direction as 'next' | 'prev') || 'next',

      // Location filters
      canton_id: req.query.canton_id as string,
      canton_ids: req.query.canton_ids ? (req.query.canton_ids as string).split(',') : undefined,
      city_id: req.query.city_id as string,
      city_ids: req.query.city_ids ? (req.query.city_ids as string).split(',') : undefined,
      postal_code: req.query.postal_code as string,
      postal_codes: req.query.postal_codes
        ? (req.query.postal_codes as string).split(',')
        : undefined,

      // Property filters
      category_id: req.query.category_id as string,
      category_ids: req.query.category_ids
        ? (req.query.category_ids as string).split(',')
        : undefined,
      transaction_type: req.query.transaction_type as TransactionType,

      // Price filters
      price_min: req.query.price_min ? parseInt(req.query.price_min as string, 10) : undefined,
      price_max: req.query.price_max ? parseInt(req.query.price_max as string, 10) : undefined,

      // Size filters
      rooms_min: req.query.rooms_min ? parseFloat(req.query.rooms_min as string) : undefined,
      rooms_max: req.query.rooms_max ? parseFloat(req.query.rooms_max as string) : undefined,
      surface_min: req.query.surface_min
        ? parseInt(req.query.surface_min as string, 10)
        : undefined,
      surface_max: req.query.surface_max
        ? parseInt(req.query.surface_max as string, 10)
        : undefined,

      // Amenities
      amenities: req.query.amenities ? (req.query.amenities as string).split(',') : undefined,

      // Agency
      agency_id: req.query.agency_id as string,
    };

    const result = await searchService.searchPropertiesWithCursor(query);

    sendSuccessResponse(res, 200, 'Properties search results (cursor)', result);
  });

  /**
   * Search locations (cantons and cities)
   * GET /api/v1/public/search/locations
   */
  searchLocations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: LocationSearchQueryDto = {
      q: req.query.q as string,
      lang: req.query.lang as SupportedLanguage,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      include_cantons: req.query.include_cantons !== 'false',
      include_cities: req.query.include_cities !== 'false',
    };

    const result = await searchService.searchLocations(query);

    sendSuccessResponse(res, 200, 'Location search results', result);
  });

  /**
   * Unified search across properties and locations
   * GET /api/v1/public/search
   */
  unifiedSearch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: UnifiedSearchQueryDto = {
      q: req.query.q as string,
      lang: req.query.lang as SupportedLanguage,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 5,
    };

    const result = await searchService.unifiedSearch(query);

    sendSuccessResponse(res, 200, 'Unified search results', result);
  });

  /**
   * Get search suggestions (autocomplete)
   * GET /api/v1/public/search/suggestions
   */
  getSearchSuggestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: SearchSuggestionsQueryDto = {
      q: req.query.q as string,
      lang: req.query.lang as SupportedLanguage,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 5,
    };

    const result = await searchService.getSearchSuggestions(query);

    sendSuccessResponse(res, 200, 'Search suggestions', result);
  });

  /**
   * Get search facets for filtering UI
   * GET /api/v1/public/search/facets
   */
  getSearchFacets = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: PropertySearchQueryDto = {
      q: req.query.q as string,
      lang: (req.query.lang as SupportedLanguage) || 'en',
      canton_id: req.query.canton_id as string,
      city_id: req.query.city_id as string,
      category_id: req.query.category_id as string,
      transaction_type: req.query.transaction_type as TransactionType,
      price_min: req.query.price_min ? parseInt(req.query.price_min as string, 10) : undefined,
      price_max: req.query.price_max ? parseInt(req.query.price_max as string, 10) : undefined,
    };

    const facetFields = req.query.fields
      ? (req.query.fields as string).split(',')
      : ['category_id', 'canton_id', 'transaction_type'];

    const result = await searchService.getSearchFacets(query, facetFields);

    sendSuccessResponse(res, 200, 'Search facets', result);
  });

  /**
   * Invalidate search cache (admin only)
   * POST /api/v1/admin/search/cache/invalidate
   */
  invalidateCache = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    await searchService.invalidateCache();

    sendSuccessResponse(res, 200, 'Search cache invalidated successfully');
  });
}

// Export singleton instance
export const searchController = new SearchController();
