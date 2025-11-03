import type { SupportedLanguage } from '../location/index.js';
import type { PaginationMeta } from '../../shared/utils/response.helper.js';
import type { TranslationSource, TranslationApprovalStatus } from './property-translation.model.js';

export type { SupportedLanguage, PaginationMeta, TranslationSource, TranslationApprovalStatus };

/**
 * Property Translation Query DTO
 */
export interface PropertyTranslationQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  lang?: SupportedLanguage;

  // Filters
  property_id?: string;
  language?: SupportedLanguage;
  source?: TranslationSource;
  approval_status?: TranslationApprovalStatus;
  approved_by?: string;

  // Search
  search?: string;
}

/**
 * DTO for creating a new property translation
 */
export interface PropertyTranslationCreateDto {
  property_id: string;
  language: SupportedLanguage;
  title: string;
  description: string;
  source?: TranslationSource;
  quality_score?: number;
}

/**
 * DTO for updating an existing property translation
 */
export interface PropertyTranslationUpdateDto {
  title?: string;
  description?: string;
  source?: TranslationSource;
  quality_score?: number;
}

/**
 * DTO for approving a translation
 */
export interface PropertyTranslationApproveDto {
  approved_by: string;
}

/**
 * DTO for rejecting a translation
 */
export interface PropertyTranslationRejectDto {
  rejection_reason: string;
  rejected_by: string;
}

/**
 * DTO for bulk translation request (DeepL)
 */
export interface BulkTranslateRequestDto {
  property_id: string;
  target_languages?: SupportedLanguage[];
}

/**
 * Property Translation Response DTO (single translation)
 */
export interface PropertyTranslationResponseDto {
  id: string;
  property_id: string;
  language: SupportedLanguage;
  title: string;
  description: string;
  source: TranslationSource;
  quality_score?: number;
  approval_status: TranslationApprovalStatus;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;

  // Populated fields
  property?: {
    id: string;
    external_id: string;
    source_language: SupportedLanguage;
  };
  approver?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

/**
 * Property Translation List Response DTO
 */
export interface PropertyTranslationListResponseDto {
  data: PropertyTranslationResponseDto[];
  pagination: PaginationMeta;
}

/**
 * Filter options for repository
 */
export interface PropertyTranslationFilterOptions {
  property_id?: string;
  language?: SupportedLanguage;
  source?: TranslationSource;
  approval_status?: TranslationApprovalStatus;
  approved_by?: string;
  search?: string;
}

/**
 * Pagination options for repository
 */
export interface PropertyTranslationPaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Result from find operations
 */
export interface PropertyTranslationFindResult {
  translations: PropertyTranslationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Translation status summary for a property
 */
export interface TranslationStatusSummary {
  property_id: string;
  source_language: SupportedLanguage;
  translations: {
    language: SupportedLanguage;
    status: TranslationApprovalStatus;
    source: TranslationSource;
  }[];
  missing_languages: SupportedLanguage[];
  all_approved: boolean;
}
