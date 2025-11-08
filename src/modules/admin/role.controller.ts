import { Request, Response } from 'express';
import { RoleService } from './role.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse } from '../../shared/utils/response.helper.js';
import { RoleQueryDto } from './role.types.js';

const roleService = new RoleService();

/**
 * Role Controller - HTTP handlers for role management
 */
export class RoleController {
  /**
   * Get all roles with pagination
   * GET /api/v1/admin/roles
   */
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const query: RoleQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      sort: (req.query.sort as string) || 'name',
      order: (req.query.order as 'asc' | 'desc') || 'asc',
      search: req.query.search as string,
      is_system: req.query.is_system !== undefined ? req.query.is_system === 'true' : undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      include_permissions: req.query.include_permissions === 'true',
    };

    const result = await roleService.getAll(query);

    sendSuccessResponse(res, 200, 'Roles retrieved successfully', result);
  });

  /**
   * Get role by ID
   * GET /api/v1/admin/roles/:id
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const includePermissions = req.query.include_permissions === 'true';
    const result = await roleService.getById(req.params.id, includePermissions);

    sendSuccessResponse(res, 200, 'Role retrieved successfully', result);
  });

  /**
   * Get role by name
   * GET /api/v1/admin/roles/name/:name
   */
  static getByName = asyncHandler(async (req: Request, res: Response) => {
    const includePermissions = req.query.include_permissions === 'true';
    const result = await roleService.getByName(req.params.name, includePermissions);

    sendSuccessResponse(res, 200, 'Role retrieved successfully', result);
  });

  /**
   * Create a new role
   * POST /api/v1/admin/roles
   */
  static create = asyncHandler(async (req: Request, res: Response) => {
    const result = await roleService.create(req.body);

    sendSuccessResponse(res, 201, 'Role created successfully', result);
  });

  /**
   * Update a role
   * PUT /api/v1/admin/roles/:id
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const result = await roleService.update(req.params.id, req.body);

    sendSuccessResponse(res, 200, 'Role updated successfully', result);
  });

  /**
   * Delete a role
   * DELETE /api/v1/admin/roles/:id
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    await roleService.delete(req.params.id);

    sendSuccessResponse(res, 200, 'Role deleted successfully');
  });

  /**
   * Assign permissions to a role (add to existing)
   * POST /api/v1/admin/roles/:id/permissions/assign
   */
  static assignPermissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await roleService.assignPermissions(req.params.id, req.body);

    sendSuccessResponse(res, 200, 'Permissions assigned successfully', result);
  });

  /**
   * Revoke permissions from a role
   * POST /api/v1/admin/roles/:id/permissions/revoke
   */
  static revokePermissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await roleService.revokePermissions(req.params.id, req.body);

    sendSuccessResponse(res, 200, 'Permissions revoked successfully', result);
  });

  /**
   * Set permissions for a role (replace all)
   * PUT /api/v1/admin/roles/:id/permissions
   */
  static setPermissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await roleService.setPermissions(req.params.id, req.body);

    sendSuccessResponse(res, 200, 'Permissions set successfully', result);
  });

  /**
   * Get permissions for a role
   * GET /api/v1/admin/roles/:id/permissions
   */
  static getPermissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await roleService.getRolePermissions(req.params.id);

    sendSuccessResponse(res, 200, 'Role permissions retrieved successfully', result);
  });
}
