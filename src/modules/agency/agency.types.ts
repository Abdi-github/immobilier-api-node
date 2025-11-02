import { IMultilingualText, SupportedLanguage } from '../location/index.js';
import { PaginationMeta } from '../../shared/utils/response.helper.js';
import { AgencyStatus } from './agency.model.js';

export type { SupportedLanguage, PaginationMeta };

/**
 * Agency query parameters for listing/filtering
 */
export interface AgencyQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  canton_id?: string;
  city_id?: string;
  status?: AgencyStatus;
  is_verified?: boolean;
  include_inactive?: boolean;
  lang?: SupportedLanguage;
}

/**
 * DTO for creating a new agency
 */
export interface AgencyCreateDto {
  name: string;
  slug?: string;
  description?: IMultilingualText;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  address: string;
  city_id: string;
  canton_id: string;
  postal_code?: string;
  status?: AgencyStatus;
  is_verified?: boolean;
}

/**
 * DTO for updating an existing agency
 */
export interface AgencyUpdateDto {
  name?: string;
  slug?: string;
  description?: IMultilingualText;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  address?: string;
  city_id?: string;
  canton_id?: string;
  postal_code?: string;
  status?: AgencyStatus;
  is_verified?: boolean;
}

/**
 * Agency response DTO (single agency)
 */
export interface AgencyResponseDto {
  id: string;
  name: string;
  slug: string;
  description?: IMultilingualText | string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
  address: string;
  city_id: string;
  canton_id: string;
  postal_code?: string;
  status: AgencyStatus;
  is_verified: boolean;
  verification_date?: Date;
  total_properties: number;
  created_at: Date;
  updated_at: Date;
  // Populated fields
  city?: {
    id: string;
    name: IMultilingualText | string;
  };
  canton?: {
    id: string;
    name: IMultilingualText | string;
    code: string;
  };
}

/**
 * Agency list response DTO
 */
export interface AgencyListResponseDto {
  data: AgencyResponseDto[];
  meta: PaginationMeta;
}

/**
 * Agency with populated location data (internal use)
 */
export interface AgencyWithLocation {
  _id: string;
  name: string;
  slug: string;
  description?: IMultilingualText;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  contact_person?: string;
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
  status: AgencyStatus;
  is_verified: boolean;
  verification_date?: Date;
  total_properties: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Repository filter options
 */
export interface AgencyFilterOptions {
  canton_id?: string;
  city_id?: string;
  status?: AgencyStatus;
  is_verified?: boolean;
  search?: string;
}

/**
 * Repository pagination options
 */
export interface AgencyPaginationOptions {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

/**
 * Repository find result
 */
export interface AgencyFindResult {
  agencies: AgencyWithLocation[];
  total: number;
}

/**
 * Valid sort fields for agencies
 */
export const AGENCY_SORT_FIELDS = [
  'name',
  'slug',
  'status',
  'is_verified',
  'total_properties',
  'created_at',
  'updated_at',
] as const;

export type AgencySortField = (typeof AGENCY_SORT_FIELDS)[number];
