import mongoose from 'mongoose';
import { Agency, IAgency } from './agency.model.js';
import {
  AgencyFilterOptions,
  AgencyPaginationOptions,
  AgencyFindResult,
  AgencyWithLocation,
  AgencyCreateDto,
  AgencyUpdateDto,
} from './agency.types.js';

/**
 * Agency Repository
 * Handles all database operations for agencies
 */
export class AgencyRepository {
  /**
   * Find all agencies with filtering and pagination
   */
  async findAll(
    filters: AgencyFilterOptions,
    pagination: AgencyPaginationOptions,
    includeInactive = false
  ): Promise<AgencyFindResult> {
    const query: Record<string, unknown> = {};

    // Status filter
    if (filters.status) {
      query.status = filters.status;
    } else if (!includeInactive) {
      query.status = 'active';
    }

    // Verified filter
    if (filters.is_verified !== undefined) {
      query.is_verified = filters.is_verified;
    }

    // Canton filter
    if (filters.canton_id) {
      query.canton_id = new mongoose.Types.ObjectId(filters.canton_id);
    }

    // City filter
    if (filters.city_id) {
      query.city_id = new mongoose.Types.ObjectId(filters.city_id);
    }

    // Search filter (name, address)
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [{ name: searchRegex }, { address: searchRegex }];
    }

    // Build sort
    const sortOrder = pagination.order === 'desc' ? -1 : 1;
    const sort: Record<string, 1 | -1> = {
      [pagination.sort]: sortOrder,
    };

    // Get total count
    const total = await Agency.countDocuments(query);

    // Get paginated results with population
    const agencies = await Agency.find(query)
      .populate('city_id', '_id name')
      .populate('canton_id', '_id name code')
      .sort(sort)
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .lean<AgencyWithLocation[]>();

    return { agencies, total };
  }

  /**
   * Find agency by ID
   */
  async findById(id: string): Promise<AgencyWithLocation | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const agency = await Agency.findById(id)
      .populate('city_id', '_id name')
      .populate('canton_id', '_id name code')
      .lean<AgencyWithLocation>();

    return agency;
  }

  /**
   * Find agency by slug
   */
  async findBySlug(slug: string): Promise<AgencyWithLocation | null> {
    const agency = await Agency.findOne({ slug })
      .populate('city_id', '_id name')
      .populate('canton_id', '_id name code')
      .lean<AgencyWithLocation>();

    return agency;
  }

  /**
   * Find agencies by canton
   */
  async findByCanton(
    cantonId: string,
    pagination: AgencyPaginationOptions
  ): Promise<AgencyFindResult> {
    return this.findAll({ canton_id: cantonId }, pagination);
  }

  /**
   * Find agencies by city
   */
  async findByCity(cityId: string, pagination: AgencyPaginationOptions): Promise<AgencyFindResult> {
    return this.findAll({ city_id: cityId }, pagination);
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, unknown> = { slug };
    if (excludeId) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await Agency.countDocuments(query);
    return count > 0;
  }

  /**
   * Create a new agency
   */
  async create(data: AgencyCreateDto): Promise<IAgency> {
    const agency = new Agency({
      ...data,
      city_id: new mongoose.Types.ObjectId(data.city_id),
      canton_id: new mongoose.Types.ObjectId(data.canton_id),
    });
    return agency.save();
  }

  /**
   * Update an agency
   */
  async update(id: string, data: AgencyUpdateDto): Promise<IAgency | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateData: Record<string, unknown> = { ...data };

    // Convert string IDs to ObjectIds if present
    if (data.city_id) {
      updateData.city_id = new mongoose.Types.ObjectId(data.city_id);
    }
    if (data.canton_id) {
      updateData.canton_id = new mongoose.Types.ObjectId(data.canton_id);
    }

    const agency = await Agency.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    return agency;
  }

  /**
   * Delete an agency (hard delete)
   */
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await Agency.findByIdAndDelete(id);
    return result !== null;
  }

  /**
   * Verify an agency
   */
  async verify(id: string): Promise<IAgency | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Agency.findByIdAndUpdate(
      id,
      {
        is_verified: true,
        verification_date: new Date(),
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Unverify an agency
   */
  async unverify(id: string): Promise<IAgency | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Agency.findByIdAndUpdate(
      id,
      {
        is_verified: false,
        $unset: { verification_date: 1 },
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update agency status
   */
  async updateStatus(
    id: string,
    status: 'active' | 'pending' | 'suspended' | 'inactive'
  ): Promise<IAgency | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Agency.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
  }

  /**
   * Increment total properties count
   */
  async incrementPropertyCount(id: string): Promise<IAgency | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Agency.findByIdAndUpdate(id, { $inc: { total_properties: 1 } }, { new: true });
  }

  /**
   * Decrement total properties count
   */
  async decrementPropertyCount(id: string): Promise<IAgency | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    return Agency.findByIdAndUpdate(id, { $inc: { total_properties: -1 } }, { new: true });
  }

  /**
   * Count agencies by status
   */
  async countByStatus(): Promise<Record<string, number>> {
    const result = await Agency.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const counts: Record<string, number> = {
      active: 0,
      pending: 0,
      suspended: 0,
      inactive: 0,
    };

    for (const item of result) {
      counts[item._id] = item.count;
    }

    return counts;
  }

  /**
   * Count total agencies
   */
  async count(filters?: AgencyFilterOptions): Promise<number> {
    const query: Record<string, unknown> = {};

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.is_verified !== undefined) {
      query.is_verified = filters.is_verified;
    }
    if (filters?.canton_id) {
      query.canton_id = new mongoose.Types.ObjectId(filters.canton_id);
    }
    if (filters?.city_id) {
      query.city_id = new mongoose.Types.ObjectId(filters.city_id);
    }

    return Agency.countDocuments(query);
  }

  /**
   * Check if ID exists
   */
  async exists(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }

    const count = await Agency.countDocuments({
      _id: new mongoose.Types.ObjectId(id),
    });
    return count > 0;
  }
}

// Export singleton instance
export const agencyRepository = new AgencyRepository();
