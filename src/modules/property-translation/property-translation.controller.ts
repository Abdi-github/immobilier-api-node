import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse } from '../../shared/utils/response.helper.js';
import type { SupportedLanguage } from '../location/index.js';

import {
  PropertyTranslationService,
  propertyTranslationService,
} from './property-translation.service.js';
import type {
  PropertyTranslationQueryDto,
  PropertyTranslationCreateDto,
  PropertyTranslationUpdateDto,
  TranslationSource,
  TranslationApprovalStatus,
} from './property-translation.types.js';

// Extend Express Request to include user
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    roles?: string[];
    permissions?: string[];
  };
}

/**
 * Property Translation Controller
 * Handles HTTP requests for property translation operations
 */
export class PropertyTranslationController {
  constructor(private service: PropertyTranslationService) {}

  /**
   * Parse query parameters
   */
  private parseQuery(req: Request): PropertyTranslationQueryDto {
    return {
      page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      sort: req.query.sort as string,
      order: req.query.order as 'asc' | 'desc',
      lang: req.query.lang as SupportedLanguage,
      property_id: req.query.property_id as string,
      language: req.query.language as SupportedLanguage,
      source: req.query.source as TranslationSource,
      approval_status: req.query.approval_status as TranslationApprovalStatus,
      approved_by: req.query.approved_by as string,
      search: req.query.search as string,
    };
  }

  // ==========================================
  // Public Endpoints
  // ==========================================

  /**
   * Get translations for a property (public - only approved)
   * GET /api/v1/public/properties/:propertyId/translations
   */
  getByPropertyId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { propertyId } = req.params;
    const translations = await this.service.findByPropertyId(propertyId);

    // Filter to only approved translations for public access
    const approvedTranslations = translations.filter((t) => t.approval_status === 'APPROVED');

    sendSuccessResponse(res, 200, 'Translations retrieved successfully', approvedTranslations);
  });

  /**
   * Get translation for a property by language (public - only approved)
   * GET /api/v1/public/properties/:propertyId/translations/:language
   */
  getByPropertyAndLanguage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { propertyId, language } = req.params;
    const translation = await this.service.findApprovedByPropertyAndLanguage(
      propertyId,
      language as SupportedLanguage
    );

    if (!translation) {
      sendSuccessResponse(res, 404, 'Translation not found or not approved', null);
      return;
    }

    sendSuccessResponse(res, 200, 'Translation retrieved successfully', translation);
  });

  // ==========================================
  // Admin Endpoints
  // ==========================================

  /**
   * Get all translations (admin)
   * GET /api/v1/admin/translations
   */
  adminGetAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = this.parseQuery(req);
    const result = await this.service.findAll(query);

    sendSuccessResponse(res, 200, 'Translations retrieved successfully', result.data, result.meta);
  });

  /**
   * Get pending translations (admin)
   * GET /api/v1/admin/translations/pending
   */
  adminGetPending = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const query = this.parseQuery(req);
    const result = await this.service.findPending(query);

    sendSuccessResponse(
      res,
      200,
      'Pending translations retrieved successfully',
      result.data,
      result.meta
    );
  });

  /**
   * Get translation by ID (admin)
   * GET /api/v1/admin/translations/:id
   */
  adminGetById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const translation = await this.service.findById(id);

    sendSuccessResponse(res, 200, 'Translation retrieved successfully', translation);
  });

  /**
   * Get all translations for a property (admin)
   * GET /api/v1/admin/properties/:propertyId/translations
   */
  adminGetByPropertyId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { propertyId } = req.params;
    const translations = await this.service.findByPropertyId(propertyId);

    sendSuccessResponse(res, 200, 'Translations retrieved successfully', translations);
  });

  /**
   * Get translation status summary for a property (admin)
   * GET /api/v1/admin/properties/:propertyId/translations/status
   */
  adminGetTranslationStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { propertyId } = req.params;
    const status = await this.service.getTranslationStatus(propertyId);

    sendSuccessResponse(res, 200, 'Translation status retrieved successfully', status);
  });

  /**
   * Create a new translation (admin)
   * POST /api/v1/admin/translations
   */
  adminCreate = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const data: PropertyTranslationCreateDto = {
      property_id: req.body.property_id,
      language: req.body.language,
      title: req.body.title,
      description: req.body.description,
      source: req.body.source,
      quality_score: req.body.quality_score,
    };

    const translation = await this.service.create(data);

    sendSuccessResponse(res, 201, 'Translation created successfully', translation);
  });

  /**
   * Request translations for a property (DeepL)
   * POST /api/v1/admin/properties/:propertyId/translations/request
   */
  adminRequestTranslations = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { propertyId } = req.params;
      const targetLanguages = req.body.target_languages as SupportedLanguage[] | undefined;

      const translations = await this.service.requestTranslations({
        property_id: propertyId,
        target_languages: targetLanguages,
      });

      if (translations.length === 0) {
        sendSuccessResponse(res, 200, 'No translations needed - all languages are covered', []);
        return;
      }

      sendSuccessResponse(
        res,
        201,
        `${translations.length} translation(s) requested successfully`,
        translations
      );
    }
  );

  /**
   * Update a translation (admin)
   * PATCH /api/v1/admin/translations/:id
   */
  adminUpdate = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: PropertyTranslationUpdateDto = {
      title: req.body.title,
      description: req.body.description,
      source: req.body.source,
      quality_score: req.body.quality_score,
    };

    const translation = await this.service.update(id, data);

    sendSuccessResponse(res, 200, 'Translation updated successfully', translation);
  });

  /**
   * Approve a translation (admin)
   * POST /api/v1/admin/translations/:id/approve
   */
  adminApprove = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const approvedBy = req.user?.id;

    if (!approvedBy) {
      sendSuccessResponse(res, 401, 'User not authenticated', null);
      return;
    }

    const translation = await this.service.approve(id, approvedBy);

    sendSuccessResponse(res, 200, 'Translation approved successfully', translation);
  });

  /**
   * Bulk approve translations (admin)
   * POST /api/v1/admin/translations/bulk-approve
   */
  adminBulkApprove = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { ids } = req.body as { ids: string[] };
      const approvedBy = req.user?.id;

      if (!approvedBy) {
        sendSuccessResponse(res, 401, 'User not authenticated', null);
        return;
      }

      const translations = await this.service.bulkApprove(ids, approvedBy);

      sendSuccessResponse(
        res,
        200,
        `${translations.length} translation(s) approved successfully`,
        translations
      );
    }
  );

  /**
   * Reject a translation (admin)
   * POST /api/v1/admin/translations/:id/reject
   */
  adminReject = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { rejection_reason } = req.body;
    const rejectedBy = req.user?.id;

    if (!rejectedBy) {
      sendSuccessResponse(res, 401, 'User not authenticated', null);
      return;
    }

    const translation = await this.service.reject(id, rejectedBy, rejection_reason);

    sendSuccessResponse(res, 200, 'Translation rejected successfully', translation);
  });

  /**
   * Reset translation to pending (admin)
   * POST /api/v1/admin/translations/:id/reset
   */
  adminReset = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    const translation = await this.service.resetToPending(id);

    sendSuccessResponse(res, 200, 'Translation reset to pending successfully', translation);
  });

  /**
   * Delete a translation (admin)
   * DELETE /api/v1/admin/translations/:id
   */
  adminDelete = asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    await this.service.delete(id);

    sendSuccessResponse(res, 200, 'Translation deleted successfully', null);
  });

  /**
   * Get translation statistics (admin)
   * GET /api/v1/admin/translations/statistics
   */
  adminGetStatistics = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const statistics = await this.service.getStatistics();

    sendSuccessResponse(res, 200, 'Translation statistics retrieved successfully', statistics);
  });
}

// Export singleton instance
export const propertyTranslationController = new PropertyTranslationController(
  propertyTranslationService
);
