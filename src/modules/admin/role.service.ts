import { RoleRepository } from './role.repository.js';
import { PermissionRepository } from './permission.repository.js';
import {
  RoleQueryDto,
  RoleCreateDto,
  RoleUpdateDto,
  RoleListResponseDto,
  RoleResponseDto,
  AssignPermissionsDto,
  RevokePermissionsDto,
} from './role.types.js';
import { IRole } from './role.model.js';
import { AppError } from '../../shared/errors/AppError.js';

/**
 * Role Service - Business logic for role management
 */
export class RoleService {
  private roleRepository: RoleRepository;
  private permissionRepository: PermissionRepository;

  constructor() {
    this.roleRepository = new RoleRepository();
    this.permissionRepository = new PermissionRepository();
  }

  /**
   * Transform role document to response DTO
   */
  private toResponseDto(role: IRole): RoleResponseDto {
    return {
      id: role._id.toString(),
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      permissions: role.permissions.map((p) =>
        typeof p === 'object' && p._id ? p._id.toString() : p.toString()
      ),
      is_system: role.is_system,
      is_active: role.is_active,
      created_at: role.created_at,
      updated_at: role.updated_at,
    };
  }

  /**
   * Get all roles with pagination
   */
  async getAll(query: RoleQueryDto): Promise<RoleListResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const { data, total } = await this.roleRepository.findAll(query);

    const totalPages = Math.ceil(total / limit);

    return {
      data: data.map((role) => this.toResponseDto(role)),
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
   * Get role by ID
   */
  async getById(id: string, includePermissions = false): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(id, includePermissions);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    return this.toResponseDto(role);
  }

  /**
   * Get role by name
   */
  async getByName(name: string, includePermissions = false): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findByName(name, includePermissions);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    return this.toResponseDto(role);
  }

  /**
   * Create a new role
   */
  async create(data: RoleCreateDto): Promise<RoleResponseDto> {
    // Check if role name already exists
    const nameExists = await this.roleRepository.nameExists(data.name);
    if (nameExists) {
      throw new AppError(
        `Role with name "${data.name}" already exists`,
        409,
        'ROLE_ALREADY_EXISTS'
      );
    }

    // Validate permissions if provided
    if (data.permissions && data.permissions.length > 0) {
      const existingPermissions = await this.permissionRepository.findByIds(data.permissions);
      if (existingPermissions.length !== data.permissions.length) {
        throw new AppError('One or more permission IDs are invalid', 400, 'INVALID_PERMISSION_IDS');
      }
    }

    const role = await this.roleRepository.create(data);
    return this.toResponseDto(role);
  }

  /**
   * Update a role
   */
  async update(id: string, data: RoleUpdateDto): Promise<RoleResponseDto> {
    // Check if role exists
    const existingRole = await this.roleRepository.findById(id);
    if (!existingRole) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Prevent modification of system roles (name and is_system)
    if (existingRole.is_system) {
      if (data.name !== undefined || data.is_system !== undefined) {
        throw new AppError(
          'Cannot modify name or system status of system roles',
          403,
          'SYSTEM_ROLE_PROTECTED'
        );
      }
    }

    // Check name uniqueness if being updated
    if (data.name !== undefined) {
      const nameExists = await this.roleRepository.nameExists(data.name, id);
      if (nameExists) {
        throw new AppError(
          `Role with name "${data.name}" already exists`,
          409,
          'ROLE_ALREADY_EXISTS'
        );
      }
    }

    // Validate permissions if provided
    if (data.permissions && data.permissions.length > 0) {
      const existingPermissions = await this.permissionRepository.findByIds(data.permissions);
      if (existingPermissions.length !== data.permissions.length) {
        throw new AppError('One or more permission IDs are invalid', 400, 'INVALID_PERMISSION_IDS');
      }
    }

    const role = await this.roleRepository.update(id, data);
    if (!role) {
      throw new AppError('Failed to update role', 500, 'ROLE_UPDATE_FAILED');
    }

    return this.toResponseDto(role);
  }

  /**
   * Delete a role
   */
  async delete(id: string): Promise<void> {
    const role = await this.roleRepository.findById(id);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Prevent deletion of system roles
    if (role.is_system) {
      throw new AppError('Cannot delete system roles', 403, 'SYSTEM_ROLE_PROTECTED');
    }

    await this.roleRepository.delete(id);
  }

  /**
   * Assign permissions to a role
   */
  async assignPermissions(roleId: string, data: AssignPermissionsDto): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Validate all permission IDs
    const existingPermissions = await this.permissionRepository.findByIds(data.permissions);
    if (existingPermissions.length !== data.permissions.length) {
      throw new AppError('One or more permission IDs are invalid', 400, 'INVALID_PERMISSION_IDS');
    }

    const updatedRole = await this.roleRepository.assignPermissions(roleId, data.permissions);

    if (!updatedRole) {
      throw new AppError('Failed to assign permissions', 500, 'PERMISSION_ASSIGN_FAILED');
    }

    return this.toResponseDto(updatedRole);
  }

  /**
   * Revoke permissions from a role
   */
  async revokePermissions(roleId: string, data: RevokePermissionsDto): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    const updatedRole = await this.roleRepository.revokePermissions(roleId, data.permissions);

    if (!updatedRole) {
      throw new AppError('Failed to revoke permissions', 500, 'PERMISSION_REVOKE_FAILED');
    }

    return this.toResponseDto(updatedRole);
  }

  /**
   * Set permissions for a role (replace all)
   */
  async setPermissions(roleId: string, data: AssignPermissionsDto): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(roleId);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Validate all permission IDs if provided
    if (data.permissions.length > 0) {
      const existingPermissions = await this.permissionRepository.findByIds(data.permissions);
      if (existingPermissions.length !== data.permissions.length) {
        throw new AppError('One or more permission IDs are invalid', 400, 'INVALID_PERMISSION_IDS');
      }
    }

    const updatedRole = await this.roleRepository.setPermissions(roleId, data.permissions);

    if (!updatedRole) {
      throw new AppError('Failed to set permissions', 500, 'PERMISSION_SET_FAILED');
    }

    return this.toResponseDto(updatedRole);
  }

  /**
   * Get permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<RoleResponseDto> {
    const role = await this.roleRepository.findById(roleId, true);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    return this.toResponseDto(role);
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(roleId: string, permissionCode: string): Promise<boolean> {
    const role = await this.roleRepository.findById(roleId, true);

    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Check if any permission matches the code
    return role.permissions.some((p: unknown) => {
      if (typeof p === 'object' && p !== null && 'name' in p) {
        return (p as { name: string }).name === permissionCode;
      }
      return false;
    });
  }

  /**
   * Get multiple roles by IDs
   */
  async getByIds(ids: string[]): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.findByIds(ids);
    return roles.map((role) => this.toResponseDto(role));
  }

  /**
   * Get multiple roles by names
   */
  async getByNames(names: string[]): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.findByNames(names);
    return roles.map((role) => this.toResponseDto(role));
  }
}
