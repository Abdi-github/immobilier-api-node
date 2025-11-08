import { IMultilingualText } from './permission.model.js';

/**
 * Valid permission actions
 */
export const PERMISSION_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'approve',
  'reject',
  'publish',
  'archive',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/**
 * Permission query parameters
 */
export interface PermissionQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  resource?: string;
  action?: PermissionAction;
  is_active?: boolean;
}

/**
 * Permission create DTO
 */
export interface PermissionCreateDto {
  name: string;
  display_name: IMultilingualText;
  description: IMultilingualText;
  resource: string;
  action: PermissionAction;
  is_active?: boolean;
}

/**
 * Permission update DTO
 */
export interface PermissionUpdateDto {
  name?: string;
  display_name?: Partial<IMultilingualText>;
  description?: Partial<IMultilingualText>;
  resource?: string;
  action?: PermissionAction;
  is_active?: boolean;
}

/**
 * Permission response DTO (for API responses)
 */
export interface PermissionResponseDto {
  id: string;
  name: string;
  display_name: IMultilingualText;
  description: IMultilingualText;
  resource: string;
  action: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Localized permission response DTO (single language)
 */
export interface PermissionLocalizedResponseDto {
  id: string;
  name: string;
  display_name: string;
  description: string;
  resource: string;
  action: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Permission list response DTO
 */
export interface PermissionListResponseDto {
  data: PermissionResponseDto[] | PermissionLocalizedResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Permission filter options
 */
export interface PermissionFilterOptions {
  resource?: string;
  action?: PermissionAction;
  is_active?: boolean;
  search?: string;
}

/**
 * Grouped permissions by resource
 */
export interface PermissionsByResource {
  resource: string;
  permissions: PermissionResponseDto[] | PermissionLocalizedResponseDto[];
}
