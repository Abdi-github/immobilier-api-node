import { IMultilingualText, SupportedLanguage } from '../location/canton.model.js';
import { CategorySection } from './category.model.js';

/**
 * Category Query DTO
 */
export interface CategoryQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  is_active?: boolean;
  section?: CategorySection;
  search?: string;
  lang?: SupportedLanguage;
}

/**
 * Category Create DTO (Admin only)
 */
export interface CategoryCreateDto {
  section: CategorySection;
  slug: string;
  name: IMultilingualText;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Category Update DTO (Admin only)
 */
export interface CategoryUpdateDto {
  section?: CategorySection;
  slug?: string;
  name?: IMultilingualText;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

/**
 * Category Response DTO
 */
export interface CategoryResponseDto {
  id: string;
  section: CategorySection;
  slug: string;
  name: string | IMultilingualText;
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
 * Category List Response DTO
 */
export interface CategoryListResponseDto {
  data: CategoryResponseDto[];
  pagination: PaginationDto;
}
