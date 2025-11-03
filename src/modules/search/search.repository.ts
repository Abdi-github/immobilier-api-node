import mongoose, { PipelineStage } from 'mongoose';
import crypto from 'crypto';

import { Property } from '../property/property.model.js';
import { PropertyTranslation } from '../property-translation/property-translation.model.js';
import { PropertyImage } from '../property/property-image.model.js';
import { Canton } from '../location/canton.model.js';
import { City } from '../location/city.model.js';
import { getRedisClient } from '../../config/redis.js';
import { config } from '../../config/index.js';
import { logger } from '../../shared/logger/index.js';
import {
  SearchFilterOptions,
  SearchPaginationOptions,
  SearchCursorPaginationOptions,
  PropertyAggregationResult,
  PropertySearchResultDto,
  LocationSearchResultDto,
  SupportedLanguage,
} from './search.types.js';

// Cache TTL in seconds
const SEARCH_CACHE_TTL = 300; // 5 minutes
const SUGGESTIONS_CACHE_TTL = 3600; // 1 hour

/**
 * Search Repository
 * Handles all database operations for search functionality
 */
export class SearchRepository {
  /**
   * Generate cache key for search queries
   */
  private generateCacheKey(prefix: string, params: Record<string, unknown>): string {
    const hash = crypto.createHash('md5').update(JSON.stringify(params)).digest('hex');
    return `search:${prefix}:${hash}`;
  }

  /**
   * Get cached search results
   */
  private async getCachedResults<T>(key: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      const cached = await redis.get(key);
      if (cached) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(cached) as T;
      }
      return null;
    } catch (error) {
      logger.warn('Redis cache read error:', error);
      return null;
    }
  }

  /**
   * Set cached search results
   */
  private async setCachedResults(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.setex(key, ttl, JSON.stringify(data));
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      logger.warn('Redis cache write error:', error);
    }
  }

  /**
   * Invalidate search cache by pattern
   */
  async invalidateCache(pattern: string = 'search:*'): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`Invalidated ${keys.length} cache keys matching: ${pattern}`);
      }
    } catch (error) {
      logger.warn('Redis cache invalidation error:', error);
    }
  }

  /**
   * Build aggregation match stage for property search
   */
  private buildPropertyMatchStage(filters: SearchFilterOptions): Record<string, unknown> {
    const match: Record<string, unknown> = {
      // Only search PUBLISHED properties
      status: 'PUBLISHED',
    };

    // Location filters
    if (filters.canton_id) {
      match.canton_id = new mongoose.Types.ObjectId(filters.canton_id);
    } else if (filters.canton_ids && filters.canton_ids.length > 0) {
      match.canton_id = {
        $in: filters.canton_ids.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (filters.city_id) {
      match.city_id = new mongoose.Types.ObjectId(filters.city_id);
    } else if (filters.city_ids && filters.city_ids.length > 0) {
      match.city_id = {
        $in: filters.city_ids.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (filters.postal_code) {
      match.postal_code = filters.postal_code;
    } else if (filters.postal_codes && filters.postal_codes.length > 0) {
      match.postal_code = { $in: filters.postal_codes };
    }

    // Property filters
    if (filters.category_id) {
      match.category_id = new mongoose.Types.ObjectId(filters.category_id);
    } else if (filters.category_ids && filters.category_ids.length > 0) {
      match.category_id = {
        $in: filters.category_ids.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    if (filters.transaction_type) {
      match.transaction_type = filters.transaction_type;
    }

    if (filters.agency_id) {
      match.agency_id = new mongoose.Types.ObjectId(filters.agency_id);
    }

    // Price range
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
      match.price = {};
      if (filters.price_min !== undefined) {
        (match.price as Record<string, number>).$gte = filters.price_min;
      }
      if (filters.price_max !== undefined) {
        (match.price as Record<string, number>).$lte = filters.price_max;
      }
    }

    // Rooms range
    if (filters.rooms_min !== undefined || filters.rooms_max !== undefined) {
      match.rooms = {};
      if (filters.rooms_min !== undefined) {
        (match.rooms as Record<string, number>).$gte = filters.rooms_min;
      }
      if (filters.rooms_max !== undefined) {
        (match.rooms as Record<string, number>).$lte = filters.rooms_max;
      }
    }

    // Surface range
    if (filters.surface_min !== undefined || filters.surface_max !== undefined) {
      match.surface = {};
      if (filters.surface_min !== undefined) {
        (match.surface as Record<string, number>).$gte = filters.surface_min;
      }
      if (filters.surface_max !== undefined) {
        (match.surface as Record<string, number>).$lte = filters.surface_max;
      }
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      match.amenities = {
        $all: filters.amenities.map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    return match;
  }

  /**
   * Get sort stage based on sort option
   * Note: textScore is only available with $text search, not regex search
   * Since we use regex for flexible language-aware search, we fall back to date sorting for relevance
   */
  private getSortStage(sort: string, _hasTextSearch: boolean): Record<string, 1 | -1> {
    switch (sort) {
      case 'relevance':
        // Note: Cannot use textScore with regex search, fallback to newest first
        return { published_at: -1, _id: -1 };
      case 'price_asc':
        return { price: 1, published_at: -1 };
      case 'price_desc':
        return { price: -1, published_at: -1 };
      case 'date_newest':
        return { published_at: -1, _id: -1 };
      case 'date_oldest':
        return { published_at: 1, _id: 1 };
      case 'rooms_asc':
        return { rooms: 1, published_at: -1 };
      case 'rooms_desc':
        return { rooms: -1, published_at: -1 };
      case 'surface_asc':
        return { surface: 1, published_at: -1 };
      case 'surface_desc':
        return { surface: -1, published_at: -1 };
      default:
        return { published_at: -1, _id: -1 };
    }
  }

  /**
   * Search properties with aggregation pipeline
   * Language-aware: Only returns properties with APPROVED translations in the specified language
   */
  async searchProperties(
    filters: SearchFilterOptions,
    pagination: SearchPaginationOptions,
    useCache = true
  ): Promise<{ results: PropertyAggregationResult[]; total: number }> {
    const cacheKey = this.generateCacheKey('properties', { filters, pagination });

    // Check cache
    if (useCache) {
      const cached = await this.getCachedResults<{
        results: PropertyAggregationResult[];
        total: number;
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const hasTextSearch = !!filters.search;
    const propertyMatch = this.buildPropertyMatchStage(filters);

    // Build aggregation pipeline
    const pipeline: PipelineStage[] = [
      // Match properties
      { $match: propertyMatch },

      // Join with translations (CRITICAL: only APPROVED translations)
      {
        $lookup: {
          from: 'property_translations',
          let: { property_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$property_id', '$$property_id'] },
                language: filters.lang,
                approval_status: 'APPROVED',
              },
            },
            { $limit: 1 },
          ],
          as: 'translation',
        },
      },

      // Unwind translation (only keep properties with translations in the requested language)
      { $unwind: '$translation' },

      // Add text search filter on translation fields if search query provided
      ...(hasTextSearch
        ? [
            {
              $match: {
                $or: [
                  { 'translation.title': { $regex: filters.search, $options: 'i' } },
                  { 'translation.description': { $regex: filters.search, $options: 'i' } },
                  { address: { $regex: filters.search, $options: 'i' } },
                ],
              },
            } as PipelineStage,
          ]
        : []),

      // Lookup category
      {
        $lookup: {
          from: 'categories',
          localField: 'category_id',
          foreignField: '_id',
          as: 'category',
        },
      },

      // Lookup city
      {
        $lookup: {
          from: 'cities',
          localField: 'city_id',
          foreignField: '_id',
          as: 'city',
        },
      },

      // Lookup canton
      {
        $lookup: {
          from: 'cantons',
          localField: 'canton_id',
          foreignField: '_id',
          as: 'canton',
        },
      },

      // Lookup agency (optional)
      {
        $lookup: {
          from: 'agencies',
          localField: 'agency_id',
          foreignField: '_id',
          as: 'agency',
        },
      },

      // Lookup primary image
      {
        $lookup: {
          from: 'property_images',
          let: { property_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$property_id', '$$property_id'] },
                is_primary: true,
              },
            },
            { $limit: 1 },
          ],
          as: 'primary_image',
        },
      },

      // Project final fields
      {
        $project: {
          _id: 1,
          external_id: 1,
          transaction_type: 1,
          price: 1,
          currency: 1,
          additional_costs: 1,
          rooms: 1,
          surface: 1,
          address: 1,
          postal_code: 1,
          status: 1,
          published_at: 1,
          created_at: 1,
          updated_at: 1,
          title: '$translation.title',
          description: '$translation.description',
          category: 1,
          city: 1,
          canton: 1,
          agency: 1,
          primary_image: 1,
        },
      },
    ];

    // Get total count
    const countPipeline = [...pipeline.slice(0, hasTextSearch ? 4 : 3), { $count: 'total' }];
    const countResult = await Property.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sort and pagination
    const sortStage = this.getSortStage(pagination.sort, hasTextSearch);
    pipeline.push({ $sort: sortStage as Record<string, 1 | -1> });
    pipeline.push({ $skip: (pagination.page - 1) * pagination.limit });
    pipeline.push({ $limit: pagination.limit });

    const results = await Property.aggregate<PropertyAggregationResult>(pipeline);

    const response = { results, total };

    // Cache results
    if (useCache) {
      await this.setCachedResults(cacheKey, response, SEARCH_CACHE_TTL);
    }

    return response;
  }

  /**
   * Search properties with cursor-based pagination
   */
  async searchPropertiesWithCursor(
    filters: SearchFilterOptions,
    pagination: SearchCursorPaginationOptions,
    useCache = true
  ): Promise<{
    results: PropertyAggregationResult[];
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
    prevCursor?: string;
  }> {
    const cacheKey = this.generateCacheKey('properties_cursor', { filters, pagination });

    // Check cache
    if (useCache) {
      const cached = await this.getCachedResults<{
        results: PropertyAggregationResult[];
        hasNext: boolean;
        hasPrev: boolean;
        nextCursor?: string;
        prevCursor?: string;
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const hasTextSearch = !!filters.search;
    const propertyMatch = this.buildPropertyMatchStage(filters);

    // Decode cursor if provided
    let cursorData: { published_at: Date; _id: string } | null = null;
    if (pagination.cursor) {
      try {
        cursorData = JSON.parse(Buffer.from(pagination.cursor, 'base64').toString('utf8'));
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Add cursor condition
    if (cursorData) {
      const cursorCondition =
        pagination.cursor_direction === 'next'
          ? {
              $or: [
                { published_at: { $lt: new Date(cursorData.published_at) } },
                {
                  published_at: new Date(cursorData.published_at),
                  _id: { $lt: new mongoose.Types.ObjectId(cursorData._id) },
                },
              ],
            }
          : {
              $or: [
                { published_at: { $gt: new Date(cursorData.published_at) } },
                {
                  published_at: new Date(cursorData.published_at),
                  _id: { $gt: new mongoose.Types.ObjectId(cursorData._id) },
                },
              ],
            };
      Object.assign(propertyMatch, cursorCondition);
    }

    // Build pipeline
    const pipeline: PipelineStage[] = [
      { $match: propertyMatch },
      {
        $lookup: {
          from: 'property_translations',
          let: { property_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$property_id', '$$property_id'] },
                language: filters.lang,
                approval_status: 'APPROVED',
              },
            },
            { $limit: 1 },
          ],
          as: 'translation',
        },
      },
      { $unwind: '$translation' },
      ...(hasTextSearch
        ? [
            {
              $match: {
                $or: [
                  { 'translation.title': { $regex: filters.search, $options: 'i' } },
                  { 'translation.description': { $regex: filters.search, $options: 'i' } },
                  { address: { $regex: filters.search, $options: 'i' } },
                ],
              },
            } as PipelineStage,
          ]
        : []),
      {
        $lookup: {
          from: 'categories',
          localField: 'category_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      {
        $lookup: {
          from: 'cities',
          localField: 'city_id',
          foreignField: '_id',
          as: 'city',
        },
      },
      {
        $lookup: {
          from: 'cantons',
          localField: 'canton_id',
          foreignField: '_id',
          as: 'canton',
        },
      },
      {
        $lookup: {
          from: 'agencies',
          localField: 'agency_id',
          foreignField: '_id',
          as: 'agency',
        },
      },
      {
        $lookup: {
          from: 'property_images',
          let: { property_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$property_id', '$$property_id'] },
                is_primary: true,
              },
            },
            { $limit: 1 },
          ],
          as: 'primary_image',
        },
      },
      {
        $project: {
          _id: 1,
          external_id: 1,
          transaction_type: 1,
          price: 1,
          currency: 1,
          additional_costs: 1,
          rooms: 1,
          surface: 1,
          address: 1,
          postal_code: 1,
          status: 1,
          published_at: 1,
          created_at: 1,
          updated_at: 1,
          title: '$translation.title',
          description: '$translation.description',
          category: 1,
          city: 1,
          canton: 1,
          agency: 1,
          primary_image: 1,
        },
      },
      {
        $sort:
          pagination.cursor_direction === 'prev'
            ? { published_at: 1, _id: 1 }
            : { published_at: -1, _id: -1 },
      },
      { $limit: pagination.limit + 1 }, // Fetch one extra to check for more
    ];

    let results = await Property.aggregate<PropertyAggregationResult>(pipeline);

    // Check if there are more results
    const hasMore = results.length > pagination.limit;
    if (hasMore) {
      results = results.slice(0, pagination.limit);
    }

    // Reverse results if going backwards
    if (pagination.cursor_direction === 'prev') {
      results.reverse();
    }

    // Generate cursors
    const firstResult = results[0];
    const lastResult = results[results.length - 1];

    const nextCursor = lastResult
      ? Buffer.from(
          JSON.stringify({
            published_at: lastResult.published_at,
            _id: lastResult._id,
          })
        ).toString('base64')
      : undefined;

    const prevCursor = firstResult
      ? Buffer.from(
          JSON.stringify({
            published_at: firstResult.published_at,
            _id: firstResult._id,
          })
        ).toString('base64')
      : undefined;

    const response = {
      results,
      hasNext: pagination.cursor_direction === 'prev' || hasMore,
      hasPrev: pagination.cursor_direction === 'next' && !!pagination.cursor,
      nextCursor: hasMore || pagination.cursor_direction === 'prev' ? nextCursor : undefined,
      prevCursor: pagination.cursor ? prevCursor : undefined,
    };

    // Cache results
    if (useCache) {
      await this.setCachedResults(cacheKey, response, SEARCH_CACHE_TTL);
    }

    return response;
  }

  /**
   * Search locations (cantons and cities)
   */
  async searchLocations(
    query: string,
    lang: SupportedLanguage = 'en',
    limit = 10,
    includeCantons = true,
    includeCities = true,
    useCache = true
  ): Promise<{ cantons: LocationSearchResultDto[]; cities: LocationSearchResultDto[] }> {
    const cacheKey = this.generateCacheKey('locations', {
      query,
      lang,
      limit,
      includeCantons,
      includeCities,
    });

    // Check cache
    if (useCache) {
      const cached = await this.getCachedResults<{
        cantons: LocationSearchResultDto[];
        cities: LocationSearchResultDto[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const searchRegex = new RegExp(query, 'i');
    const cantons: LocationSearchResultDto[] = [];
    const cities: LocationSearchResultDto[] = [];

    // Search cantons
    if (includeCantons) {
      const cantonResults = await Canton.find({
        $or: [{ code: searchRegex }, { [`name.${lang}`]: searchRegex }, { 'name.en': searchRegex }],
        is_active: true,
      })
        .limit(limit)
        .lean();

      for (const canton of cantonResults) {
        const name = canton.name as { en?: string; fr?: string; de?: string; it?: string };
        cantons.push({
          id: canton._id.toString(),
          type: 'canton',
          name: name[lang] || name.en || '',
          code: canton.code,
        });
      }
    }

    // Search cities
    if (includeCities) {
      const cityPipeline: PipelineStage[] = [
        {
          $match: {
            $or: [
              { name: searchRegex },
              { [`name.${lang}`]: searchRegex },
              { postal_code: searchRegex },
            ],
            is_active: true,
          },
        },
        {
          $lookup: {
            from: 'cantons',
            localField: 'canton_id',
            foreignField: '_id',
            as: 'canton_data',
          },
        },
        { $unwind: '$canton_data' },
        { $limit: limit },
      ];

      const cityResults = await City.aggregate(cityPipeline);

      for (const city of cityResults) {
        const cityName =
          typeof city.name === 'string' ? city.name : city.name[lang] || city.name.en || '';
        const cantonName = city.canton_data.name as {
          en?: string;
          fr?: string;
          de?: string;
          it?: string;
        };

        cities.push({
          id: city._id.toString(),
          type: 'city',
          name: cityName,
          postal_code: city.postal_code,
          canton: {
            id: city.canton_data._id.toString(),
            name: cantonName[lang] || cantonName.en || '',
            code: city.canton_data.code,
          },
        });
      }
    }

    const response = { cantons, cities };

    // Cache results
    if (useCache) {
      await this.setCachedResults(cacheKey, response, SUGGESTIONS_CACHE_TTL);
    }

    return response;
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    query: string,
    lang: SupportedLanguage = 'en',
    limit = 5,
    useCache = true
  ): Promise<{ suggestions: string[]; locations: LocationSearchResultDto[] }> {
    const cacheKey = this.generateCacheKey('suggestions', { query, lang, limit });

    // Check cache
    if (useCache) {
      const cached = await this.getCachedResults<{
        suggestions: string[];
        locations: LocationSearchResultDto[];
      }>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const searchRegex = new RegExp(`^${query}`, 'i');

    // Get title suggestions from translations
    const titleSuggestions = await PropertyTranslation.aggregate([
      {
        $match: {
          language: lang,
          approval_status: 'APPROVED',
          title: searchRegex,
        },
      },
      {
        $group: {
          _id: '$title',
        },
      },
      { $limit: limit },
    ]);

    const suggestions = titleSuggestions.map((s) => s._id as string);

    // Get location suggestions
    const locations = await this.searchLocations(query, lang, limit, true, true, false);
    const locationResults = [...locations.cantons, ...locations.cities].slice(0, limit);

    const response = { suggestions, locations: locationResults };

    // Cache results
    if (useCache) {
      await this.setCachedResults(cacheKey, response, SUGGESTIONS_CACHE_TTL);
    }

    return response;
  }

  /**
   * Get property count by filters (for faceted search)
   */
  async getPropertyCountByFilters(
    baseFilters: SearchFilterOptions,
    facetField: string
  ): Promise<{ _id: string; count: number }[]> {
    const propertyMatch = this.buildPropertyMatchStage(baseFilters);

    const pipeline: PipelineStage[] = [
      { $match: propertyMatch },
      {
        $lookup: {
          from: 'property_translations',
          let: { property_id: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$property_id', '$$property_id'] },
                language: baseFilters.lang,
                approval_status: 'APPROVED',
              },
            },
            { $limit: 1 },
          ],
          as: 'translation',
        },
      },
      { $match: { 'translation.0': { $exists: true } } },
      {
        $group: {
          _id: `$${facetField}`,
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ];

    return Property.aggregate(pipeline);
  }
}

// Export singleton instance
export const searchRepository = new SearchRepository();
