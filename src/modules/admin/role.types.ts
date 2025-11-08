import { IMultilingualText } from './permission.model.js';
import { PermissionResponseDto } from './permission.types.js';

/**
 * Role query parameters
 */
export interface RoleQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  is_system?: boolean;
  is_active?: boolean;
  include_permissions?: boolean;
}

/**
 * Role create DTO
 */
export interface RoleCreateDto {
  name: string;
  display_name: IMultilingualText;
  description: IMultilingualText;
  permissions?: string[]; // Permission IDs
  is_system?: boolean;
  is_active?: boolean;
}

/**
 * Role update DTO
 */
export interface RoleUpdateDto {
  name?: string;
  display_name?: Partial<IMultilingualText>;
  description?: Partial<IMultilingualText>;
  permissions?: string[]; // Permission IDs (replace all)
  is_system?: boolean;
  is_active?: boolean;
}

/**
 * Role response DTO (for API responses)
 */
export interface RoleResponseDto {
  id: string;
  name: string;
  display_name: IMultilingualText;
  description: IMultilingualText;
  permissions: string[] | PermissionResponseDto[];
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Localized role response DTO (single language)
 */
export interface RoleLocalizedResponseDto {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[] | PermissionResponseDto[];
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Role list response DTO
 */
export interface RoleListResponseDto {
  data: RoleResponseDto[] | RoleLocalizedResponseDto[];
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
 * Assign permissions DTO
 */
export interface AssignPermissionsDto {
  permissions: string[]; // Permission IDs to assign
}

/**
 * Revoke permissions DTO
 */
export interface RevokePermissionsDto {
  permissions: string[]; // Permission IDs to revoke
}

/**
 * Role with populated permissions
 */
export interface RoleWithPermissions {
  id: string;
  name: string;
  display_name: IMultilingualText;
  description: IMultilingualText;
  permissions: PermissionResponseDto[];
  is_system: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
