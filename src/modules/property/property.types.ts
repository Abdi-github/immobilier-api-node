import { SupportedLanguage, IMultilingualText } from '../location/index.js';
import { PaginationMeta } from '../../shared/utils/response.helper.js';
import { PropertyStatus, TransactionType } from './property.model.js';

export type { SupportedLanguage, IMultilingualText, PaginationMeta };

/**
 * Property query parameters for listing/filtering
 */
export interface PropertyQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  lang?: SupportedLanguage;

  // Location filters
  canton_id?: string;
  city_id?: string;
  postal_code?: string;

  // Property filters
  category_id?: string; // Supports comma-separated IDs for multi-select
  section?: 'residential' | 'commercial';
  transaction_type?: TransactionType;
  status?: PropertyStatus;
  agency_id?: string;
  owner_id?: string;

  // Price filters
  price_min?: number;
  price_max?: number;

  // Size filters
  rooms_min?: number;
  rooms_max?: number;
  surface_min?: number;
  surface_max?: number;

  // Amenities filter
  amenities?: string[];

  // Admin-only filters
  include_unpublished?: boolean;

  // Cursor-based pagination (for property module as per requirements)
  cursor?: string;
  cursor_direction?: 'next' | 'prev';
}

/**
 * DTO for creating a new property
 */
export interface PropertyCreateDto {
  external_id?: string; // Auto-generated if not provided
  external_url?: string;
  source_language: SupportedLanguage;
  category_id: string;
  agency_id?: string;
  owner_id?: string;
  transaction_type: TransactionType;
  price: number;
  currency?: 'CHF';
  additional_costs?: number;
  rooms?: number;
  surface?: number;
  address: string;
  city_id: string;
  canton_id: string;
  postal_code?: string;
  proximity?: Record<string, string>;
  amenities?: string[];
  status?: PropertyStatus;
}

/**
 * DTO for updating an existing property
 */
export interface PropertyUpdateDto {
  external_id?: string;
  external_url?: string;
  source_language?: SupportedLanguage;
  category_id?: string;
  agency_id?: string;
  owner_id?: string;
  transaction_type?: TransactionType;
  price?: number;
  currency?: 'CHF';
  additional_costs?: number;
  rooms?: number;
  surface?: number;
  address?: string;
  city_id?: string;
  canton_id?: string;
  postal_code?: string;
  proximity?: Record<string, string>;
  amenities?: string[];
  status?: PropertyStatus;
}

/**
 * Property response DTO (single property)
 */
export interface PropertyResponseDto {
  id: string;
  external_id: string;
  external_url?: string;
  source_language: SupportedLanguage;
  transaction_type: TransactionType;
  price: number;
  currency: 'CHF';
  additional_costs?: number;
  rooms?: number;
  surface?: number;
  address: string;
  postal_code?: string;
  proximity?: Record<string, string>;
  status: PropertyStatus;
  published_at?: Date;
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;

  // Convenience fields for title/description (from translation)
  title?: string;
  description?: string;

  // Populated fields (IDs if not populated, objects if populated)
  category_id: string;
  agency_id?: string;
  owner_id?: string;
  city_id: string;
  canton_id: string;
  amenities: string[];

  // Populated objects
  category?: {
    id: string;
    name: IMultilingualText | string;
    section: string;
  };
  agency?: {
    id: string;
    name: string;
    slug: string;
  };
  city?: {
    id: string;
    name: IMultilingualText | string;
  };
  canton?: {
    id: string;
    name: IMultilingualText | string;
    code: string;
  };
  amenity_list?: Array<{
    id: string;
    name: IMultilingualText | string;
    icon?: string;
  }>;

  // Images
  images?: PropertyImageResponseDto[];

  // Translation metadata (source and quality)
  translation?: {
    title?: string;
    description?: string;
    source: 'original' | 'deepl' | 'libretranslate' | 'human';
    quality_score?: number;
  };
}

/**
 * Property image response DTO
 */
export interface PropertyImageResponseDto {
  id: string;
  url: string;
  secure_url?: string;
  thumbnail_url?: string;
  thumbnail_secure_url?: string;
  alt_text?: string;
  caption?: string;
  sort_order: number;
  is_primary: boolean;

  // Cloudinary metadata (optional in response)
  public_id?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;

  // Source info
  source?: 'cloudinary' | 'external' | 'local';
  original_filename?: string;
}

/**
 * Property list response DTO (offset pagination)
 */
export interface PropertyListResponseDto {
  data: PropertyResponseDto[];
  meta: PaginationMeta;
}

/**
 * Property list response DTO (cursor pagination)
 */
export interface PropertyCursorListResponseDto {
  data: PropertyResponseDto[];
  meta: {
    total: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
    next_cursor?: string;
    prev_cursor?: string;
  };
}

/**
 * Property with populated data (internal use)
 */
export interface PropertyWithPopulated {
  _id: string;
  external_id: string;
  external_url?: string;
  source_language: SupportedLanguage;
  category_id: {
    _id: string;
    name: IMultilingualText;
    section: string;
  };
  agency_id?: {
    _id: string;
    name: string;
    slug: string;
  };
  owner_id?: string;
  transaction_type: TransactionType;
  price: number;
  currency: 'CHF';
  additional_costs?: number;
  rooms?: number;
  surface?: number;
  address: string;
  city_id: {
    _id: string;
    name: IMultilingualText;
  };
  canton_id: {
    _id: string;
    name: IMultilingualText;
    code: string;
  };
  postal_code?: string;
  proximity?: Record<string, string>;
  amenities: Array<{
    _id: string;
    name: IMultilingualText;
    icon?: string;
  }>;
  status: PropertyStatus;
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  published_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository filter options
 */
export interface PropertyFilterOptions {
  canton_id?: string;
  city_id?: string;
  postal_code?: string;
  category_id?: string;
  section?: 'residential' | 'commercial';
  transaction_type?: TransactionType;
  status?: PropertyStatus;
  agency_id?: string;
  owner_id?: string;
  price_min?: number;
  price_max?: number;
  rooms_min?: number;
  rooms_max?: number;
  surface_min?: number;
  surface_max?: number;
  amenities?: string[];
  search?: string;
}

/**
 * Repository pagination options (offset-based)
 */
export interface PropertyPaginationOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

/**
 * Repository pagination options (cursor-based)
 */
export interface PropertyCursorPaginationOptions {
  limit: number;
  cursor?: string;
  direction: 'next' | 'prev';
}

/**
 * Repository find result (offset pagination)
 */
export interface PropertyFindResult {
  properties: PropertyWithPopulated[];
  total: number;
}

/**
 * Repository find result (cursor pagination)
 */
export interface PropertyCursorFindResult {
  properties: PropertyWithPopulated[];
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

/**
 * Property approval DTO
 */
export interface PropertyApprovalDto {
  reviewed_by: string;
}

/**
 * Property rejection DTO
 */
export interface PropertyRejectionDto {
  reviewed_by: string;
  rejection_reason: string;
}

/**
 * Property status update DTO
 */
export interface PropertyStatusUpdateDto {
  status: PropertyStatus;
  reviewed_by?: string;
  rejection_reason?: string;
}

/**
 * Property statistics response
 */
export interface PropertyStatisticsDto {
  total: number;
  by_status: Record<PropertyStatus, number>;
  by_transaction_type: Record<TransactionType, number>;
  by_canton: Array<{
    canton_id: string;
    canton_name: string;
    canton_code: string;
    count: number;
  }>;
  average_price: {
    buy: number | null;
    rent: number | null;
  };
}

/**
 * Property image create DTO
 */
export interface PropertyImageCreateDto {
  property_id: string;
  url: string;
  secure_url?: string;
  thumbnail_url?: string;
  thumbnail_secure_url?: string;
  alt_text?: string;
  caption?: string;
  sort_order?: number;
  is_primary?: boolean;

  // Cloudinary specific fields
  public_id?: string;
  version?: number;
  signature?: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
  resource_type?: string;

  // Source tracking
  source?: 'cloudinary' | 'external' | 'local';
  original_filename?: string;
  external_url?: string;
}

/**
 * Property image update DTO
 */
export interface PropertyImageUpdateDto {
  url?: string;
  secure_url?: string;
  thumbnail_url?: string;
  thumbnail_secure_url?: string;
  alt_text?: string;
  caption?: string;
  sort_order?: number;
  is_primary?: boolean;
}

/**
 * Property image upload DTO (for file uploads)
 */
export interface PropertyImageUploadDto {
  property_id: string;
  alt_text?: string;
  caption?: string;
  sort_order?: number;
  is_primary?: boolean;
}

/**
 * Property image upload result DTO
 */
export interface PropertyImageUploadResultDto {
  id: string;
  property_id: string;
  url: string;
  secure_url: string;
  thumbnail_url?: string;
  thumbnail_secure_url?: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  alt_text?: string;
  caption?: string;
  sort_order: number;
  is_primary: boolean;
  source: 'cloudinary' | 'external' | 'local';
  original_filename?: string;
  created_at: Date;
}

/**
 * Batch image upload result DTO
 */
export interface BatchImageUploadResultDto {
  successful: PropertyImageUploadResultDto[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

/**
 * Valid sort fields for properties
 */
export const PROPERTY_SORT_FIELDS = [
  'price',
  'rooms',
  'surface',
  'published_at',
  'created_at',
  'updated_at',
] as const;

export type PropertySortField = (typeof PROPERTY_SORT_FIELDS)[number];
