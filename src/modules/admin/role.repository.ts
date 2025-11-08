import { Role, IRole } from './role.model.js';
import { RoleQueryDto, RoleCreateDto, RoleUpdateDto } from './role.types.js';
import mongoose, { FilterQuery, SortOrder } from 'mongoose';

/**
 * Role Repository - Data access layer for roles
 */
export class RoleRepository {
  /**
   * Find all roles with pagination and filtering
   */
  async findAll(query: RoleQueryDto): Promise<{ data: IRole[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      sort = 'name',
      order = 'asc',
      search,
      is_system,
      is_active,
      include_permissions = false,
    } = query;

    const filter: FilterQuery<IRole> = {};

    // Apply filters
    if (typeof is_system === 'boolean') {
      filter.is_system = is_system;
    }

    if (typeof is_active === 'boolean') {
      filter.is_active = is_active;
    }

    // Search by name or display_name
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'display_name.en': { $regex: search, $options: 'i' } },
        { 'display_name.fr': { $regex: search, $options: 'i' } },
        { 'display_name.de': { $regex: search, $options: 'i' } },
        { 'display_name.it': { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: { [key: string]: SortOrder } = {
      [sort]: order === 'desc' ? -1 : 1,
    };

    const skip = (page - 1) * limit;

    let queryBuilder = Role.find(filter).sort(sortOptions).skip(skip).limit(limit);

    // Optionally populate permissions
    if (include_permissions) {
      queryBuilder = queryBuilder.populate('permissions');
    }

    const [data, total] = await Promise.all([queryBuilder.exec(), Role.countDocuments(filter)]);

    return { data, total };
  }

  /**
   * Find role by ID
   */
  async findById(id: string, includePermissions = false): Promise<IRole | null> {
    let query = Role.findById(id);
    if (includePermissions) {
      query = query.populate('permissions');
    }
    return query.exec();
  }

  /**
   * Find role by name
   */
  async findByName(name: string, includePermissions = false): Promise<IRole | null> {
    let query = Role.findOne({ name: name.toLowerCase() });
    if (includePermissions) {
      query = query.populate('permissions');
    }
    return query.exec();
  }

  /**
   * Find multiple roles by IDs
   */
  async findByIds(ids: string[], includePermissions = false): Promise<IRole[]> {
    let query = Role.find({
      _id: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) },
    });
    if (includePermissions) {
      query = query.populate('permissions');
    }
    return query.exec();
  }

  /**
   * Find roles by names
   */
  async findByNames(names: string[], includePermissions = false): Promise<IRole[]> {
    let query = Role.find({
      name: { $in: names.map((n) => n.toLowerCase()) },
    });
    if (includePermissions) {
      query = query.populate('permissions');
    }
    return query.exec();
  }

  /**
   * Create a new role
   */
  async create(data: RoleCreateDto): Promise<IRole> {
    const role = new Role({
      name: data.name.toLowerCase(),
      display_name: data.display_name,
      description: data.description,
      permissions: data.permissions?.map((id) => new mongoose.Types.ObjectId(id)) || [],
      is_system: data.is_system ?? false,
      is_active: data.is_active ?? true,
    });

    return role.save();
  }

  /**
   * Update a role
   */
  async update(id: string, data: RoleUpdateDto): Promise<IRole | null> {
    const updateData: Partial<Record<string, unknown>> = {};

    if (data.name !== undefined) {
      updateData.name = data.name.toLowerCase();
    }

    if (data.display_name !== undefined) {
      // Merge with existing display_name
      updateData['display_name'] = data.display_name;
    }

    if (data.description !== undefined) {
      // Merge with existing description
      updateData['description'] = data.description;
    }

    if (data.permissions !== undefined) {
      updateData.permissions = data.permissions.map((id) => new mongoose.Types.ObjectId(id));
    }

    if (data.is_system !== undefined) {
      updateData.is_system = data.is_system;
    }

    if (data.is_active !== undefined) {
      updateData.is_active = data.is_active;
    }

    return Role.findByIdAndUpdate(id, { $set: updateData }, { new: true }).exec();
  }

  /**
   * Delete a role
   */
  async delete(id: string): Promise<IRole | null> {
    return Role.findByIdAndDelete(id).exec();
  }

  /**
   * Assign permissions to a role (add to existing)
   */
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<IRole | null> {
    return Role.findByIdAndUpdate(
      roleId,
      {
        $addToSet: {
          permissions: {
            $each: permissionIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      { new: true }
    )
      .populate('permissions')
      .exec();
  }

  /**
   * Revoke permissions from a role
   */
  async revokePermissions(roleId: string, permissionIds: string[]): Promise<IRole | null> {
    return Role.findByIdAndUpdate(
      roleId,
      {
        $pull: {
          permissions: {
            $in: permissionIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      { new: true }
    )
      .populate('permissions')
      .exec();
  }

  /**
   * Set permissions for a role (replace all)
   */
  async setPermissions(roleId: string, permissionIds: string[]): Promise<IRole | null> {
    return Role.findByIdAndUpdate(
      roleId,
      {
        $set: {
          permissions: permissionIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
      { new: true }
    )
      .populate('permissions')
      .exec();
  }

  /**
   * Count documents matching filter
   */
  async countDocuments(filter: FilterQuery<IRole> = {}): Promise<number> {
    return Role.countDocuments(filter).exec();
  }

  /**
   * Check if role name exists (excluding a specific ID)
   */
  async nameExists(name: string, excludeId?: string): Promise<boolean> {
    const filter: FilterQuery<IRole> = { name: name.toLowerCase() };
    if (excludeId) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }
    const count = await Role.countDocuments(filter).exec();
    return count > 0;
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<mongoose.Types.ObjectId[]> {
    const role = await Role.findById(roleId).select('permissions').exec();
    return role?.permissions || [];
  }

  /**
   * Check if role has a specific permission
   */
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const role = await Role.findOne({
      _id: new mongoose.Types.ObjectId(roleId),
      permissions: new mongoose.Types.ObjectId(permissionId),
    }).exec();
    return !!role;
  }
}
