import { Request, Response } from 'express';
import { permissionService, PermissionService } from './permission.service.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse } from '../../shared/utils/response.helper.js';
import {
  PermissionQueryDto,
  PermissionCreateDto,
  PermissionUpdateDto,
} from './permission.types.js';

/**
 * Permission Controller
 * Handles HTTP requests for permission management
 */
export class PermissionController {
  constructor(private service: PermissionService = permissionService) {}

  /**
   * Get all permissions with pagination
   * GET /api/v1/admin/permissions
   */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: PermissionQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      sort: (req.query.sort as string) || 'resource',
      order: (req.query.order as 'asc' | 'desc') || 'asc',
      search: req.query.search as string,
      resource: req.query.resource as string,
      action: req.query.action as PermissionQueryDto['action'],
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
    };

    const lang = req.query.lang as string;
    const result = await this.service.findAll(query, lang);
    sendSuccessResponse(res, 200, 'Permissions retrieved successfully', result);
  });

  /**
   * Get permission by ID
   * GET /api/v1/admin/permissions/:id
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const lang = req.query.lang as string;
    const permission = await this.service.findById(id, lang);
    sendSuccessResponse(res, 200, 'Permission retrieved successfully', permission);
  });

  /**
   * Get permission by name
   * GET /api/v1/admin/permissions/name/:name
   */
  getByName = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name } = req.params;
    const lang = req.query.lang as string;
    const permission = await this.service.findByName(name, lang);
    sendSuccessResponse(res, 200, 'Permission retrieved successfully', permission);
  });

  /**
   * Get permissions by resource
   * GET /api/v1/admin/permissions/resource/:resource
   */
  getByResource = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { resource } = req.params;
    const lang = req.query.lang as string;
    const permissions = await this.service.findByResource(resource, lang);
    sendSuccessResponse(res, 200, 'Permissions retrieved successfully', permissions);
  });

  /**
   * Get all unique resources
   * GET /api/v1/admin/permissions/resources
   */
  getResources = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const resources = await this.service.getResources();
    sendSuccessResponse(res, 200, 'Resources retrieved successfully', resources);
  });

  /**
   * Get permissions grouped by resource
   * GET /api/v1/admin/permissions/grouped
   */
  getGrouped = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const lang = req.query.lang as string;
    const grouped = await this.service.getGroupedByResource(lang);
    sendSuccessResponse(
      res,
      200,
      'Permissions grouped by resource retrieved successfully',
      grouped
    );
  });

  /**
   * Create a new permission
   * POST /api/v1/admin/permissions
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: PermissionCreateDto = req.body;
    const permission = await this.service.create(data);
    sendSuccessResponse(res, 201, 'Permission created successfully', permission);
  });

  /**
   * Update a permission
   * PUT /api/v1/admin/permissions/:id
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: PermissionUpdateDto = req.body;
    const permission = await this.service.update(id, data);
    sendSuccessResponse(res, 200, 'Permission updated successfully', permission);
  });

  /**
   * Soft delete a permission (deactivate)
   * DELETE /api/v1/admin/permissions/:id
   */
  softDelete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const permission = await this.service.softDelete(id);
    sendSuccessResponse(res, 200, 'Permission deactivated successfully', permission);
  });

  /**
   * Hard delete a permission
   * DELETE /api/v1/admin/permissions/:id/permanent
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.service.delete(id);
    sendSuccessResponse(res, 200, 'Permission permanently deleted');
  });

  /**
   * Get all active permissions
   * GET /api/v1/admin/permissions/active
   */
  getAllActive = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const lang = req.query.lang as string;
    const permissions = await this.service.findAllActive(lang);
    sendSuccessResponse(res, 200, 'Active permissions retrieved successfully', permissions);
  });
}

// Export singleton instance
export const permissionController = new PermissionController();
