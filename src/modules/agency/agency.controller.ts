import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, PaginationMeta } from '../../shared/utils/response.helper.js';
import { SupportedLanguage } from '../location/index.js';

import { AgencyService, agencyService } from './agency.service.js';
import { AgencyQueryDto, AgencyCreateDto, AgencyUpdateDto } from './agency.types.js';

/**
 * Agency Controller
 * Handles HTTP requests for agency operations
 */
export class AgencyController {
  constructor(private service: AgencyService) {}

  /**
   * Get all agencies
   * GET /api/v1/public/agencies
   */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query: AgencyQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sort: req.query.sort as string,
      order: req.query.order as 'asc' | 'desc',
      search: req.query.search as string,
      canton_id: req.query.canton_id as string,
      city_id: req.query.city_id as string,
      status: req.query.status as 'active' | 'pending' | 'suspended' | 'inactive',
      is_verified:
        req.query.is_verified !== undefined ? req.query.is_verified === 'true' : undefined,
      include_inactive:
        req.query.include_inactive !== undefined
          ? req.query.include_inactive === 'true'
          : undefined,
      lang: req.query.lang as SupportedLanguage,
    };

    const result = await this.service.findAll(query);
    sendSuccessResponse(
      res,
      200,
      'Agencies retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get agency by ID
   * GET /api/v1/public/agencies/:id
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const lang = req.query.lang as SupportedLanguage;

    const agency = await this.service.findById(id, lang);
    sendSuccessResponse(res, 200, 'Agency retrieved successfully', agency);
  });

  /**
   * Get agency by slug
   * GET /api/v1/public/agencies/slug/:slug
   */
  getBySlug = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { slug } = req.params;
    const lang = req.query.lang as SupportedLanguage;

    const agency = await this.service.findBySlug(slug, lang);
    sendSuccessResponse(res, 200, 'Agency retrieved successfully', agency);
  });

  /**
   * Get agencies by canton
   * GET /api/v1/public/agencies/canton/:cantonId
   */
  getByCanton = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cantonId } = req.params;
    const query: AgencyQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sort: req.query.sort as string,
      order: req.query.order as 'asc' | 'desc',
      lang: req.query.lang as SupportedLanguage,
    };

    const result = await this.service.findByCanton(cantonId, query);
    sendSuccessResponse(
      res,
      200,
      'Agencies retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get agencies by city
   * GET /api/v1/public/agencies/city/:cityId
   */
  getByCity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cityId } = req.params;
    const query: AgencyQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sort: req.query.sort as string,
      order: req.query.order as 'asc' | 'desc',
      lang: req.query.lang as SupportedLanguage,
    };

    const result = await this.service.findByCity(cityId, query);
    sendSuccessResponse(
      res,
      200,
      'Agencies retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Create a new agency (Admin)
   * POST /api/v1/admin/agencies
   */
  create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const data: AgencyCreateDto = req.body as AgencyCreateDto;
    const agency = await this.service.create(data);
    sendSuccessResponse(res, 201, 'Agency created successfully', agency);
  });

  /**
   * Update an agency (Admin)
   * PATCH /api/v1/admin/agencies/:id
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: AgencyUpdateDto = req.body as AgencyUpdateDto;
    const agency = await this.service.update(id, data);
    sendSuccessResponse(res, 200, 'Agency updated successfully', agency);
  });

  /**
   * Delete an agency (Admin)
   * DELETE /api/v1/admin/agencies/:id
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    await this.service.delete(id);
    sendSuccessResponse(res, 200, 'Agency deleted successfully', null);
  });

  /**
   * Verify an agency (Admin)
   * POST /api/v1/admin/agencies/:id/verify
   */
  verify = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const agency = await this.service.verify(id);
    sendSuccessResponse(res, 200, 'Agency verified successfully', agency);
  });

  /**
   * Unverify an agency (Admin)
   * POST /api/v1/admin/agencies/:id/unverify
   */
  unverify = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const agency = await this.service.unverify(id);
    sendSuccessResponse(res, 200, 'Agency verification removed', agency);
  });

  /**
   * Update agency status (Admin)
   * PATCH /api/v1/admin/agencies/:id/status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body as { status: 'active' | 'pending' | 'suspended' | 'inactive' };
    const agency = await this.service.updateStatus(id, status);
    sendSuccessResponse(res, 200, 'Agency status updated successfully', agency);
  });

  /**
   * Get agency statistics (Admin)
   * GET /api/v1/admin/agencies/statistics
   */
  getStatistics = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const stats = await this.service.getStatistics();
    sendSuccessResponse(res, 200, 'Agency statistics retrieved successfully', stats);
  });
}

// Export singleton controller
export const agencyController = new AgencyController(agencyService);
