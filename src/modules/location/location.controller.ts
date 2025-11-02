import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, PaginationMeta } from '../../shared/utils/response.helper.js';
import { locationService } from './location.service.js';
import { CantonQueryDto, CityQueryDto } from './location.types.js';
import { SupportedLanguage } from './index.js';

/**
 * Canton Controller
 */
export const cantonController = {
  /**
   * Get all cantons
   * @route GET /api/v1/public/locations/cantons
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const query: CantonQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort: req.query.sort as string | undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      code: req.query.code as string | undefined,
      search: req.query.search as string | undefined,
      lang: req.query.lang as SupportedLanguage | undefined,
    };

    const result = await locationService.getAllCantons(query);
    sendSuccessResponse(
      res,
      200,
      'Cantons retrieved successfully',
      result.data,
      result.pagination as PaginationMeta
    );
  }),

  /**
   * Get canton by ID
   * @route GET /api/v1/public/locations/cantons/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await locationService.getCantonById(req.params.id, lang);
    sendSuccessResponse(res, 200, 'Canton retrieved successfully', result);
  }),

  /**
   * Get canton by code
   * @route GET /api/v1/public/locations/cantons/code/:code
   */
  getByCode: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await locationService.getCantonByCode(req.params.code.toUpperCase(), lang);
    sendSuccessResponse(res, 200, 'Canton retrieved successfully', result);
  }),

  /**
   * Create canton (Admin only)
   * @route POST /api/v1/admin/locations/cantons
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await locationService.createCanton(req.body);
    sendSuccessResponse(res, 201, 'Canton created successfully', result);
  }),

  /**
   * Update canton (Admin only)
   * @route PATCH /api/v1/admin/locations/cantons/:id
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const result = await locationService.updateCanton(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'Canton updated successfully', result);
  }),

  /**
   * Delete canton (Admin only)
   * @route DELETE /api/v1/admin/locations/cantons/:id
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await locationService.deleteCanton(req.params.id);
    sendSuccessResponse(res, 200, 'Canton deleted successfully', null);
  }),
};

/**
 * City Controller
 */
export const cityController = {
  /**
   * Get popular cities with property counts
   * @route GET /api/v1/public/locations/cities/popular
   */
  getPopular: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const minProperties = req.query.min_properties
      ? parseInt(req.query.min_properties as string)
      : 10;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

    const result = await locationService.getPopularCities(lang, minProperties, limit);
    sendSuccessResponse(res, 200, 'Popular cities retrieved successfully', result);
  }),

  /**
   * Get all cities
   * @route GET /api/v1/public/locations/cities
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const query: CityQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort: req.query.sort as string | undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      canton_id: req.query.canton_id as string | undefined,
      postal_code: req.query.postal_code as string | undefined,
      search: req.query.search as string | undefined,
      lang: req.query.lang as SupportedLanguage | undefined,
    };

    const result = await locationService.getAllCities(query);
    sendSuccessResponse(
      res,
      200,
      'Cities retrieved successfully',
      result.data,
      result.pagination as PaginationMeta
    );
  }),

  /**
   * Get city by ID
   * @route GET /api/v1/public/locations/cities/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await locationService.getCityById(req.params.id, lang);
    sendSuccessResponse(res, 200, 'City retrieved successfully', result);
  }),

  /**
   * Get cities by canton ID
   * @route GET /api/v1/public/locations/cantons/:id/cities
   */
  getByCantonId: asyncHandler(async (req: Request, res: Response) => {
    const query: CityQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort: req.query.sort as string | undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      canton_id: req.params.id,
      postal_code: req.query.postal_code as string | undefined,
      search: req.query.search as string | undefined,
      lang: req.query.lang as SupportedLanguage | undefined,
    };

    const result = await locationService.getCitiesByCantonId(req.params.id, query);
    sendSuccessResponse(
      res,
      200,
      'Cities retrieved successfully',
      result.data,
      result.pagination as PaginationMeta
    );
  }),

  /**
   * Get cities by postal code
   * @route GET /api/v1/public/locations/cities/postal/:postalCode
   */
  getByPostalCode: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await locationService.getCitiesByPostalCode(req.params.postalCode, lang);
    sendSuccessResponse(res, 200, 'Cities retrieved successfully', result);
  }),

  /**
   * Search cities
   * @route GET /api/v1/public/locations/cities/search
   */
  search: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await locationService.searchCities(query, lang);
    sendSuccessResponse(res, 200, 'Cities retrieved successfully', result);
  }),

  /**
   * Create city (Admin only)
   * @route POST /api/v1/admin/locations/cities
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await locationService.createCity(req.body);
    sendSuccessResponse(res, 201, 'City created successfully', result);
  }),

  /**
   * Update city (Admin only)
   * @route PATCH /api/v1/admin/locations/cities/:id
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const result = await locationService.updateCity(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'City updated successfully', result);
  }),

  /**
   * Delete city (Admin only)
   * @route DELETE /api/v1/admin/locations/cities/:id
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await locationService.deleteCity(req.params.id);
    sendSuccessResponse(res, 200, 'City deleted successfully', null);
  }),
};
