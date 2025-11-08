import mongoose, { FilterQuery, SortOrder } from 'mongoose';
import { Permission, IPermission } from './permission.model.js';
import {
  PermissionQueryDto,
  PermissionCreateDto,
  PermissionUpdateDto,
  PermissionFilterOptions,
} from './permission.types.js';

/**
 * Permission Repository
 * Handles all database operations for permissions
 */
export class PermissionRepository {
  /**
   * Find all permissions with filtering, sorting, and pagination
   */
  async findAll(query: PermissionQueryDto): Promise<{ permissions: IPermission[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sort = 'resource',
      order = 'asc',
      search,
      resource,
      action,
      is_active,
    } = query;

    const filter: FilterQuery<IPermission> = {};

    // Apply filters
    if (resource) {
      filter.resource = resource.toLowerCase();
    }

    if (action) {
      filter.action = action.toLowerCase();
    }

    if (is_active !== undefined) {
      filter.is_active = is_active;
    }

    // Search filter (search in name and display_name)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$or = [
        { name: searchRegex },
        { 'display_name.en': searchRegex },
        { 'display_name.fr': searchRegex },
        { 'display_name.de': searchRegex },
        { 'display_name.it': searchRegex },
      ];
    }

    // Build sort object
    const sortObj: Record<string, SortOrder> = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [permissions, total] = await Promise.all([
      Permission.find(filter).sort(sortObj).skip(skip).limit(limit).lean().exec(),
      Permission.countDocuments(filter),
    ]);

    return { permissions: permissions as unknown as IPermission[], total };
  }

  /**
   * Find permission by ID
   */
  async findById(id: string): Promise<IPermission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Permission.findById(id).lean().exec() as unknown as Promise<IPermission | null>;
  }

  /**
   * Find permission by name (code)
   */
  async findByName(name: string): Promise<IPermission | null> {
    return Permission.findOne({ name: name.toLowerCase() })
      .lean()
      .exec() as unknown as Promise<IPermission | null>;
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<IPermission[]> {
    return Permission.find({ resource: resource.toLowerCase(), is_active: true })
      .sort({ action: 1 })
      .lean()
      .exec() as unknown as Promise<IPermission[]>;
  }

  /**
   * Find permissions by multiple IDs
   */
  async findByIds(ids: string[]): Promise<IPermission[]> {
    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    return Permission.find({ _id: { $in: validIds } })
      .lean()
      .exec() as unknown as Promise<IPermission[]>;
  }

  /**
   * Find permissions by names (codes)
   */
  async findByNames(names: string[]): Promise<IPermission[]> {
    const lowercaseNames = names.map((n) => n.toLowerCase());
    return Permission.find({ name: { $in: lowercaseNames }, is_active: true })
      .lean()
      .exec() as unknown as Promise<IPermission[]>;
  }

  /**
   * Get all unique resources
   */
  async getUniqueResources(): Promise<string[]> {
    return Permission.distinct('resource', { is_active: true }).exec();
  }

  /**
   * Get permissions grouped by resource
   */
  async getGroupedByResource(): Promise<Record<string, IPermission[]>> {
    const permissions = await Permission.find({ is_active: true })
      .sort({ resource: 1, action: 1 })
      .lean()
      .exec();

    const grouped: Record<string, IPermission[]> = {};
    for (const permission of permissions) {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission as unknown as IPermission);
    }

    return grouped;
  }

  /**
   * Create a new permission
   */
  async create(data: PermissionCreateDto): Promise<IPermission> {
    const permission = new Permission({
      ...data,
      name: data.name.toLowerCase(),
      resource: data.resource.toLowerCase(),
      action: data.action.toLowerCase(),
    });
    const saved = await permission.save();
    return saved.toObject() as IPermission;
  }

  /**
   * Update a permission
   */
  async update(id: string, data: PermissionUpdateDto): Promise<IPermission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.name) {
      updateData.name = data.name.toLowerCase();
    }
    if (data.resource) {
      updateData.resource = data.resource.toLowerCase();
    }
    if (data.action) {
      updateData.action = data.action.toLowerCase();
    }

    // Handle partial multilingual updates
    if (data.display_name) {
      for (const [lang, value] of Object.entries(data.display_name)) {
        updateData[`display_name.${lang}`] = value;
      }
      delete updateData.display_name;
    }

    if (data.description) {
      for (const [lang, value] of Object.entries(data.description)) {
        updateData[`description.${lang}`] = value;
      }
      delete updateData.description;
    }

    return Permission.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .lean()
      .exec() as Promise<IPermission | null>;
  }

  /**
   * Delete a permission (soft delete by setting is_active to false)
   */
  async softDelete(id: string): Promise<IPermission | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return Permission.findByIdAndUpdate(id, { $set: { is_active: false } }, { new: true })
      .lean()
      .exec() as Promise<IPermission | null>;
  }

  /**
   * Hard delete a permission
   */
  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    const result = await Permission.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  /**
   * Check if permission name exists
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const filter: FilterQuery<IPermission> = { name: name.toLowerCase() };
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: excludeId };
    }
    const count = await Permission.countDocuments(filter);
    return count > 0;
  }

  /**
   * Count permissions with optional filter
   */
  async count(filter?: PermissionFilterOptions): Promise<number> {
    const query: FilterQuery<IPermission> = {};

    if (filter?.resource) {
      query.resource = filter.resource.toLowerCase();
    }
    if (filter?.action) {
      query.action = filter.action.toLowerCase();
    }
    if (filter?.is_active !== undefined) {
      query.is_active = filter.is_active;
    }

    return Permission.countDocuments(query);
  }

  /**
   * Get all active permissions
   */
  async findAllActive(): Promise<IPermission[]> {
    return Permission.find({ is_active: true })
      .sort({ resource: 1, action: 1 })
      .lean()
      .exec() as unknown as Promise<IPermission[]>;
  }
}

// Export singleton instance
export const permissionRepository = new PermissionRepository();
