import mongoose, { PipelineStage } from 'mongoose';
import { Lead, ILead, ILeadNote } from './lead.model.js';
import {
  LeadFilterOptions,
  LeadSortOption,
  LeadStatus,
  LeadPriority,
  LeadInquiryType,
  LeadSource,
  LEAD_STATUS,
  LEAD_PRIORITY,
} from './lead.types.js';


/**
 * Lead Repository
 * Handles all database operations for leads
 */
export class LeadRepository {
  /**
   * Create a new lead
   */
  async create(data: Partial<ILead>): Promise<ILead> {
    const lead = new Lead(data);
    await lead.save();
    return lead;
  }

  /**
   * Find lead by ID
   */
  async findById(id: string): Promise<ILead | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Lead.findById(id)
      .populate('property_id', 'external_id address price currency')
      .populate('agency_id', 'name slug')
      .populate('user_id', 'first_name last_name email')
      .populate('assigned_to', 'first_name last_name')
      .populate('notes.created_by', 'first_name last_name')
      .exec();
  }

  /**
   * Find lead by ID with minimal population (for internal use)
   */
  async findByIdLean(id: string): Promise<ILead | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Lead.findById(id).exec();
  }

  /**
   * Find leads with filters and pagination
   */
  async findAll(
    filters: LeadFilterOptions,
    page: number = 1,
    limit: number = 20,
    sort: LeadSortOption = 'created_at_desc'
  ): Promise<{ leads: ILead[]; total: number }> {
    const query = this.buildFilterQuery(filters);
    const sortOptions = this.buildSortOptions(sort);

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('property_id', 'external_id address price currency')
        .populate('agency_id', 'name slug')
        .populate('user_id', 'first_name last_name email')
        .populate('assigned_to', 'first_name last_name')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Lead.countDocuments(query),
    ]);

    return { leads, total };
  }

  /**
   * Find leads by property ID
   */
  async findByPropertyId(
    propertyId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ leads: ILead[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return { leads: [], total: 0 };
    }

    const query = { property_id: new mongoose.Types.ObjectId(propertyId) };

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('user_id', 'first_name last_name email')
        .populate('assigned_to', 'first_name last_name')
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Lead.countDocuments(query),
    ]);

    return { leads, total };
  }

  /**
   * Find leads by agency ID
   */
  async findByAgencyId(
    agencyId: string,
    filters: LeadFilterOptions,
    page: number = 1,
    limit: number = 20,
    sort: LeadSortOption = 'created_at_desc'
  ): Promise<{ leads: ILead[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(agencyId)) {
      return { leads: [], total: 0 };
    }

    const query = this.buildFilterQuery({
      ...filters,
      agency_id: new mongoose.Types.ObjectId(agencyId),
    });
    const sortOptions = this.buildSortOptions(sort);

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('property_id', 'external_id address price currency')
        .populate('user_id', 'first_name last_name email')
        .populate('assigned_to', 'first_name last_name')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Lead.countDocuments(query),
    ]);

    return { leads, total };
  }

  /**
   * Find leads by user ID (customer who created the lead)
   */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ leads: ILead[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return { leads: [], total: 0 };
    }

    const query = { user_id: new mongoose.Types.ObjectId(userId) };

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('property_id', 'external_id address price currency')
        .populate('agency_id', 'name slug')
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Lead.countDocuments(query),
    ]);

    return { leads, total };
  }

  /**
   * Find leads assigned to a specific user (agent)
   */
  async findByAssignedTo(
    assignedTo: string,
    filters: LeadFilterOptions,
    page: number = 1,
    limit: number = 20,
    sort: LeadSortOption = 'created_at_desc'
  ): Promise<{ leads: ILead[]; total: number }> {
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return { leads: [], total: 0 };
    }

    const query = this.buildFilterQuery({
      ...filters,
      assigned_to: new mongoose.Types.ObjectId(assignedTo),
    });
    const sortOptions = this.buildSortOptions(sort);

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('property_id', 'external_id address price currency')
        .populate('agency_id', 'name slug')
        .populate('user_id', 'first_name last_name email')
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Lead.countDocuments(query),
    ]);

    return { leads, total };
  }

  /**
   * Update lead
   */
  async update(id: string, data: Partial<ILead>): Promise<ILead | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Lead.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true })
      .populate('property_id', 'external_id address price currency')
      .populate('agency_id', 'name slug')
      .populate('user_id', 'first_name last_name email')
      .populate('assigned_to', 'first_name last_name')
      .populate('notes.created_by', 'first_name last_name')
      .exec();
  }

  /**
   * Update lead status
   */
  async updateStatus(id: string, status: LeadStatus, _userId?: string): Promise<ILead | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateData: Record<string, unknown> = { status };

    // Track first response time
    if (status !== 'NEW') {
      const lead = await Lead.findById(id);
      if (lead && !lead.first_response_at) {
        updateData.first_response_at = new Date();
      }
    }

    // Track closure
    if (status === 'WON' || status === 'LOST' || status === 'ARCHIVED') {
      updateData.closed_at = new Date();
    }

    return Lead.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true })
      .populate('property_id', 'external_id address price currency')
      .populate('agency_id', 'name slug')
      .exec();
  }

  /**
   * Add note to lead
   */
  async addNote(
    leadId: string,
    content: string,
    createdBy: string,
    isInternal: boolean = true
  ): Promise<ILead | null> {
    if (!mongoose.Types.ObjectId.isValid(leadId) || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return null;
    }

    const note: ILeadNote = {
      _id: new mongoose.Types.ObjectId(),
      content,
      is_internal: isInternal,
      created_by: new mongoose.Types.ObjectId(createdBy),
      created_at: new Date(),
    };

    return Lead.findByIdAndUpdate(leadId, { $push: { notes: note } }, { new: true })
      .populate('property_id', 'external_id address price currency')
      .populate('agency_id', 'name slug')
      .populate('notes.created_by', 'first_name last_name')
      .exec();
  }

  /**
   * Delete lead
   */
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await Lead.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Get lead statistics
   */
  async getStatistics(
    agencyId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<{
    total: number;
    byStatus: { status: LeadStatus; count: number }[];
    byPriority: { priority: LeadPriority; count: number }[];
    byInquiryType: { inquiry_type: LeadInquiryType; count: number }[];
    bySource: { source: LeadSource; count: number }[];
    avgResponseTimeHours: number | null;
    conversionRate: number;
  }> {
    const matchStage: Record<string, unknown> = {};

    if (agencyId && mongoose.Types.ObjectId.isValid(agencyId)) {
      matchStage.agency_id = new mongoose.Types.ObjectId(agencyId);
    }

    if (dateFrom || dateTo) {
      matchStage.created_at = {};
      if (dateFrom) {
        (matchStage.created_at as Record<string, Date>).$gte = dateFrom;
      }
      if (dateTo) {
        (matchStage.created_at as Record<string, Date>).$lte = dateTo;
      }
    }

    const pipeline: PipelineStage[] = [
      ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
          byPriority: [{ $group: { _id: '$priority', count: { $sum: 1 } } }],
          byInquiryType: [{ $group: { _id: '$inquiry_type', count: { $sum: 1 } } }],
          bySource: [{ $group: { _id: '$source', count: { $sum: 1 } } }],
          responseTime: [
            {
              $match: {
                first_response_at: { $exists: true },
              },
            },
            {
              $project: {
                responseTime: {
                  $divide: [
                    { $subtract: ['$first_response_at', '$created_at'] },
                    1000 * 60 * 60, // Convert to hours
                  ],
                },
              },
            },
            {
              $group: {
                _id: null,
                avgResponseTime: { $avg: '$responseTime' },
              },
            },
          ],
          conversions: [
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                won: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'WON'] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Lead.aggregate(pipeline);

    const total = result.total[0]?.count || 0;

    // Fill in all statuses with 0 count if not present
    const byStatusMap = new Map<string, number>(
      result.byStatus.map((s: { _id: string; count: number }) => [s._id, s.count])
    );
    const byStatus = LEAD_STATUS.map((status) => ({
      status,
      count: byStatusMap.get(status) || 0,
    }));

    // Fill in all priorities with 0 count if not present
    const byPriorityMap = new Map<string, number>(
      result.byPriority.map((p: { _id: string; count: number }) => [p._id, p.count])
    );
    const byPriority = LEAD_PRIORITY.map((priority) => ({
      priority,
      count: byPriorityMap.get(priority) || 0,
    }));

    return {
      total,
      byStatus,
      byPriority,
      byInquiryType: result.byInquiryType.map((i: { _id: string; count: number }) => ({
        inquiry_type: i._id as LeadInquiryType,
        count: i.count,
      })),
      bySource: result.bySource.map((s: { _id: string; count: number }) => ({
        source: s._id as LeadSource,
        count: s.count,
      })),
      avgResponseTimeHours: result.responseTime[0]?.avgResponseTime
        ? Math.round(result.responseTime[0].avgResponseTime * 100) / 100
        : null,
      conversionRate: result.conversions[0]
        ? Math.round((result.conversions[0].won / result.conversions[0].total) * 100 * 100) / 100
        : 0,
    };
  }

  /**
   * Get leads requiring follow-up
   */
  async getFollowUpRequired(
    agencyId?: string,
    assignedTo?: string,
    limit: number = 20
  ): Promise<ILead[]> {
    const query: Record<string, unknown> = {
      follow_up_date: { $lte: new Date() },
      status: { $nin: ['WON', 'LOST', 'ARCHIVED'] },
    };

    if (agencyId && mongoose.Types.ObjectId.isValid(agencyId)) {
      query.agency_id = new mongoose.Types.ObjectId(agencyId);
    }

    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      query.assigned_to = new mongoose.Types.ObjectId(assignedTo);
    }

    return Lead.find(query)
      .populate('property_id', 'external_id address price currency')
      .populate('agency_id', 'name slug')
      .sort({ follow_up_date: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * Check if user already submitted a lead for a property
   */
  async checkExistingLead(
    propertyId: string,
    email: string,
    withinDays: number = 7
  ): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return false;
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - withinDays);

    const existingLead = await Lead.findOne({
      property_id: new mongoose.Types.ObjectId(propertyId),
      contact_email: email.toLowerCase(),
      created_at: { $gte: dateThreshold },
    }).exec();

    return !!existingLead;
  }

  /**
   * Build filter query from options
   */
  private buildFilterQuery(filters: LeadFilterOptions): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters.property_id) {
      query.property_id = filters.property_id;
    }

    if (filters.agency_id) {
      query.agency_id = filters.agency_id;
    }

    if (filters.user_id) {
      query.user_id = filters.user_id;
    }

    if (filters.assigned_to) {
      query.assigned_to = filters.assigned_to;
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status };
      } else {
        query.status = filters.status;
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query.priority = { $in: filters.priority };
      } else {
        query.priority = filters.priority;
      }
    }

    if (filters.inquiry_type) {
      if (Array.isArray(filters.inquiry_type)) {
        query.inquiry_type = { $in: filters.inquiry_type };
      } else {
        query.inquiry_type = filters.inquiry_type;
      }
    }

    if (filters.source) {
      if (Array.isArray(filters.source)) {
        query.source = { $in: filters.source };
      } else {
        query.source = filters.source;
      }
    }

    if (filters.date_from || filters.date_to) {
      query.created_at = {};
      if (filters.date_from) {
        (query.created_at as Record<string, Date>).$gte = filters.date_from;
      }
      if (filters.date_to) {
        (query.created_at as Record<string, Date>).$lte = filters.date_to;
      }
    }

    return query;
  }

  /**
   * Build sort options
   */
  private buildSortOptions(sort: LeadSortOption): Record<string, 1 | -1> {
    const sortMap: Record<LeadSortOption, Record<string, 1 | -1>> = {
      created_at_asc: { created_at: 1 },
      created_at_desc: { created_at: -1 },
      updated_at_asc: { updated_at: 1 },
      updated_at_desc: { updated_at: -1 },
      priority_asc: { priority: 1, created_at: -1 },
      priority_desc: { priority: -1, created_at: -1 },
      status_asc: { status: 1, created_at: -1 },
      status_desc: { status: -1, created_at: -1 },
    };

    return sortMap[sort] || { created_at: -1 };
  }
}
