import { Request, Response } from 'express';
import { LeadService } from './lead.service.js';
import { LeadRepository } from './lead.repository.js';
import { PropertyRepository } from '../property/property.repository.js';
import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, sendPaginatedResponse } from '../../shared/utils/response.helper.js';
import { AuthenticatedRequest } from '../auth/auth.types.js';
import { LeadCreateDto, LeadQueryDto, LeadUpdateDto, LeadNoteCreateDto } from './lead.types.js';

// Initialize repositories and service
const leadRepository = new LeadRepository();
const propertyRepository = new PropertyRepository();
const leadService = new LeadService(leadRepository, propertyRepository);

/**
 * Lead Controller
 * Handles HTTP requests for lead management
 */
export class LeadController {
  /**
   * Create lead from public contact form (unauthenticated)
   * POST /api/v1/leads
   */
  static createPublicLead = asyncHandler(async (req: Request, res: Response) => {
    const data: LeadCreateDto = req.body;

    const lead = await leadService.createPublicLead(data);

    sendSuccessResponse(
      res,
      201,
      'Your inquiry has been submitted successfully. We will contact you soon.',
      lead
    );
  });

  /**
   * Create lead from authenticated user
   * POST /api/v1/leads/authenticated
   */
  static createAuthenticatedLead = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const data = {
      ...req.body,
      // contact_name and contact_email must be provided in the request body for authenticated users
      contact_name: req.body.contact_name,
      contact_email: req.body.contact_email || authReq.user.email,
    };

    const lead = await leadService.createAuthenticatedLead(data, userId);

    sendSuccessResponse(
      res,
      201,
      'Your inquiry has been submitted successfully. We will contact you soon.',
      lead
    );
  });

  /**
   * Get lead by ID (admin/agency)
   * GET /api/v1/admin/leads/:id
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user.id;
    const userAgencyId = authReq.user.agencyId;
    const isAdmin =
      authReq.user.roles.includes('super_admin') || authReq.user.roles.includes('platform_admin');

    const lead = await leadService.getByIdWithAccess(id, userId, userAgencyId, isAdmin);

    sendSuccessResponse(res, 200, 'Lead retrieved successfully', lead);
  });

  /**
   * Get all leads (admin)
   * GET /api/v1/admin/leads
   */
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const query: LeadQueryDto = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
      property_id: req.query.property_id as string,
      agency_id: req.query.agency_id as string,
      assigned_to: req.query.assigned_to as string,
      status: req.query.status as LeadQueryDto['status'],
      priority: req.query.priority as LeadQueryDto['priority'],
      inquiry_type: req.query.inquiry_type as LeadQueryDto['inquiry_type'],
      source: req.query.source as LeadQueryDto['source'],
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
    };

    const result = await leadService.getAll(query);

    sendPaginatedResponse(res, 200, 'Leads retrieved successfully', result.data, result.pagination);
  });

  /**
   * Get leads by agency
   * GET /api/v1/agency/leads
   */
  static getByAgency = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const agencyId = authReq.user.agencyId;

    if (!agencyId) {
      return sendSuccessResponse(res, 200, 'No agency associated with user', []);
    }

    const query: LeadQueryDto = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
      property_id: req.query.property_id as string,
      assigned_to: req.query.assigned_to as string,
      status: req.query.status as LeadQueryDto['status'],
      priority: req.query.priority as LeadQueryDto['priority'],
      inquiry_type: req.query.inquiry_type as LeadQueryDto['inquiry_type'],
      source: req.query.source as LeadQueryDto['source'],
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
    };

    const result = await leadService.getByAgency(agencyId, query);

    return sendPaginatedResponse(
      res,
      200,
      'Agency leads retrieved successfully',
      result.data,
      result.pagination
    );
  });

  /**
   * Get assigned leads (agent)
   * GET /api/v1/agent/leads
   */
  static getAssignedLeads = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const query: LeadQueryDto = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sort: req.query.sort as string,
      status: req.query.status as LeadQueryDto['status'],
      priority: req.query.priority as LeadQueryDto['priority'],
      inquiry_type: req.query.inquiry_type as LeadQueryDto['inquiry_type'],
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
    };

    const result = await leadService.getAssignedLeads(userId, query);

    sendPaginatedResponse(
      res,
      200,
      'Assigned leads retrieved successfully',
      result.data,
      result.pagination
    );
  });

  /**
   * Get user's own leads (customer)
   * GET /api/v1/leads/my-inquiries
   */
  static getUserLeads = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await leadService.getUserLeads(userId, page, limit);

    sendPaginatedResponse(
      res,
      200,
      'Your inquiries retrieved successfully',
      result.data,
      result.pagination
    );
  });

  /**
   * Get leads by property (admin/agency)
   * GET /api/v1/admin/leads/property/:propertyId
   */
  static getByProperty = asyncHandler(async (req: Request, res: Response) => {
    const { propertyId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await leadService.getByProperty(propertyId, page, limit);

    sendPaginatedResponse(
      res,
      200,
      'Property leads retrieved successfully',
      result.data,
      result.pagination
    );
  });

  /**
   * Update lead
   * PATCH /api/v1/admin/leads/:id
   */
  static update = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user.id;
    const userAgencyId = authReq.user.agencyId;
    const isAdmin =
      authReq.user.roles.includes('super_admin') || authReq.user.roles.includes('platform_admin');
    const data: LeadUpdateDto = req.body;

    const lead = await leadService.update(id, data, userId, userAgencyId, isAdmin);

    sendSuccessResponse(res, 200, 'Lead updated successfully', lead);
  });

  /**
   * Update lead status
   * PATCH /api/v1/admin/leads/:id/status
   */
  static updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { status } = req.body;
    const userId = authReq.user.id;
    const userAgencyId = authReq.user.agencyId;
    const isAdmin =
      authReq.user.roles.includes('super_admin') || authReq.user.roles.includes('platform_admin');

    const lead = await leadService.updateStatus(id, status, userId, userAgencyId, isAdmin);

    sendSuccessResponse(res, 200, 'Lead status updated successfully', lead);
  });

  /**
   * Assign lead to user
   * PATCH /api/v1/admin/leads/:id/assign
   */
  static assignLead = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const { assigned_to } = req.body;
    const currentUserId = authReq.user.id;
    const userAgencyId = authReq.user.agencyId;
    const isAdmin =
      authReq.user.roles.includes('super_admin') || authReq.user.roles.includes('platform_admin');

    const lead = await leadService.assignLead(
      id,
      assigned_to,
      currentUserId,
      userAgencyId,
      isAdmin
    );

    sendSuccessResponse(res, 200, 'Lead assigned successfully', lead);
  });

  /**
   * Add note to lead
   * POST /api/v1/admin/leads/:id/notes
   */
  static addNote = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const noteData: LeadNoteCreateDto = req.body;
    const userId = authReq.user.id;
    const userAgencyId = authReq.user.agencyId;
    const isAdmin =
      authReq.user.roles.includes('super_admin') || authReq.user.roles.includes('platform_admin');

    const lead = await leadService.addNote(id, noteData, userId, userAgencyId, isAdmin);

    sendSuccessResponse(res, 200, 'Note added successfully', lead);
  });

  /**
   * Delete lead
   * DELETE /api/v1/admin/leads/:id
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { id } = req.params;
    const userId = authReq.user.id;
    const userAgencyId = authReq.user.agencyId;
    const isAdmin =
      authReq.user.roles.includes('super_admin') || authReq.user.roles.includes('platform_admin');

    await leadService.delete(id, userId, userAgencyId, isAdmin);

    sendSuccessResponse(res, 200, 'Lead deleted successfully');
  });

  /**
   * Get lead statistics (admin)
   * GET /api/v1/admin/leads/statistics
   */
  static getStatistics = asyncHandler(async (req: Request, res: Response) => {
    const agencyId = req.query.agency_id as string;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    const stats = await leadService.getStatistics(agencyId, dateFrom, dateTo);

    sendSuccessResponse(res, 200, 'Lead statistics retrieved successfully', stats);
  });

  /**
   * Get agency lead statistics
   * GET /api/v1/agency/leads/statistics
   */
  static getAgencyStatistics = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const agencyId = authReq.user.agencyId;
    const dateFrom = req.query.date_from as string;
    const dateTo = req.query.date_to as string;

    if (!agencyId) {
      return sendSuccessResponse(res, 200, 'No agency associated with user');
    }

    const stats = await leadService.getStatistics(agencyId, dateFrom, dateTo);

    return sendSuccessResponse(res, 200, 'Agency lead statistics retrieved successfully', stats);
  });

  /**
   * Get follow-up required leads (admin)
   * GET /api/v1/admin/leads/follow-up
   */
  static getFollowUpRequired = asyncHandler(async (req: Request, res: Response) => {
    const agencyId = req.query.agency_id as string;
    const assignedTo = req.query.assigned_to as string;
    const limit = parseInt(req.query.limit as string) || 20;

    const leads = await leadService.getFollowUpRequired(agencyId, assignedTo, limit);

    sendSuccessResponse(res, 200, 'Follow-up required leads retrieved successfully', leads);
  });

  /**
   * Get agent follow-up required leads
   * GET /api/v1/agent/leads/follow-up
   */
  static getAgentFollowUpRequired = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const agencyId = authReq.user.agencyId;
    const limit = parseInt(req.query.limit as string) || 20;

    const leads = await leadService.getFollowUpRequired(agencyId, userId, limit);

    sendSuccessResponse(res, 200, 'Follow-up required leads retrieved successfully', leads);
  });
}

export default LeadController;
