import { IMultilingualText, SupportedLanguage } from '../location/canton.model.js';

import { AmenityGroup } from './amenity.model.js';

/**
 * Amenity Query DTO
 */
export interface AmenityQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  is_active?: boolean;
  group?: AmenityGroup;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * Amenity Create DTO (Admin only)
 */
export interface AmenityCreateDto {
  name: IMultilingualText;
  group: AmenityGroup;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Amenity Update DTO (Admin only)
 */
export interface AmenityUpdateDto {
  name?: IMultilingualText;
  group?: AmenityGroup;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Amenity Response DTO
 */
export interface AmenityResponseDto {
  id: string;
  name: string | IMultilingualText;
  group: AmenityGroup;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Pagination Response DTO
 * Matches the shared PaginationMeta interface
 */
export interface PaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Amenity List Response DTO
 */
export interface AmenityListResponseDto {
  data: AmenityResponseDto[];
  pagination: PaginationDto;
}
