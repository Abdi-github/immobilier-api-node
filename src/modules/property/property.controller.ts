import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, PaginationMeta } from '../../shared/utils/response.helper.js';
import { UploadRequest, parseUploadedFiles } from '../../shared/middlewares/upload.middleware.js';
import { AppError } from '../../shared/errors/AppError.js';
import { resolveLanguage } from '../../shared/utils/language.helper.js';

import { PropertyService, propertyService } from './property.service.js';
import {
  PropertyQueryDto,
  PropertyCreateDto,
  PropertyUpdateDto,
  PropertyImageCreateDto,
  PropertyImageUpdateDto,
  PropertyImageUploadDto,
} from './property.types.js';
import { PropertyStatus, TransactionType } from './property.model.js';

// Extend Express Request to include user and file
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userType?: string;
    roles?: string[];
    permissions?: string[];
    agencyId?: string;
  };
}

/**
 * Property Controller
 * Handles HTTP requests for property operations
 */
export class PropertyController {
  constructor(private service: PropertyService) {}

  /**
   * Parse query parameters into PropertyQueryDto
   */
  private parseQuery(req: Request): PropertyQueryDto {
    return {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sort: req.query.sort as string,
      order: req.query.order as 'asc' | 'desc',
      search: req.query.search as string,
      lang: resolveLanguage(req),

      // Location filters
      canton_id: req.query.canton_id as string,
      city_id: req.query.city_id as string,
      postal_code: req.query.postal_code as string,

      // Property filters
      category_id: req.query.category_id as string,
      section: req.query.section as 'residential' | 'commercial' | undefined,
      transaction_type: req.query.transaction_type as TransactionType,
      status: req.query.status as PropertyStatus,
      agency_id: req.query.agency_id as string,

      // Price filters
      price_min: req.query.price_min ? parseFloat(req.query.price_min as string) : undefined,
      price_max: req.query.price_max ? parseFloat(req.query.price_max as string) : undefined,

      // Size filters
      rooms_min: req.query.rooms_min ? parseFloat(req.query.rooms_min as string) : undefined,
      rooms_max: req.query.rooms_max ? parseFloat(req.query.rooms_max as string) : undefined,
      surface_min: req.query.surface_min ? parseFloat(req.query.surface_min as string) : undefined,
      surface_max: req.query.surface_max ? parseFloat(req.query.surface_max as string) : undefined,

      // Amenities filter
      amenities: req.query.amenities
        ? Array.isArray(req.query.amenities)
          ? (req.query.amenities as string[])
          : [req.query.amenities as string]
        : undefined,

      // Admin-only filters
      include_unpublished:
        req.query.include_unpublished !== undefined
          ? req.query.include_unpublished === 'true'
          : undefined,

      // Cursor pagination
      cursor: req.query.cursor as string,
      cursor_direction: req.query.cursor_direction as 'next' | 'prev',
    };
  }

  // ==========================================
  // Public Endpoints
  // ==========================================

  /**
   * Get all properties (offset pagination)
   * GET /api/v1/public/properties
   */
  getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = this.parseQuery(req);
    
    const result = await this.service.findAll(query);

    sendSuccessResponse(
      res,
      200,
      'Properties retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get all properties (cursor pagination)
   * GET /api/v1/public/properties/cursor
   */
  getAllWithCursor = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = this.parseQuery(req);
    const result = await this.service.findAllWithCursor(query);

    sendSuccessResponse(res, 200, 'Properties retrieved successfully', result.data, {
      page: 1, // cursor pagination doesn't use page numbers
      limit: result.meta.limit,
      total: result.meta.total,
      totalPages: Math.ceil(result.meta.total / result.meta.limit),
      hasNextPage: result.meta.has_next,
      hasPrevPage: result.meta.has_prev,
      nextCursor: result.meta.next_cursor,
      prevCursor: result.meta.prev_cursor,
    });
  });

  /**
   * Get property by ID
   * GET /api/v1/public/properties/:id
   */
  getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const lang = resolveLanguage(req);
    const includeImages = req.query.include_images === 'true';

    const property = await this.service.findById(id, lang, includeImages);
    
    sendSuccessResponse(res, 200, 'Property retrieved successfully', property);
  });

  /**
   * Get property by external ID
   * GET /api/v1/public/properties/external/:externalId
   */
  getByExternalId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { externalId } = req.params;
    const lang = resolveLanguage(req);

    const property = await this.service.findByExternalId(externalId, lang);
    sendSuccessResponse(res, 200, 'Property retrieved successfully', property);
  });

  /**
   * Get properties by canton
   * GET /api/v1/public/properties/canton/:cantonId
   */
  getByCanton = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cantonId } = req.params;
    const query = this.parseQuery(req);

    const result = await this.service.findByCanton(cantonId, query);
    sendSuccessResponse(
      res,
      200,
      'Properties retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get properties by city
   * GET /api/v1/public/properties/city/:cityId
   */
  getByCity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { cityId } = req.params;
    const query = this.parseQuery(req);

    const result = await this.service.findByCity(cityId, query);
    sendSuccessResponse(
      res,
      200,
      'Properties retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get properties by agency
   * GET /api/v1/public/properties/agency/:agencyId
   */
  getByAgency = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { agencyId } = req.params;
    const query = this.parseQuery(req);

    const result = await this.service.findByAgency(agencyId, query);
    sendSuccessResponse(
      res,
      200,
      'Properties retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get properties by category
   * GET /api/v1/public/properties/category/:categoryId
   */
  getByCategory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { categoryId } = req.params;
    const query = this.parseQuery(req);

    const result = await this.service.findByCategory(categoryId, query);
    sendSuccessResponse(
      res,
      200,
      'Properties retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get property images
   * GET /api/v1/public/properties/:id/images
   */
  getImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const images = await this.service.getImages(id);
    sendSuccessResponse(res, 200, 'Property images retrieved successfully', images);
  });

  // ==========================================
  // Admin Endpoints
  // ==========================================

  /**
   * Get all properties (admin)
   * GET /api/v1/admin/properties
   */
  adminGetAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = this.parseQuery(req);
    const authReq = req as AuthenticatedRequest;
    // Admin can see all statuses by default
    query.include_unpublished = true;

    // Scope results based on user type:
    // - super_admin / platform_admin see everything
    // - agent / agency_admin see only their agency's properties
    // - owner sees only their own properties
    if (authReq.user) {
      const { userType, id: userId, agencyId } = authReq.user;

      if (userType === 'owner') {
        query.owner_id = userId;
      } else if ((userType === 'agent' || userType === 'agency_admin') && agencyId) {
        query.agency_id = agencyId;
      }
      // super_admin / platform_admin: no filter — see all
    }

    const result = await this.service.findAll(query);
    sendSuccessResponse(
      res,
      200,
      'Properties retrieved successfully',
      result.data,
      result.meta as PaginationMeta
    );
  });

  /**
   * Get property by ID (admin)
   * GET /api/v1/admin/properties/:id
   */
  adminGetById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const lang = resolveLanguage(req);

    const property = await this.service.adminFindById(id, lang, true);
    sendSuccessResponse(res, 200, 'Property retrieved successfully', property);
  });

  /**
   * Create a new property
   * POST /api/v1/admin/properties or /api/v1/agent/properties
   */
  create = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data: PropertyCreateDto = req.body;

    // Set owner_id if user is authenticated and creating for themselves
    if (req.user?.id && !data.owner_id) {
      data.owner_id = req.user.id;
    }

    // Auto-assign agency_id for agents/agency_admins if not explicitly set
    if (req.user?.agencyId && !data.agency_id) {
      data.agency_id = req.user.agencyId;
    }

    const property = await this.service.create(data);
    
    sendSuccessResponse(res, 201, 'Property created successfully', property);
  });

  /**
   * Update a property
   * PUT /api/v1/admin/properties/:id
   */
  update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: PropertyUpdateDto = req.body;

    const property = await this.service.update(id, data);
    
    sendSuccessResponse(res, 200, 'Property updated successfully', property);
  });

  /**
   * Delete a property
   * DELETE /api/v1/admin/properties/:id
   */
  delete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    await this.service.delete(id);
    
    sendSuccessResponse(res, 200, 'Property deleted successfully', null);
  });

  /**
   * Submit property for approval
   * POST /api/v1/admin/properties/:id/submit
   */
  submitForApproval = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const property = await this.service.submitForApproval(id);
    sendSuccessResponse(res, 200, 'Property submitted for approval successfully', property);
  });

  /**
   * Approve a property
   * POST /api/v1/admin/properties/:id/approve
   */
  approve = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const reviewedBy = req.user?.id || req.body.reviewed_by;

    if (!reviewedBy) {
      throw new Error('Reviewer ID is required');
    }

    const property = await this.service.approve(id, reviewedBy);
    sendSuccessResponse(res, 200, 'Property approved successfully', property);
  });

  /**
   * Reject a property
   * POST /api/v1/admin/properties/:id/reject
   */
  reject = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const reviewedBy = req.user?.id || req.body.reviewed_by;
    const { rejection_reason } = req.body;

    if (!reviewedBy) {
      throw new Error('Reviewer ID is required');
    }

    if (!rejection_reason) {
      throw new Error('Rejection reason is required');
    }

    const property = await this.service.reject(id, reviewedBy, rejection_reason);
    sendSuccessResponse(res, 200, 'Property rejected successfully', property);
  });

  /**
   * Publish a property
   * POST /api/v1/admin/properties/:id/publish
   */
  publish = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const property = await this.service.publish(id);
    sendSuccessResponse(res, 200, 'Property published successfully', property);
  });

  /**
   * Archive a property
   * POST /api/v1/admin/properties/:id/archive
   */
  archive = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const property = await this.service.archive(id);
    sendSuccessResponse(res, 200, 'Property archived successfully', property);
  });

  /**
   * Update property status
   * PATCH /api/v1/admin/properties/:id/status
   */
  updateStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const reviewedBy = req.user?.id || req.body.reviewed_by;

    const property = await this.service.updateStatus(id, status, reviewedBy, rejection_reason);
    sendSuccessResponse(res, 200, 'Property status updated successfully', property);
  });

  /**
   * Get property statistics
   * GET /api/v1/admin/properties/statistics
   */
  getStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    // Scope statistics by user type
    let scope: { agency_id?: string; owner_id?: string } | undefined;
    if (user) {
      if (user.userType === 'owner') {
        scope = { owner_id: user.id };
      } else if (['agent', 'agency_admin'].includes(user.userType || '')) {
        scope = user.agencyId ? { agency_id: user.agencyId } : undefined;
      }
      // super_admin / platform_admin: no scope, see all
    }

    const statistics = await this.service.getStatistics(scope);
    sendSuccessResponse(res, 200, 'Property statistics retrieved successfully', statistics);
  });

  // ==========================================
  // Image Management Endpoints
  // ==========================================

  /**
   * Add image to property (URL-based, legacy method)
   * POST /api/v1/admin/properties/:id/images
   */
  addImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: PropertyImageCreateDto = {
      ...req.body,
      property_id: id,
    };

    const image = await this.service.addImage(data);
    sendSuccessResponse(res, 201, 'Image added successfully', image);
  });

  /**
   * Upload single image to property
   * POST /api/v1/admin/properties/:id/images/upload
   */
  uploadImage = asyncHandler(async (req: UploadRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const files = parseUploadedFiles(req);

    if (files.length === 0 || !files[0].buffer) {
      throw new AppError('No image file provided', 400, 'VALID_REQUIRED_FILE');
    }

    const file = files[0];
    const options: PropertyImageUploadDto = {
      property_id: id,
      alt_text: req.body.alt_text,
      caption: req.body.caption,
      sort_order: req.body.sort_order ? parseInt(req.body.sort_order, 10) : undefined,
      is_primary: req.body.is_primary === 'true' || req.body.is_primary === true,
    };

    const image = await this.service.uploadImage(id, file.buffer!, file.originalname, options);
    sendSuccessResponse(res, 201, 'Image uploaded successfully', image);
  });

  /**
   * Upload multiple images to property
   * POST /api/v1/admin/properties/:id/images/upload-multiple
   */
  uploadImages = asyncHandler(async (req: UploadRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const files = parseUploadedFiles(req);

    if (files.length === 0) {
      throw new AppError('No image files provided', 400, 'VALID_REQUIRED_FILE');
    }

    // Filter out files without buffers
    const validFiles = files
      .filter((f) => f.buffer)
      .map((f) => ({ buffer: f.buffer!, filename: f.originalname }));

    if (validFiles.length === 0) {
      throw new AppError('No valid image files provided', 400, 'VALID_REQUIRED_FILE');
    }

    const options = {
      alt_text: req.body.alt_text,
      caption: req.body.caption,
      sort_order: req.body.sort_order ? parseInt(req.body.sort_order, 10) : undefined,
      is_primary: req.body.is_primary === 'true' || req.body.is_primary === true,
    };

    const result = await this.service.uploadImages(id, validFiles, options);
    sendSuccessResponse(res, 201, 'Images uploaded successfully', result);
  });

  /**
   * Upload image from external URL
   * POST /api/v1/admin/properties/:id/images/upload-url
   */
  uploadImageFromUrl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { url, alt_text, caption, sort_order, is_primary } = req.body;

    if (!url) {
      throw new AppError('Image URL is required', 400, 'VALID_REQUIRED_FIELD');
    }

    const options = {
      alt_text,
      caption,
      sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : undefined,
      is_primary: is_primary === 'true' || is_primary === true,
    };

    const image = await this.service.uploadImageFromUrl(id, url, options);
    sendSuccessResponse(res, 201, 'Image uploaded from URL successfully', image);
  });

  /**
   * Add external image reference (no Cloudinary upload)
   * POST /api/v1/admin/properties/:id/images/external
   */
  addExternalImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { url, alt_text, caption, sort_order, is_primary } = req.body;

    if (!url) {
      throw new AppError('Image URL is required', 400, 'VALID_REQUIRED_FIELD');
    }

    const options = {
      alt_text,
      caption,
      sort_order: sort_order !== undefined ? parseInt(sort_order, 10) : undefined,
      is_primary: is_primary === 'true' || is_primary === true,
    };

    const image = await this.service.addExternalImage(id, url, options);
    sendSuccessResponse(res, 201, 'External image reference added successfully', image);
  });

  /**
   * Update property image
   * PUT /api/v1/admin/properties/:propertyId/images/:imageId
   */
  updateImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { imageId } = req.params;
    const data: PropertyImageUpdateDto = req.body;

    const image = await this.service.updateImage(imageId, data);
    sendSuccessResponse(res, 200, 'Image updated successfully', image);
  });

  /**
   * Delete property image
   * DELETE /api/v1/admin/properties/:propertyId/images/:imageId
   */
  deleteImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { imageId } = req.params;

    await this.service.deleteImage(imageId);
    sendSuccessResponse(res, 200, 'Image deleted successfully', null);
  });

  /**
   * Delete all images for a property
   * DELETE /api/v1/admin/properties/:id/images
   */
  deleteAllImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const result = await this.service.deleteAllImages(id);
    sendSuccessResponse(res, 200, 'All images deleted successfully', result);
  });

  /**
   * Reorder property images
   * POST /api/v1/admin/properties/:id/images/reorder
   */
  reorderImages = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { orders } = req.body;

    await this.service.reorderImages(id, orders);
    sendSuccessResponse(res, 200, 'Images reordered successfully', null);
  });

  /**
   * Set primary image for a property
   * POST /api/v1/admin/properties/:id/images/:imageId/primary
   */
  setPrimaryImage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id, imageId } = req.params;

    const image = await this.service.setPrimaryImage(id, imageId);
    sendSuccessResponse(res, 200, 'Primary image set successfully', image);
  });

  /**
   * Get image count for a property
   * GET /api/v1/admin/properties/:id/images/count
   */
  getImageCount = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const count = await this.service.getImageCount(id);
    sendSuccessResponse(res, 200, 'Image count retrieved successfully', { count });
  });

  /**
   * Generate signed upload URL for direct client uploads
   * GET /api/v1/admin/properties/:id/images/upload-url
   */
  getUploadUrl = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const uploadData = this.service.generateUploadUrl(id);
    sendSuccessResponse(res, 200, 'Upload URL generated successfully', uploadData);
  });
}

// Export singleton instance
export const propertyController = new PropertyController(propertyService);
