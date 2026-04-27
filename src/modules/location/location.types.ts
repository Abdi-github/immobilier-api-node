import mongoose from 'mongoose';
import { IMultilingualText, SupportedLanguage } from './canton.model.js';

/**
 * Canton Query DTO
 */
export interface CantonQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  is_active?: boolean;
  code?: string;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * City Query DTO
 */
export interface CityQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  is_active?: boolean;
  canton_id?: string;
  postal_code?: string;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * Canton Create DTO (Admin only)
 */
export interface CantonCreateDto {
  code: string;
  name: IMultilingualText;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

/**
 * Canton Update DTO (Admin only)
 */
export interface CantonUpdateDto {
  code?: string;
  name?: IMultilingualText;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

/**
 * City Create DTO (Admin only)
 */
export interface CityCreateDto {
  canton_id: string;
  name: string | IMultilingualText;
  postal_code: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

/**
 * City Update DTO (Admin only)
 */
export interface CityUpdateDto {
  canton_id?: string;
  name?: string | IMultilingualText;
  postal_code?: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  is_active?: boolean;
}

/**
 * Canton Response DTO
 */
export interface CantonResponseDto {
  id: string;
  code: string;
  name: string | IMultilingualText;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * City Response DTO
 */
export interface CityResponseDto {
  id: string;
  canton_id: string;
  canton?: CantonResponseDto;
  name: string | IMultilingualText;
  postal_code: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
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
 * Canton List Response DTO
 */
export interface CantonListResponseDto {
  data: CantonResponseDto[];
  pagination: PaginationDto;
}

/**
 * City List Response DTO
 */
export interface CityListResponseDto {
  data: CityResponseDto[];
  pagination: PaginationDto;
}

/**
 * Popular City Response DTO (for homepage tiles)
 */
export interface PopularCityResponseDto {
  id: string;
  name: string | IMultilingualText;
  canton_code: string;
  canton_name: string | IMultilingualText;
  image_url?: string;
  rent_count: number;
  buy_count: number;
  total_count: number;
}

/**
 * City with populated canton
 */
export interface CityWithCanton {
  _id: mongoose.Types.ObjectId;
  canton_id:
    | mongoose.Types.ObjectId
    | {
        _id: mongoose.Types.ObjectId;
        code: string;
        name: IMultilingualText;
          latitude?: number;
          longitude?: number;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      };
  name: string | IMultilingualText;
  postal_code: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
