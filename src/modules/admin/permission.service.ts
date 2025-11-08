import { IPermission, IMultilingualText } from './permission.model.js';
import { permissionRepository, PermissionRepository } from './permission.repository.js';
import {
  PermissionQueryDto,
  PermissionCreateDto,
  PermissionUpdateDto,
  PermissionResponseDto,
  PermissionLocalizedResponseDto,
  PermissionListResponseDto,
  PermissionsByResource,
} from './permission.types.js';
import { AppError } from '../../shared/errors/AppError.js';

/**
 * Permission Service
 * Handles business logic for permission management
 */
export class PermissionService {
  constructor(private repository: PermissionRepository = permissionRepository) {}

  /**
   * Get all permissions with pagination
   */
  async findAll(query: PermissionQueryDto, lang?: string): Promise<PermissionListResponseDto> {
    //   page: query.page,
    //   resource: query.resource,
    //   language: lang
    // });
    
    const { page = 1, limit = 20 } = query;
    const { permissions, total } = await this.repository.findAll(query);

    const totalPages = Math.ceil(total / limit);

    return {
      data: lang
        ? permissions.map((p) => this.toLocalizedResponseDto(p, lang))
        : permissions.map((p) => this.toResponseDto(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Get permission by ID
   */
  async findById(
    id: string,
    lang?: string
  ): Promise<PermissionResponseDto | PermissionLocalizedResponseDto> {
    const permission = await this.repository.findById(id);
    if (!permission) {
      throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
    }
    return lang ? this.toLocalizedResponseDto(permission, lang) : this.toResponseDto(permission);
  }

  /**
   * Get permission by name (code)
   */
  async findByName(
    name: string,
    lang?: string
  ): Promise<PermissionResponseDto | PermissionLocalizedResponseDto> {
    const permission = await this.repository.findByName(name);
    if (!permission) {
      throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
    }
    return lang ? this.toLocalizedResponseDto(permission, lang) : this.toResponseDto(permission);
  }

  /**
   * Get permissions by resource
   */
  async findByResource(
    resource: string,
    lang?: string
  ): Promise<PermissionResponseDto[] | PermissionLocalizedResponseDto[]> {
    const permissions = await this.repository.findByResource(resource);
    return lang
      ? permissions.map((p) => this.toLocalizedResponseDto(p, lang))
      : permissions.map((p) => this.toResponseDto(p));
  }

  /**
   * Get all unique resources
   */
  async getResources(): Promise<string[]> {
    return this.repository.getUniqueResources();
  }

  /**
   * Get permissions grouped by resource
   */
  async getGroupedByResource(lang?: string): Promise<PermissionsByResource[]> {
    const grouped = await this.repository.getGroupedByResource();
    return Object.entries(grouped).map(([resource, permissions]) => ({
      resource,
      permissions: lang
        ? permissions.map((p) => this.toLocalizedResponseDto(p, lang))
        : permissions.map((p) => this.toResponseDto(p)),
    }));
  }

  /**
   * Create a new permission
   */
  async create(data: PermissionCreateDto): Promise<PermissionResponseDto> {
    // Check if permission name already exists
    const exists = await this.repository.nameExists(data.name);
    if (exists) {
      throw new AppError(
        'Permission with this name already exists',
        409,
        'PERMISSION_ALREADY_EXISTS'
      );
    }

    // Validate name format (resource:action)
    if (!this.isValidPermissionName(data.name)) {
      throw new AppError(
        'Permission name must follow format: resource:action',
        400,
        'INVALID_PERMISSION_NAME'
      );
    }

    const permission = await this.repository.create(data);
    return this.toResponseDto(permission);
  }

  /**
   * Update a permission
   */
  async update(id: string, data: PermissionUpdateDto): Promise<PermissionResponseDto> {
    // Check if permission exists
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
    }

    // Check if new name already exists (if updating name)
    if (data.name && data.name !== existing.name) {
      const nameExists = await this.repository.nameExists(data.name, id);
      if (nameExists) {
        throw new AppError(
          'Permission with this name already exists',
          409,
          'PERMISSION_ALREADY_EXISTS'
        );
      }

      // Validate name format
      if (!this.isValidPermissionName(data.name)) {
        throw new AppError(
          'Permission name must follow format: resource:action',
          400,
          'INVALID_PERMISSION_NAME'
        );
      }
    }

    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new AppError('Failed to update permission', 500, 'UPDATE_FAILED');
    }

    return this.toResponseDto(updated);
  }

  /**
   * Soft delete a permission
   */
  async softDelete(id: string): Promise<PermissionResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
    }

    const deleted = await this.repository.softDelete(id);
    if (!deleted) {
      throw new AppError('Failed to delete permission', 500, 'DELETE_FAILED');
    }

    return this.toResponseDto(deleted);
  }

  /**
   * Hard delete a permission
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new AppError('Permission not found', 404, 'PERMISSION_NOT_FOUND');
    }

    const deleted = await this.repository.delete(id);
    if (!deleted) {
      throw new AppError('Failed to delete permission', 500, 'DELETE_FAILED');
    }
  }

  /**
   * Get permissions by IDs
   */
  async findByIds(
    ids: string[],
    lang?: string
  ): Promise<PermissionResponseDto[] | PermissionLocalizedResponseDto[]> {
    const permissions = await this.repository.findByIds(ids);
    return lang
      ? permissions.map((p) => this.toLocalizedResponseDto(p, lang))
      : permissions.map((p) => this.toResponseDto(p));
  }

  /**
   * Get permissions by names
   */
  async findByNames(
    names: string[],
    lang?: string
  ): Promise<PermissionResponseDto[] | PermissionLocalizedResponseDto[]> {
    const permissions = await this.repository.findByNames(names);
    return lang
      ? permissions.map((p) => this.toLocalizedResponseDto(p, lang))
      : permissions.map((p) => this.toResponseDto(p));
  }

  /**
   * Get all active permissions
   */
  async findAllActive(
    lang?: string
  ): Promise<PermissionResponseDto[] | PermissionLocalizedResponseDto[]> {
    const permissions = await this.repository.findAllActive();
    return lang
      ? permissions.map((p) => this.toLocalizedResponseDto(p, lang))
      : permissions.map((p) => this.toResponseDto(p));
  }

  /**
   * Validate permission name format
   */
  private isValidPermissionName(name: string): boolean {
    const pattern = /^[a-z_]+:[a-z_]+$/;
    return pattern.test(name.toLowerCase());
  }

  /**
   * Get localized text from multilingual field
   */
  private getLocalizedText(multilingual: IMultilingualText, lang: string): string {
    const validLang = ['en', 'fr', 'de', 'it'].includes(lang) ? lang : 'en';
    return multilingual[validLang as keyof IMultilingualText] || multilingual.en;
  }

  /**
   * Convert Permission to Response DTO
   */
  private toResponseDto(permission: IPermission): PermissionResponseDto {
    return {
      id: permission._id.toString(),
      name: permission.name,
      display_name: permission.display_name,
      description: permission.description,
      resource: permission.resource,
      action: permission.action,
      is_active: permission.is_active,
      created_at: permission.created_at,
      updated_at: permission.updated_at,
    };
  }

  /**
   * Convert Permission to Localized Response DTO
   */
  private toLocalizedResponseDto(
    permission: IPermission,
    lang: string
  ): PermissionLocalizedResponseDto {
    return {
      id: permission._id.toString(),
      name: permission.name,
      display_name: this.getLocalizedText(permission.display_name, lang),
      description: this.getLocalizedText(permission.description, lang),
      resource: permission.resource,
      action: permission.action,
      is_active: permission.is_active,
      created_at: permission.created_at,
      updated_at: permission.updated_at,
    };
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
