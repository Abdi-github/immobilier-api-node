import { searchRepository } from './search.repository.js';
import { BadRequestError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';
import {
  PropertySearchQueryDto,
  LocationSearchQueryDto,
  UnifiedSearchQueryDto,
  SearchSuggestionsQueryDto,
  PropertySearchResponseDto,
  PropertySearchCursorResponseDto,
  PropertySearchResultDto,
  LocationSearchResponseDto,
  UnifiedSearchResponseDto,
  SearchSuggestionsResponseDto,
  SearchFilterOptions,
  SearchPaginationOptions,
  PropertyAggregationResult,
  SupportedLanguage,
} from './search.types.js';

/**
 * Search Service
 * Business logic for search operations
 */
export class SearchService {
  // ==================== HELPER METHODS ====================

  /**
   * Transform aggregation result to search result DTO
   */
  private transformToSearchResult(
    result: PropertyAggregationResult,
    lang: SupportedLanguage
  ): PropertySearchResultDto {
    const category = result.category[0];
    const city = result.city[0];
    const canton = result.canton[0];
    const agency = result.agency?.[0];
    const image = result.primary_image?.[0];

    // Get localized names
    const categoryName =
      typeof category?.name === 'string'
        ? category.name
        : category?.name[lang] || category?.name.en || '';

    const cityName =
      typeof city?.name === 'string' ? city.name : city?.name[lang] || city?.name.en || '';

    const cantonName =
      typeof canton?.name === 'string' ? canton.name : canton?.name[lang] || canton?.name.en || '';

    return {
      id: result._id.toString(),
      external_id: result.external_id,
      title: result.title,
      description: this.truncateDescription(result.description, 200),
      transaction_type: result.transaction_type,
      price: result.price,
      currency: result.currency || 'CHF',
      additional_costs: result.additional_costs,
      rooms: result.rooms,
      surface: result.surface,
      address: result.address,
      postal_code: result.postal_code,
      status: result.status,
      published_at: result.published_at,
      category: {
        id: category?._id?.toString() || '',
        name: categoryName,
        section: category?.section || '',
      },
      city: {
        id: city?._id?.toString() || '',
        name: cityName,
      },
      canton: {
        id: canton?._id?.toString() || '',
        name: cantonName,
        code: canton?.code || '',
      },
      agency: agency
        ? {
            id: agency._id.toString(),
            name: agency.name,
            slug: agency.slug,
          }
        : undefined,
      thumbnail: image
        ? {
            url: image.thumbnail_url || image.url,
            alt: image.alt,
          }
        : undefined,
      score: result.score,
      created_at: result.created_at,
      updated_at: result.updated_at,
    };
  }

  /**
   * Truncate description to specified length
   */
  private truncateDescription(description: string, maxLength: number): string {
    if (!description || description.length <= maxLength) {
      return description || '';
    }
    return description.substring(0, maxLength).trim() + '...';
  }

  /**
   * Build filters applied object for response
   */
  private buildFiltersApplied(
    query: PropertySearchQueryDto
  ): PropertySearchResponseDto['filters_applied'] {
    const filters: PropertySearchResponseDto['filters_applied'] = {
      language: query.lang,
    };

    if (query.q) {
      filters.query = query.q;
    }

    if (query.transaction_type) {
      filters.transaction_type = query.transaction_type;
    }

    // Location filters
    if (
      query.canton_id ||
      query.canton_ids ||
      query.city_id ||
      query.city_ids ||
      query.postal_code ||
      query.postal_codes
    ) {
      filters.location = {};
      if (query.canton_id) {
        filters.location.cantons = [query.canton_id];
      } else if (query.canton_ids) {
        filters.location.cantons = query.canton_ids;
      }
      if (query.city_id) {
        filters.location.cities = [query.city_id];
      } else if (query.city_ids) {
        filters.location.cities = query.city_ids;
      }
      if (query.postal_code) {
        filters.location.postal_codes = [query.postal_code];
      } else if (query.postal_codes) {
        filters.location.postal_codes = query.postal_codes;
      }
    }

    // Price range
    if (query.price_min !== undefined || query.price_max !== undefined) {
      filters.price_range = {};
      if (query.price_min !== undefined) {
        filters.price_range.min = query.price_min;
      }
      if (query.price_max !== undefined) {
        filters.price_range.max = query.price_max;
      }
    }

    // Size filters
    if (
      query.rooms_min !== undefined ||
      query.rooms_max !== undefined ||
      query.surface_min !== undefined ||
      query.surface_max !== undefined
    ) {
      filters.size = {};
      if (query.rooms_min !== undefined) filters.size.rooms_min = query.rooms_min;
      if (query.rooms_max !== undefined) filters.size.rooms_max = query.rooms_max;
      if (query.surface_min !== undefined) filters.size.surface_min = query.surface_min;
      if (query.surface_max !== undefined) filters.size.surface_max = query.surface_max;
    }

    // Category filters
    if (query.category_id) {
      filters.category_ids = [query.category_id];
    } else if (query.category_ids) {
      filters.category_ids = query.category_ids;
    }

    // Amenity filters
    if (query.amenities && query.amenities.length > 0) {
      filters.amenity_ids = query.amenities;
    }

    // Agency filter
    if (query.agency_id) {
      filters.agency_id = query.agency_id;
    }

    return filters;
  }

  /**
   * Build search filter options from query
   */
  private buildSearchFilters(query: PropertySearchQueryDto): SearchFilterOptions {
    return {
      search: query.q,
      lang: query.lang,
      canton_id: query.canton_id,
      canton_ids: query.canton_ids,
      city_id: query.city_id,
      city_ids: query.city_ids,
      postal_code: query.postal_code,
      postal_codes: query.postal_codes,
      category_id: query.category_id,
      category_ids: query.category_ids,
      transaction_type: query.transaction_type,
      agency_id: query.agency_id,
      price_min: query.price_min,
      price_max: query.price_max,
      rooms_min: query.rooms_min,
      rooms_max: query.rooms_max,
      surface_min: query.surface_min,
      surface_max: query.surface_max,
      amenities: query.amenities,
    };
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Search properties with offset pagination
   */
  async searchProperties(query: PropertySearchQueryDto): Promise<PropertySearchResponseDto> {
    const filters = this.buildSearchFilters(query);

    const pagination: SearchPaginationOptions = {
      page: query.page || 1,
      limit: Math.min(query.limit || 20, 100), // Max 100 per page
      sort: query.sort || 'date_newest',
    };

    logger.info('Property search request', {
      query: query.q,
      lang: query.lang,
      filters: Object.keys(filters).filter(
        (k) => filters[k as keyof SearchFilterOptions] !== undefined
      ),
      pagination,
    });

    const { results, total } = await searchRepository.searchProperties(filters, pagination);

    // Calculate pagination meta
    const totalPages = Math.ceil(total / pagination.limit);

    return {
      data: results.map((r) => this.transformToSearchResult(r, query.lang)),
      pagination: {
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
        hasNextPage: pagination.page < totalPages,
        hasPrevPage: pagination.page > 1,
      },
      filters_applied: this.buildFiltersApplied(query),
    };
  }

  /**
   * Search properties with cursor-based pagination
   */
  async searchPropertiesWithCursor(
    query: PropertySearchQueryDto
  ): Promise<PropertySearchCursorResponseDto> {
    const filters = this.buildSearchFilters(query);

    const { results, hasNext, hasPrev, nextCursor, prevCursor } =
      await searchRepository.searchPropertiesWithCursor(filters, {
        cursor: query.cursor,
        cursor_direction: query.cursor_direction || 'next',
        limit: Math.min(query.limit || 20, 100),
        sort: query.sort || 'date_newest',
      });

    return {
      data: results.map((r) => this.transformToSearchResult(r, query.lang)),
      cursor: {
        next: nextCursor,
        prev: prevCursor,
        has_next: hasNext,
        has_prev: hasPrev,
      },
      filters_applied: this.buildFiltersApplied(query),
    };
  }

  /**
   * Search locations (cantons and cities)
   */
  async searchLocations(query: LocationSearchQueryDto): Promise<LocationSearchResponseDto> {
    if (!query.q || query.q.trim().length === 0) {
      throw BadRequestError('Search query is required');
    }

    const lang = query.lang || 'en';
    const limit = Math.min(query.limit || 10, 50);

    const { cantons, cities } = await searchRepository.searchLocations(
      query.q.trim(),
      lang,
      limit,
      query.include_cantons !== false,
      query.include_cities !== false
    );

    return {
      cantons,
      cities,
      total: cantons.length + cities.length,
    };
  }

  /**
   * Unified search across properties and locations
   */
  async unifiedSearch(query: UnifiedSearchQueryDto): Promise<UnifiedSearchResponseDto> {
    if (!query.q || query.q.trim().length === 0) {
      throw BadRequestError('Search query is required');
    }

    const lang = query.lang || 'en';
    const limit = query.limit || 5;

    // Search in parallel
    const [propertyResults, locationResults, suggestions] = await Promise.all([
      searchRepository.searchProperties(
        { search: query.q, lang },
        { page: 1, limit, sort: 'relevance' }
      ),
      searchRepository.searchLocations(query.q, lang, limit),
      searchRepository.getSearchSuggestions(query.q, lang, limit),
    ]);

    return {
      properties: {
        data: propertyResults.results.map((r) => this.transformToSearchResult(r, lang)),
        total: propertyResults.total,
      },
      locations: {
        cantons: locationResults.cantons,
        cities: locationResults.cities,
        total: locationResults.cantons.length + locationResults.cities.length,
      },
      suggestions: suggestions.suggestions,
    };
  }

  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(
    query: SearchSuggestionsQueryDto
  ): Promise<SearchSuggestionsResponseDto> {
    if (!query.q || query.q.trim().length < 2) {
      return { suggestions: [], locations: [] };
    }

    const lang = query.lang || 'en';
    const limit = Math.min(query.limit || 5, 20);

    const result = await searchRepository.getSearchSuggestions(query.q.trim(), lang, limit);

    return result;
  }

  /**
   * Invalidate search cache
   * Call this when properties or translations are updated
   */
  async invalidateCache(): Promise<void> {
    await searchRepository.invalidateCache();
    logger.info('Search cache invalidated');
  }

  /**
   * Get property count facets for filtering UI
   */
  async getSearchFacets(
    query: PropertySearchQueryDto,
    facetFields: string[]
  ): Promise<Record<string, { _id: string; count: number }[]>> {
    const filters = this.buildSearchFilters(query);
    const facets: Record<string, { _id: string; count: number }[]> = {};

    for (const field of facetFields) {
      const validFields = ['category_id', 'canton_id', 'city_id', 'transaction_type'];
      if (validFields.includes(field)) {
        facets[field] = await searchRepository.getPropertyCountByFilters(filters, field);
      }
    }

    return facets;
  }
}

// Export singleton instance
export const searchService = new SearchService();
