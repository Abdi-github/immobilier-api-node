import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, PaginationMeta } from '../../shared/utils/response.helper.js';
import { categoryService } from './category.service.js';
import { CategoryQueryDto } from './category.types.js';
import { SupportedLanguage } from '../location/index.js';
import { CategorySection } from './category.model.js';

/**
 * Category Controller
 */
export const categoryController = {
  /**
   * Get all categories
   * @route GET /api/v1/public/categories
   */
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const query: CategoryQueryDto = {
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sort: req.query.sort as string | undefined,
      is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
      section: req.query.section as CategorySection | undefined,
      search: req.query.search as string | undefined,
      lang: req.query.lang as SupportedLanguage | undefined,
    };

    const result = await categoryService.getAll(query);
    sendSuccessResponse(
      res,
      200,
      'Categories retrieved successfully',
      result.data,
      result.pagination as PaginationMeta
    );
  }),

  /**
   * Get category by ID
   * @route GET /api/v1/public/categories/:id
   */
  getById: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await categoryService.getById(req.params.id, lang);
    sendSuccessResponse(res, 200, 'Category retrieved successfully', result);
  }),

  /**
   * Get category by slug
   * @route GET /api/v1/public/categories/slug/:slug
   */
  getBySlug: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await categoryService.getBySlug(req.params.slug, lang);
    sendSuccessResponse(res, 200, 'Category retrieved successfully', result);
  }),

  /**
   * Get categories by section
   * @route GET /api/v1/public/categories/section/:section
   */
  getBySection: asyncHandler(async (req: Request, res: Response) => {
    const lang = req.query.lang as SupportedLanguage | undefined;
    const result = await categoryService.getBySection(req.params.section as CategorySection, lang);
    sendSuccessResponse(res, 200, 'Categories retrieved successfully', result);
  }),

  /**
   * Create category (Admin only)
   * @route POST /api/v1/admin/categories
   */
  create: asyncHandler(async (req: Request, res: Response) => {
    const result = await categoryService.create(req.body);
    sendSuccessResponse(res, 201, 'Category created successfully', result);
  }),

  /**
   * Update category (Admin only)
   * @route PATCH /api/v1/admin/categories/:id
   */
  update: asyncHandler(async (req: Request, res: Response) => {
    const result = await categoryService.update(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'Category updated successfully', result);
  }),

  /**
   * Delete category (Admin only)
   * @route DELETE /api/v1/admin/categories/:id
   */
  delete: asyncHandler(async (req: Request, res: Response) => {
    await categoryService.delete(req.params.id);
    sendSuccessResponse(res, 200, 'Category deleted successfully', null);
  }),
};
