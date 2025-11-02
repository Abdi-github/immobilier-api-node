import mongoose from 'mongoose';

import { LeadRepository } from './lead.repository.js';
import { PropertyRepository } from '../property/property.repository.js';
import { ILead } from './lead.model.js';
import {
  LeadCreateDto,
  AuthenticatedLeadCreateDto,
  LeadUpdateDto,
  LeadNoteCreateDto,
  LeadQueryDto,
  LeadResponseDto,
  LeadListResponseDto,
  LeadStatsDto,
  LeadStatus,
  LeadSortOption,
  LeadFilterOptions,
} from './lead.types.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';

/**
 * Lead Service
 * Business logic for lead management
 */
export class LeadService {
  constructor(
    private leadRepository: LeadRepository,
    private propertyRepository: PropertyRepository
  ) {}

  /**
   * Create a lead from public contact form (unauthenticated)
   */
  async createPublicLead(data: LeadCreateDto): Promise<LeadResponseDto> {
    // Check if property exists
    const property = await this.propertyRepository.findById(data.property_id);
    if (!property) {
      throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
    }

    // Check if property is published
    if (property.status !== 'PUBLISHED') {
      throw new AppError(
        'Cannot submit inquiry for unpublished property',
        400,
        'PROPERTY_NOT_AVAILABLE'
      );
    }

    // Check for existing lead within 7 days
    const hasExistingLead = await this.leadRepository.checkExistingLead(
      data.property_id,
      data.email
    );

    if (hasExistingLead) {
      throw new AppError(
        'You have already submitted an inquiry for this property recently',
        409,
        'DUPLICATE_LEAD'
      );
    }

    // Get agency ID from property if it exists
    const agencyId = property.agency_id
      ? typeof property.agency_id === 'object' && '_id' in property.agency_id
        ? new mongoose.Types.ObjectId((property.agency_id as { _id: string })._id)
        : new mongoose.Types.ObjectId(property.agency_id as unknown as string)
      : undefined;

    // Prepare lead data
    const leadData: Partial<ILead> = {
      property_id: new mongoose.Types.ObjectId(data.property_id),
      agency_id: agencyId,
      contact_first_name: data.first_name,
      contact_last_name: data.last_name,
      contact_email: data.email.toLowerCase(),
      contact_phone: data.phone,
      message: data.message,
      inquiry_type: data.inquiry_type,
      source: data.source ?? 'website',
      status: 'NEW',
      priority: 'medium',
      preferred_contact_method: data.preferred_contact_method ?? 'email',
      preferred_language: data.preferred_language ?? 'en',
    };

    const lead = await this.leadRepository.create(leadData);

    logger.info(`New public lead created: ${lead._id} for property ${data.property_id}`);

    return this.mapToResponseDto(lead);
  }

  /**
   * Create a lead from authenticated user
   */
  async createAuthenticatedLead(
    data: AuthenticatedLeadCreateDto & {
      contact_name?: string;
      contact_email?: string;
      contact_phone?: string;
    },
    userId: string
  ): Promise<LeadResponseDto> {
    // Check if property exists
    const property = await this.propertyRepository.findById(data.property_id);
    if (!property) {
      throw new AppError('Property not found', 404, 'PROPERTY_NOT_FOUND');
    }

    // Check if property is published
    if (property.status !== 'PUBLISHED') {
      throw new AppError(
        'Cannot submit inquiry for unpublished property',
        400,
        'PROPERTY_NOT_AVAILABLE'
      );
    }

    // Get agency ID from property if it exists
    const agencyId = property.agency_id
      ? typeof property.agency_id === 'object' && '_id' in property.agency_id
        ? new mongoose.Types.ObjectId((property.agency_id as { _id: string })._id)
        : new mongoose.Types.ObjectId(property.agency_id as unknown as string)
      : undefined;

    // Parse contact name into first/last name
    const nameParts = (data.contact_name ?? '').split(' ');
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Prepare lead data
    const leadData: Partial<ILead> = {
      property_id: new mongoose.Types.ObjectId(data.property_id),
      agency_id: agencyId,
      user_id: new mongoose.Types.ObjectId(userId),
      contact_first_name: firstName,
      contact_last_name: lastName,
      contact_email: data.contact_email?.toLowerCase() ?? '',
      contact_phone: data.contact_phone,
      message: data.message,
      inquiry_type: data.inquiry_type,
      source: 'website',
      status: 'NEW',
      priority: 'medium',
      preferred_contact_method: data.preferred_contact_method ?? 'email',
      preferred_language: 'en',
    };

    const lead = await this.leadRepository.create(leadData);

    logger.info(`New authenticated lead created: ${lead._id} by user ${userId}`);

    return this.mapToResponseDto(lead);
  }

  /**
   * Get lead by ID
   */
  async getById(id: string): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    return this.mapToResponseDto(lead);
  }

  /**
   * Get lead by ID with access check
   */
  async getByIdWithAccess(
    id: string,
    userId: string,
    userAgencyId?: string,
    isAdmin: boolean = false
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findById(id);

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    // Check access
    if (!isAdmin) {
      const hasAccess =
        lead.user_id?.toString() === userId ||
        lead.assigned_to?.toString() === userId ||
        (userAgencyId && lead.agency_id?.toString() === userAgencyId);

      if (!hasAccess) {
        throw new AppError('Access denied to this lead', 403, 'ACCESS_DENIED');
      }
    }

    return this.mapToResponseDto(lead);
  }

  /**
   * Get all leads with filters (admin)
   */
  async getAll(query: LeadQueryDto): Promise<LeadListResponseDto> {
    const { page = 1, limit = 20, sort = 'created_at_desc', ...filters } = query;

    const filterOptions = this.buildFilterOptions(filters);

    const { leads, total } = await this.leadRepository.findAll(
      filterOptions,
      page,
      limit,
      sort as LeadSortOption
    );

    return {
      data: leads.map((lead) => this.mapToResponseDto(lead)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get leads by agency
   */
  async getByAgency(agencyId: string, query: LeadQueryDto): Promise<LeadListResponseDto> {
    const { page = 1, limit = 20, sort = 'created_at_desc', ...filters } = query;

    const filterOptions = this.buildFilterOptions(filters);

    const { leads, total } = await this.leadRepository.findByAgencyId(
      agencyId,
      filterOptions,
      page,
      limit,
      sort as LeadSortOption
    );

    return {
      data: leads.map((lead) => this.mapToResponseDto(lead)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get leads assigned to user
   */
  async getAssignedLeads(userId: string, query: LeadQueryDto): Promise<LeadListResponseDto> {
    const { page = 1, limit = 20, sort = 'created_at_desc', ...filters } = query;

    const filterOptions = this.buildFilterOptions(filters);

    const { leads, total } = await this.leadRepository.findByAssignedTo(
      userId,
      filterOptions,
      page,
      limit,
      sort as LeadSortOption
    );

    return {
      data: leads.map((lead) => this.mapToResponseDto(lead)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get user's own leads (customer)
   */
  async getUserLeads(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<LeadListResponseDto> {
    const { leads, total } = await this.leadRepository.findByUserId(userId, page, limit);

    return {
      data: leads.map((lead) => this.mapToResponseDto(lead)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      },
    };
  }

  /**
   * Get leads by property
   */
  async getByProperty(
    propertyId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<LeadListResponseDto> {
    const { leads, total } = await this.leadRepository.findByPropertyId(propertyId, page, limit);

    return {
      data: leads.map((lead) => this.mapToResponseDto(lead)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: page < Math.ceil(total / limit),
        has_prev: page > 1,
      },
    };
  }

  /**
   * Update lead
   */
  async update(
    id: string,
    data: LeadUpdateDto,
    userId: string,
    userAgencyId?: string,
    isAdmin: boolean = false
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findByIdLean(id);

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    // Check access
    if (!isAdmin) {
      const hasAccess =
        lead.assigned_to?.toString() === userId ||
        (userAgencyId && lead.agency_id?.toString() === userAgencyId);

      if (!hasAccess) {
        throw new AppError('Access denied to update this lead', 403, 'ACCESS_DENIED');
      }
    }

    // Validate status transition
    if (data.status && data.status !== lead.status) {
      this.validateStatusTransition(lead.status, data.status);
    }

    // Prepare update data
    const updateData: Partial<ILead> = {};

    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.assigned_to) {
      updateData.assigned_to = new mongoose.Types.ObjectId(data.assigned_to);
    }
    if (data.follow_up_date) updateData.follow_up_date = new Date(data.follow_up_date);
    if (data.viewing_scheduled_at)
      updateData.viewing_scheduled_at = new Date(data.viewing_scheduled_at);

    const updatedLead = await this.leadRepository.update(id, updateData);

    if (!updatedLead) {
      throw new AppError('Failed to update lead', 500, 'UPDATE_FAILED');
    }

    logger.info(`Lead ${id} updated by user ${userId}`);

    return this.mapToResponseDto(updatedLead);
  }

  /**
   * Update lead status
   */
  async updateStatus(
    id: string,
    status: LeadStatus,
    userId: string,
    userAgencyId?: string,
    isAdmin: boolean = false
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findByIdLean(id);

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    // Check access
    if (!isAdmin) {
      const hasAccess =
        lead.assigned_to?.toString() === userId ||
        (userAgencyId && lead.agency_id?.toString() === userAgencyId);

      if (!hasAccess) {
        throw new AppError('Access denied to update this lead', 403, 'ACCESS_DENIED');
      }
    }

    // Validate status transition
    this.validateStatusTransition(lead.status, status);

    const updatedLead = await this.leadRepository.updateStatus(id, status);

    if (!updatedLead) {
      throw new AppError('Failed to update lead status', 500, 'UPDATE_FAILED');
    }

    logger.info(`Lead ${id} status changed from ${lead.status} to ${status} by user ${userId}`);

    return this.mapToResponseDto(updatedLead);
  }

  /**
   * Assign lead to user
   */
  async assignLead(
    id: string,
    assignToUserId: string,
    currentUserId: string,
    userAgencyId?: string,
    isAdmin: boolean = false
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findByIdLean(id);

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    // Check access (only agency admin or platform admin can assign)
    if (!isAdmin && lead.agency_id?.toString() !== userAgencyId) {
      throw new AppError('Access denied to assign this lead', 403, 'ACCESS_DENIED');
    }

    const updatedLead = await this.leadRepository.update(id, {
      assigned_to: new mongoose.Types.ObjectId(assignToUserId),
    });

    if (!updatedLead) {
      throw new AppError('Failed to assign lead', 500, 'UPDATE_FAILED');
    }

    logger.info(`Lead ${id} assigned to ${assignToUserId} by ${currentUserId}`);

    return this.mapToResponseDto(updatedLead);
  }

  /**
   * Add note to lead
   */
  async addNote(
    leadId: string,
    noteData: LeadNoteCreateDto,
    userId: string,
    userAgencyId?: string,
    isAdmin: boolean = false
  ): Promise<LeadResponseDto> {
    const lead = await this.leadRepository.findByIdLean(leadId);

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    // Check access
    if (!isAdmin) {
      const hasAccess =
        lead.assigned_to?.toString() === userId ||
        (userAgencyId && lead.agency_id?.toString() === userAgencyId);

      if (!hasAccess) {
        throw new AppError('Access denied to add note to this lead', 403, 'ACCESS_DENIED');
      }
    }

    const updatedLead = await this.leadRepository.addNote(
      leadId,
      noteData.content,
      userId,
      noteData.is_internal ?? true
    );

    if (!updatedLead) {
      throw new AppError('Failed to add note', 500, 'UPDATE_FAILED');
    }

    logger.info(`Note added to lead ${leadId} by user ${userId}`);

    return this.mapToResponseDto(updatedLead);
  }

  /**
   * Delete lead
   */
  async delete(
    id: string,
    userId: string,
    userAgencyId?: string,
    isAdmin: boolean = false
  ): Promise<void> {
    const lead = await this.leadRepository.findByIdLean(id);

    if (!lead) {
      throw new AppError('Lead not found', 404, 'LEAD_NOT_FOUND');
    }

    // Check access (only agency admin or platform admin can delete)
    if (!isAdmin && lead.agency_id?.toString() !== userAgencyId) {
      throw new AppError('Access denied to delete this lead', 403, 'ACCESS_DENIED');
    }

    const deleted = await this.leadRepository.delete(id);

    if (!deleted) {
      throw new AppError('Failed to delete lead', 500, 'DELETE_FAILED');
    }

    logger.info(`Lead ${id} deleted by user ${userId}`);
  }

  /**
   * Get lead statistics
   */
  async getStatistics(
    agencyId?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<LeadStatsDto> {
    const stats = await this.leadRepository.getStatistics(
      agencyId,
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );

    return {
      total_leads: stats.total,
      by_status: stats.byStatus,
      by_priority: stats.byPriority,
      by_inquiry_type: stats.byInquiryType,
      by_source: stats.bySource,
      conversion_rate: stats.conversionRate,
      avg_response_time_hours: stats.avgResponseTimeHours ?? undefined,
      period: {
        from: dateFrom ?? 'all_time',
        to: dateTo ?? 'now',
      },
    };
  }

  /**
   * Get leads requiring follow-up
   */
  async getFollowUpRequired(
    agencyId?: string,
    assignedTo?: string,
    limit: number = 20
  ): Promise<LeadResponseDto[]> {
    const leads = await this.leadRepository.getFollowUpRequired(agencyId, assignedTo, limit);
    return leads.map((lead) => this.mapToResponseDto(lead));
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: LeadStatus, newStatus: LeadStatus): void {
    const validTransitions: Record<LeadStatus, LeadStatus[]> = {
      NEW: ['CONTACTED', 'QUALIFIED', 'LOST', 'ARCHIVED'],
      CONTACTED: ['QUALIFIED', 'VIEWING_SCHEDULED', 'LOST', 'ARCHIVED'],
      QUALIFIED: ['VIEWING_SCHEDULED', 'NEGOTIATING', 'LOST', 'ARCHIVED'],
      VIEWING_SCHEDULED: ['QUALIFIED', 'NEGOTIATING', 'LOST', 'ARCHIVED'],
      NEGOTIATING: ['VIEWING_SCHEDULED', 'WON', 'LOST', 'ARCHIVED'],
      WON: ['ARCHIVED'],
      LOST: ['CONTACTED', 'ARCHIVED'], // Allow re-opening lost leads
      ARCHIVED: [], // Cannot transition from archived
    };

    const allowedTransitions = validTransitions[currentStatus] ?? [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }

  /**
   * Build filter options from query
   */
  private buildFilterOptions(filters: Partial<LeadQueryDto>): LeadFilterOptions {
    const filterOptions: LeadFilterOptions = {};

    if (filters.property_id) {
      filterOptions.property_id = new mongoose.Types.ObjectId(filters.property_id);
    }
    if (filters.agency_id) {
      filterOptions.agency_id = new mongoose.Types.ObjectId(filters.agency_id);
    }
    if (filters.assigned_to) {
      filterOptions.assigned_to = new mongoose.Types.ObjectId(filters.assigned_to);
    }
    if (filters.status) {
      filterOptions.status = filters.status;
    }
    if (filters.priority) {
      filterOptions.priority = filters.priority;
    }
    if (filters.inquiry_type) {
      filterOptions.inquiry_type = filters.inquiry_type;
    }
    if (filters.source) {
      filterOptions.source = filters.source;
    }
    if (filters.date_from) {
      filterOptions.date_from = new Date(filters.date_from);
    }
    if (filters.date_to) {
      filterOptions.date_to = new Date(filters.date_to);
    }

    return filterOptions;
  }

  /**
   * Map lead document to response DTO
   */
  private mapToResponseDto(lead: ILead): LeadResponseDto {
    const dto: LeadResponseDto = {
      id: lead._id.toString(),
      property: {
        id: lead.property_id?.toString() ?? '',
        external_id: '',
        title: '',
        address: '',
        price: 0,
        currency: 'CHF',
      },
      contact: {
        first_name: lead.contact_first_name,
        last_name: lead.contact_last_name,
        email: lead.contact_email,
        phone: lead.contact_phone,
        preferred_contact_method: lead.preferred_contact_method,
        preferred_language: lead.preferred_language,
      },
      inquiry_type: lead.inquiry_type,
      message: lead.message,
      status: lead.status,
      priority: lead.priority,
      source: lead.source,
      viewing_scheduled_at: lead.viewing_scheduled_at?.toISOString(),
      follow_up_date: lead.follow_up_date?.toISOString(),
      notes_count: lead.notes?.length ?? 0,
      created_at: lead.created_at.toISOString(),
      updated_at: lead.updated_at.toISOString(),
    };

    // Add optional IDs
    if (lead.user_id) {
      dto.user_id = lead.user_id.toString();
    }

    // Add populated property if available
    if (
      lead.property_id &&
      typeof lead.property_id === 'object' &&
      'external_id' in lead.property_id
    ) {
      const populatedProperty = lead.property_id as unknown as {
        _id: mongoose.Types.ObjectId;
        external_id: string;
        address: string;
        price: number;
        currency: string;
      };
      dto.property = {
        id: populatedProperty._id.toString(),
        external_id: populatedProperty.external_id,
        title: '',
        address: populatedProperty.address,
        price: populatedProperty.price,
        currency: populatedProperty.currency,
      };
    }

    // Add agency if available
    if (lead.agency_id) {
      if (typeof lead.agency_id === 'object' && 'name' in lead.agency_id) {
        const populatedAgency = lead.agency_id as unknown as {
          _id: mongoose.Types.ObjectId;
          name: string;
          slug: string;
        };
        dto.agency = {
          id: populatedAgency._id.toString(),
          name: populatedAgency.name,
          slug: populatedAgency.slug,
        };
      } else {
        dto.agency = {
          id: lead.agency_id.toString(),
          name: '',
          slug: '',
        };
      }
    }

    // Add assigned_to if available
    if (lead.assigned_to) {
      if (typeof lead.assigned_to === 'object' && 'first_name' in lead.assigned_to) {
        const populatedAssignee = lead.assigned_to as unknown as {
          _id: mongoose.Types.ObjectId;
          first_name: string;
          last_name: string;
        };
        dto.assigned_to = {
          id: populatedAssignee._id.toString(),
          name: `${populatedAssignee.first_name} ${populatedAssignee.last_name}`.trim(),
        };
      } else {
        dto.assigned_to = {
          id: lead.assigned_to.toString(),
          name: '',
        };
      }
    }

    // Add notes if populated
    if (lead.notes && lead.notes.length > 0) {
      dto.notes = lead.notes.map((note) => ({
        id: note._id.toString(),
        content: note.content,
        is_internal: note.is_internal,
        created_by: {
          id: note.created_by?.toString() ?? '',
          name: '',
        },
        created_at: note.created_at.toISOString(),
      }));
    }

    return dto;
  }
}
