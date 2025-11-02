import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, PaginationMeta } from '../../shared/utils/response.helper.js';
import { SupportedLanguage } from '../location/index.js';

import { AmenityGroup } from './amenity.model.js';
import { amenityService } from './amenity.service.js';
import { AmenityQueryDto } from './amenity.types.js';

/**
 * Amenity Controller
 */
export const amenityController = {
  /**
   * Get all amenities
   * @route GET /api/v1/public/amenities
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const query: AmenityQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort: req.query.sort as string | undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      group: req.query.group as AmenityGroup | undefined,
      search: req.query.search as string | undefined,
      lang: req.query.lang as SupportedLanguage | undefined,
    };

    const result = await amenityService.getAll(query);
    sendSuccessResponse(
      res,
      200,
      'Amenities retrieved successfully',
      result.data,
      result.pagination as PaginationMeta
    );
  }),

  /**
   * Get amenity by ID
   * @route GET /api/v1/public/amenities/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await amenityService.getById(req.params.id, lang);
    sendSuccessResponse(res, 200, 'Amenity retrieved successfully', result);
  }),

  /**
   * Get amenities by group
   * @route GET /api/v1/public/amenities/group/:group
   */
  getByGroup: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await amenityService.getByGroup(req.params.group as AmenityGroup, lang);
    sendSuccessResponse(res, 200, 'Amenities retrieved successfully', result);
  }),

  /**
   * Create amenity (Admin only)
   * @route POST /api/v1/admin/amenities
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await amenityService.create(req.body);
    sendSuccessResponse(res, 201, 'Amenity created successfully', result);
  }),

  /**
   * Update amenity (Admin only)
   * @route PATCH /api/v1/admin/amenities/:id
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const result = await amenityService.update(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'Amenity updated successfully', result);
  }),

  /**
   * Delete amenity (Admin only)
   * @route DELETE /api/v1/admin/amenities/:id
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await amenityService.delete(req.params.id);
    sendSuccessResponse(res, 200, 'Amenity deleted successfully', null);
  }),
};
