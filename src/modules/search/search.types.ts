import { SupportedLanguage } from '../location/index.js';
import { PaginationMeta } from '../../shared/utils/response.helper.js';
import { TransactionType, PropertyStatus } from '../property/property.model.js';

export type { SupportedLanguage, PaginationMeta };

/**
 * Search sort options
 */
export type SearchSortOption =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'date_newest'
  | 'date_oldest'
  | 'rooms_asc'
  | 'rooms_desc'
  | 'surface_asc'
  | 'surface_desc';

/**
 * Property search query parameters
 */
export interface PropertySearchQueryDto {
  // Text search
  q?: string; // Main search query (searches in title, description, address)

  // Pagination
  page?: number;
  limit?: number;

  // Language (CRITICAL: only returns APPROVED translations in this language)
  lang: SupportedLanguage;

  // Sorting
  sort?: SearchSortOption;

  // Location filters
  canton_id?: string;
  canton_ids?: string[]; // Multiple cantons
  city_id?: string;
  city_ids?: string[]; // Multiple cities
  postal_code?: string;
  postal_codes?: string[]; // Multiple postal codes

  // Property filters
  category_id?: string;
  category_ids?: string[]; // Multiple categories
  transaction_type?: TransactionType;

  // Price filters
  price_min?: number;
  price_max?: number;

  // Size filters
  rooms_min?: number;
  rooms_max?: number;
  surface_min?: number;
  surface_max?: number;

  // Amenities filter (all specified amenities must be present)
  amenities?: string[];

  // Agency filter
  agency_id?: string;

  // Cursor-based pagination
  cursor?: string;
  cursor_direction?: 'next' | 'prev';
}

/**
 * Location search query parameters
 */
export interface LocationSearchQueryDto {
  q: string; // Search query
  lang?: SupportedLanguage;
  limit?: number;
  include_cantons?: boolean;
  include_cities?: boolean;
}

/**
 * Unified search query parameters (searches across properties, locations)
 */
export interface UnifiedSearchQueryDto {
  q: string; // Search query
  lang?: SupportedLanguage;
  limit?: number;
}

/**
 * Search filter options for repository
 */
export interface SearchFilterOptions {
  // Text search
  search?: string;

  // Language
  lang: SupportedLanguage;

  // Location filters
  canton_id?: string;
  canton_ids?: string[];
  city_id?: string;
  city_ids?: string[];
  postal_code?: string;
  postal_codes?: string[];

  // Property filters
  category_id?: string;
  category_ids?: string[];
  transaction_type?: TransactionType;
  agency_id?: string;

  // Price range
  price_min?: number;
  price_max?: number;

  // Size range
  rooms_min?: number;
  rooms_max?: number;
  surface_min?: number;
  surface_max?: number;

  // Amenities
  amenities?: string[];
}

/**
 * Search pagination options
 */
export interface SearchPaginationOptions {
  page: number;
  limit: number;
  sort: SearchSortOption;
}

/**
 * Cursor pagination options
 */
export interface SearchCursorPaginationOptions {
  cursor?: string;
  cursor_direction: 'next' | 'prev';
  limit: number;
  sort: SearchSortOption;
}

/**
 * Property search result item
 */
export interface PropertySearchResultDto {
  id: string;
  external_id: string;
  title: string; // Localized
  description: string; // Localized (truncated)
  transaction_type: TransactionType;
  price: number;
  currency: string;
  additional_costs?: number;
  rooms?: number;
  surface?: number;
  address: string;
  postal_code?: string;
  status: PropertyStatus;
  published_at?: Date;

  // Populated references (localized names)
  category: {
    id: string;
    name: string;
    section: string;
  };
  city: {
    id: string;
    name: string;
  };
  canton: {
    id: string;
    name: string;
    code: string;
  };
  agency?: {
    id: string;
    name: string;
    slug: string;
  };

  // Primary image (thumbnail)
  thumbnail?: {
    url: string;
    alt?: string;
  };

  // Relevance score (when text search is used)
  score?: number;

  created_at: Date;
  updated_at: Date;
}

/**
 * Property search response
 */
export interface PropertySearchResponseDto {
  data: PropertySearchResultDto[];
  pagination: PaginationMeta;
  filters_applied: {
    query?: string;
    language: SupportedLanguage;
    transaction_type?: TransactionType;
    location?: {
      cantons?: string[];
      cities?: string[];
      postal_codes?: string[];
    };
    price_range?: {
      min?: number;
      max?: number;
    };
    size?: {
      rooms_min?: number;
      rooms_max?: number;
      surface_min?: number;
      surface_max?: number;
    };
    category_ids?: string[];
    amenity_ids?: string[];
    agency_id?: string;
  };
}

/**
 * Cursor-based search response
 */
export interface PropertySearchCursorResponseDto {
  data: PropertySearchResultDto[];
  cursor: {
    next?: string;
    prev?: string;
    has_next: boolean;
    has_prev: boolean;
  };
  filters_applied: PropertySearchResponseDto['filters_applied'];
}

/**
 * Location search result item
 */
export interface LocationSearchResultDto {
  id: string;
  type: 'canton' | 'city';
  name: string; // Localized
  code?: string; // For cantons
  postal_code?: string; // For cities
  canton?: {
    id: string;
    name: string;
    code: string;
  }; // For cities
}

/**
 * Location search response
 */
export interface LocationSearchResponseDto {
  cantons: LocationSearchResultDto[];
  cities: LocationSearchResultDto[];
  total: number;
}

/**
 * Unified search response
 */
export interface UnifiedSearchResponseDto {
  properties: {
    data: PropertySearchResultDto[];
    total: number;
  };
  locations: LocationSearchResponseDto;
  suggestions: string[];
}

/**
 * Search suggestions query
 */
export interface SearchSuggestionsQueryDto {
  q: string;
  lang?: SupportedLanguage;
  limit?: number;
}

/**
 * Search suggestions response
 */
export interface SearchSuggestionsResponseDto {
  suggestions: string[];
  locations: {
    id: string;
    type: 'canton' | 'city';
    name: string;
  }[];
}

/**
 * Search analytics data
 */
export interface SearchAnalyticsDto {
  query: string;
  language: SupportedLanguage;
  results_count: number;
  filters: Record<string, unknown>;
  user_id?: string;
  timestamp: Date;
}

/**
 * Popular searches response
 */
export interface PopularSearchesResponseDto {
  searches: {
    query: string;
    count: number;
  }[];
}

/**
 * Search cache key generator
 */
export interface SearchCacheKey {
  type: 'property_search' | 'location_search' | 'suggestions';
  hash: string;
}

/**
 * Internal aggregation pipeline result
 */
export interface PropertyAggregationResult {
  _id: string;
  external_id: string;
  transaction_type: TransactionType;
  price: number;
  currency: string;
  additional_costs?: number;
  rooms?: number;
  surface?: number;
  address: string;
  postal_code?: string;
  status: PropertyStatus;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;

  // Translation data
  title: string;
  description: string;

  // Populated fields
  category: {
    _id: string;
    name: { en?: string; fr?: string; de?: string; it?: string };
    section: string;
  }[];
  city: {
    _id: string;
    name: { en?: string; fr?: string; de?: string; it?: string } | string;
  }[];
  canton: {
    _id: string;
    name: { en?: string; fr?: string; de?: string; it?: string };
    code: string;
  }[];
  agency?: {
    _id: string;
    name: string;
    slug: string;
  }[];
  primary_image?: {
    url: string;
    thumbnail_url?: string;
    alt?: string;
  }[];

  // Text search score
  score?: number;
}
