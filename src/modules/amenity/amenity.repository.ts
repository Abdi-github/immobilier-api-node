import { Amenity, IAmenity } from './amenity.model.js';
import {
  AmenityQueryDto,
  AmenityCreateDto,
  AmenityUpdateDto,
  PaginationDto,
} from './amenity.types.js';

/**
 * Amenity Repository
 * Data access layer for Amenities
 */
export class AmenityRepository {
  /**
   * Find all amenities with filtering, sorting, and pagination
   */
  async findAll(
    query: AmenityQueryDto
  ): Promise<{ amenities: IAmenity[]; pagination: PaginationDto }> {
    const { page = 1, limit = 50, sort = 'sort_order', is_active, group, search } = query;

    // Build filter - by default only show active amenities unless explicitly filtered
    const filter: Record<string, unknown> = {};

    // Default to showing only active amenities if not explicitly specified
    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    } else {
      filter.is_active = true;
    }

    if (group) {
      filter.group = group;
    }

    if (search) {
      filter.$or = [
        { 'name.en': new RegExp(search, 'i') },
        { 'name.fr': new RegExp(search, 'i') },
        { 'name.de': new RegExp(search, 'i') },
        { 'name.it': new RegExp(search, 'i') },
      ];
    }

    // Count total
    const total = await Amenity.countDocuments(filter);

    // Build sort
    const sortObj: Record<string, 1 | -1> = {};
    if (sort.startsWith('-')) {
      sortObj[sort.slice(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }

    // Execute query
    const amenities = await Amenity.find(filter)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IAmenity[]>()
      .exec();

    // Build pagination
    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationDto = {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return { amenities, pagination };
  }

  /**
   * Find amenity by ID
   */
  async findById(id: string): Promise<IAmenity | null> {
    return Amenity.findById(id).lean<IAmenity>().exec();
  }

  /**
   * Find amenities by group
   */
  async findByGroup(group: string): Promise<IAmenity[]> {
    return Amenity.find({ group, is_active: true })
      .sort({ sort_order: 1 })
      .lean<IAmenity[]>()
      .exec();
  }

  /**
   * Create an amenity
   */
  async create(data: AmenityCreateDto): Promise<IAmenity> {
    const amenity = new Amenity({
      name: data.name,
      group: data.group,
      icon: data.icon,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    });
    await amenity.save();
    return amenity.toObject();
  }

  /**
   * Update an amenity
   */
  async update(id: string, data: AmenityUpdateDto): Promise<IAmenity | null> {
    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.group !== undefined) {
      updateData.group = data.group;
    }
    if (data.icon !== undefined) {
      updateData.icon = data.icon;
    }
    if (data.sort_order !== undefined) {
      updateData.sort_order = data.sort_order;
    }
    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    return Amenity.findByIdAndUpdate(id, updateData, { new: true }).lean<IAmenity>().exec();
  }

  /**
   * Delete an amenity
   */
  async delete(id: string): Promise<boolean> {
    const result = await Amenity.findByIdAndDelete(id).exec();
    return result !== null;
  }

  /**
   * Check if amenity exists
   */
  async exists(id: string): Promise<boolean> {
    const count = await Amenity.countDocuments({ _id: id });
    return count > 0;
  }

  /**
   * Count amenities (for validation)
   */
  async count(filter: Record<string, unknown> = {}): Promise<number> {
    return Amenity.countDocuments(filter);
  }
}

// Export singleton instance
export const amenityRepository = new AmenityRepository();
