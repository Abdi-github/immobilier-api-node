import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { Alert, IAlert } from './alert.model.js';
import { Favorite, IFavorite } from './favorite.model.js';
import { User, IUser, UserType, UserStatus } from './user.model.js';
import {
  UserFilterOptions,
  UserPaginationOptions,
  UserFindResult,
  UserCreateDto,
  UserProfileUpdateDto,
  UserAdminUpdateDto,
  UserResponseDto,
  FavoriteCreateDto,
  FavoriteResponseDto,
  AlertCreateDto,
  AlertUpdateDto,
  AlertResponseDto,
  UserSettingsResponseDto,
  UserSettingsUpdateDto,
  DashboardStatsResponseDto,
  INotificationPreferences,
} from './user.types.js';

/**
 * User Repository
 * Handles all database operations for users
 */
export class UserRepository {
  /**
   * Build query object from filters
   */
  private buildQuery(filters: UserFilterOptions): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    if (filters.user_type) {
      query.user_type = filters.user_type;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.agency_id) {
      query.agency_id = new mongoose.Types.ObjectId(filters.agency_id);
    }

    if (filters.email_verified !== undefined) {
      query.email_verified = filters.email_verified;
    }

    // Text search
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    return query;
  }

  /**
   * Build sort object
   */
  private buildSort(sort?: string, order?: 'asc' | 'desc'): Record<string, 1 | -1> {
    const sortField = sort || 'created_at';
    const sortOrder = order === 'asc' ? 1 : -1;

    const validSortFields = [
      'created_at',
      'updated_at',
      'email',
      'first_name',
      'last_name',
      'user_type',
      'status',
      'last_login_at',
    ];

    if (!validSortFields.includes(sortField)) {
      return { created_at: -1 };
    }

    return { [sortField]: sortOrder };
  }

  /**
   * Transform user document to response DTO
   */
  private toUserResponseDto(doc: IUser): UserResponseDto {
    const response: UserResponseDto = {
      id: doc._id.toString(),
      email: doc.email,
      first_name: doc.first_name,
      last_name: doc.last_name,
      phone: doc.phone,
      avatar_url: doc.avatar_url,
      user_type: doc.user_type,
      agency_id: doc.agency_id?.toString(),
      preferred_language: doc.preferred_language,
      notification_preferences: doc.notification_preferences,
      status: doc.status,
      email_verified: doc.email_verified,
      email_verified_at: doc.email_verified_at,
      last_login_at: doc.last_login_at,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };

    // Handle populated agency
    const populatedDoc = doc as unknown as {
      agency_id?: {
        _id: mongoose.Types.ObjectId;
        name: string;
        slug: string;
      };
    };

    if (
      populatedDoc.agency_id &&
      typeof populatedDoc.agency_id === 'object' &&
      'name' in populatedDoc.agency_id
    ) {
      response.agency = {
        id: populatedDoc.agency_id._id.toString(),
        name: populatedDoc.agency_id.name,
        slug: populatedDoc.agency_id.slug,
      };
      response.agency_id = populatedDoc.agency_id._id.toString();
    }

    return response;
  }

  /**
   * Transform favorite document to response DTO
   */
  private toFavoriteResponseDto(doc: IFavorite): FavoriteResponseDto {
    const response: FavoriteResponseDto = {
      id: doc._id.toString(),
      user_id: doc.user_id.toString(),
      property_id: doc.property_id.toString(),
      created_at: doc.created_at,
    };

    // Handle populated property
    const populatedDoc = doc as unknown as {
      property_id?: {
        _id: mongoose.Types.ObjectId;
        external_id: string;
        transaction_type: string;
        price: number;
        rooms?: number;
        surface?: number;
        address: string;
        status: string;
      };
    };

    if (
      populatedDoc.property_id &&
      typeof populatedDoc.property_id === 'object' &&
      'external_id' in populatedDoc.property_id
    ) {
      response.property = {
        id: populatedDoc.property_id._id.toString(),
        external_id: populatedDoc.property_id.external_id,
        transaction_type: populatedDoc.property_id.transaction_type,
        price: populatedDoc.property_id.price,
        rooms: populatedDoc.property_id.rooms,
        surface: populatedDoc.property_id.surface,
        address: populatedDoc.property_id.address,
        status: populatedDoc.property_id.status,
      };
      response.property_id = populatedDoc.property_id._id.toString();
    }

    return response;
  }

  /**
   * Transform alert document to response DTO
   */
  private toAlertResponseDto(doc: IAlert): AlertResponseDto {
    return {
      id: doc._id.toString(),
      user_id: doc.user_id.toString(),
      name: doc.name,
      criteria: doc.criteria,
      frequency: doc.frequency,
      is_active: doc.is_active,
      last_sent_at: doc.last_sent_at,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
    };
  }

  // ==========================================
  // User Operations
  // ==========================================

  /**
   * Find all users with pagination and filtering
   */
  async findAll(
    filters: UserFilterOptions,
    pagination: UserPaginationOptions
  ): Promise<UserFindResult> {
    const query = this.buildQuery(filters);
    const sort = this.buildSort(pagination.sort, pagination.order);
    const skip = (pagination.page - 1) * pagination.limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .populate('agency_id', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(pagination.limit)
        .exec(),
      User.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / pagination.limit);

    return {
      users: users.map((u) => this.toUserResponseDto(u)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserResponseDto | null> {
    const user = await User.findById(id).populate('agency_id', 'name slug').exec();

    return user ? this.toUserResponseDto(user) : null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('agency_id', 'name slug')
      .exec();

    return user ? this.toUserResponseDto(user) : null;
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await User.countDocuments({ email: email.toLowerCase() }).exec();
    return count > 0;
  }

  /**
   * Create a new user (admin)
   */
  async create(data: UserCreateDto): Promise<UserResponseDto> {
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = new User({
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      avatar_url: data.avatar_url,
      user_type: data.user_type || 'end_user',
      agency_id: data.agency_id ? new mongoose.Types.ObjectId(data.agency_id) : undefined,
      preferred_language: data.preferred_language || 'en',
      status: data.status || 'active',
      email_verified: false,
    });

    const saved = await user.save();

    const populated = await User.findById(saved._id).populate('agency_id', 'name slug').exec();

    return this.toUserResponseDto(populated!);
  }

  /**
   * Update user profile
   */
  async updateProfile(id: string, data: UserProfileUpdateDto): Promise<UserResponseDto | null> {
    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(data.first_name && { first_name: data.first_name }),
          ...(data.last_name && { last_name: data.last_name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
          ...(data.preferred_language && { preferred_language: data.preferred_language }),
        },
      },
      { new: true, runValidators: true }
    )
      .populate('agency_id', 'name slug')
      .exec();

    return user ? this.toUserResponseDto(user) : null;
  }

  /**
   * Update user (admin)
   */
  async updateAdmin(id: string, data: UserAdminUpdateDto): Promise<UserResponseDto | null> {
    const user = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(data.first_name && { first_name: data.first_name }),
          ...(data.last_name && { last_name: data.last_name }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
          ...(data.user_type && { user_type: data.user_type }),
          ...(data.agency_id !== undefined && {
            agency_id: data.agency_id ? new mongoose.Types.ObjectId(data.agency_id) : undefined,
          }),
          ...(data.preferred_language && { preferred_language: data.preferred_language }),
          ...(data.status && { status: data.status }),
          ...(data.email_verified !== undefined && {
            email_verified: data.email_verified,
            ...(data.email_verified && { email_verified_at: new Date() }),
          }),
        },
      },
      { new: true, runValidators: true }
    )
      .populate('agency_id', 'name slug')
      .exec();

    return user ? this.toUserResponseDto(user) : null;
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus): Promise<UserResponseDto | null> {
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, runValidators: true }
    )
      .populate('agency_id', 'name slug')
      .exec();

    return user ? this.toUserResponseDto(user) : null;
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Count users by type
   */
  async countByType(): Promise<Record<UserType, number>> {
    const result = await User.aggregate([
      { $group: { _id: '$user_type', count: { $sum: 1 } } },
    ]).exec();

    const counts: Record<string, number> = {};
    result.forEach((item) => {
      counts[item._id] = item.count;
    });

    return counts as Record<UserType, number>;
  }

  /**
   * Count users by status
   */
  async countByStatus(): Promise<Record<UserStatus, number>> {
    const result = await User.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();

    const counts: Record<string, number> = {};
    result.forEach((item) => {
      counts[item._id] = item.count;
    });

    return counts as Record<UserStatus, number>;
  }

  // ==========================================
  // Favorites Operations
  // ==========================================

  /**
   * Get user's favorites
   */
  async getFavorites(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ favorites: FavoriteResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [favorites, total] = await Promise.all([
      Favorite.find({ user_id: new mongoose.Types.ObjectId(userId) })
        .populate('property_id', 'external_id transaction_type price rooms surface address status')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Favorite.countDocuments({ user_id: new mongoose.Types.ObjectId(userId) }).exec(),
    ]);

    return {
      favorites: favorites.map((f) => this.toFavoriteResponseDto(f)),
      total,
    };
  }

  /**
   * Add property to favorites
   */
  async addFavorite(data: FavoriteCreateDto): Promise<FavoriteResponseDto> {
    const favorite = new Favorite({
      user_id: new mongoose.Types.ObjectId(data.user_id),
      property_id: new mongoose.Types.ObjectId(data.property_id),
    });

    const saved = await favorite.save();

    const populated = await Favorite.findById(saved._id)
      .populate('property_id', 'external_id transaction_type price rooms surface address status')
      .exec();

    return this.toFavoriteResponseDto(populated!);
  }

  /**
   * Remove property from favorites
   */
  async removeFavorite(userId: string, propertyId: string): Promise<boolean> {
    const result = await Favorite.findOneAndDelete({
      user_id: new mongoose.Types.ObjectId(userId),
      property_id: new mongoose.Types.ObjectId(propertyId),
    }).exec();

    return !!result;
  }

  /**
   * Check if property is in user's favorites
   */
  async isFavorite(userId: string, propertyId: string): Promise<boolean> {
    const count = await Favorite.countDocuments({
      user_id: new mongoose.Types.ObjectId(userId),
      property_id: new mongoose.Types.ObjectId(propertyId),
    }).exec();

    return count > 0;
  }

  /**
   * Get favorite IDs for user
   */
  async getFavoriteIds(userId: string): Promise<string[]> {
    const favorites = await Favorite.find({
      user_id: new mongoose.Types.ObjectId(userId),
    })
      .select('property_id')
      .exec();

    return favorites.map((f) => f.property_id.toString());
  }

  // ==========================================
  // Alerts Operations
  // ==========================================

  /**
   * Get user's alerts
   */
  async getAlerts(
    userId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ alerts: AlertResponseDto[]; total: number }> {
    const skip = (page - 1) * limit;

    const [alerts, total] = await Promise.all([
      Alert.find({ user_id: new mongoose.Types.ObjectId(userId) })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Alert.countDocuments({ user_id: new mongoose.Types.ObjectId(userId) }).exec(),
    ]);

    return {
      alerts: alerts.map((a) => this.toAlertResponseDto(a)),
      total,
    };
  }

  /**
   * Get alert by ID
   */
  async getAlertById(id: string): Promise<AlertResponseDto | null> {
    const alert = await Alert.findById(id).exec();
    return alert ? this.toAlertResponseDto(alert) : null;
  }

  /**
   * Create alert
   */
  async createAlert(data: AlertCreateDto): Promise<AlertResponseDto> {
    const alert = new Alert({
      user_id: new mongoose.Types.ObjectId(data.user_id),
      name: data.name,
      criteria: data.criteria,
      frequency: data.frequency || 'daily',
      is_active: data.is_active ?? true,
    });

    const saved = await alert.save();
    return this.toAlertResponseDto(saved);
  }

  /**
   * Update alert
   */
  async updateAlert(id: string, data: AlertUpdateDto): Promise<AlertResponseDto | null> {
    const alert = await Alert.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(data.name && { name: data.name }),
          ...(data.criteria && { criteria: data.criteria }),
          ...(data.frequency && { frequency: data.frequency }),
          ...(data.is_active !== undefined && { is_active: data.is_active }),
        },
      },
      { new: true, runValidators: true }
    ).exec();

    return alert ? this.toAlertResponseDto(alert) : null;
  }

  /**
   * Delete alert
   */
  async deleteAlert(id: string): Promise<boolean> {
    const result = await Alert.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Toggle alert active status
   */
  async toggleAlert(id: string): Promise<AlertResponseDto | null> {
    const alert = await Alert.findById(id).exec();
    if (!alert) return null;

    alert.is_active = !alert.is_active;
    const saved = await alert.save();

    return this.toAlertResponseDto(saved);
  }

  /**
   * Get active alerts for processing (for alert service)
   */
  async getActiveAlerts(frequency?: string): Promise<AlertResponseDto[]> {
    const query: Record<string, unknown> = { is_active: true };
    if (frequency) {
      query.frequency = frequency;
    }

    const alerts = await Alert.find(query).exec();
    return alerts.map((a) => this.toAlertResponseDto(a));
  }

  /**
   * Update alert last sent timestamp
   */
  async updateAlertLastSent(id: string): Promise<void> {
    await Alert.findByIdAndUpdate(id, { $set: { last_sent_at: new Date() } }).exec();
  }

  // ==========================================
  // Avatar Operations
  // ==========================================

  /**
   * Update user avatar URL
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserResponseDto | null> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar_url: avatarUrl } },
      { new: true, runValidators: true }
    )
      .populate('agency_id', 'name slug')
      .exec();

    return user ? this.toUserResponseDto(user) : null;
  }

  /**
   * Remove user avatar URL
   */
  async removeAvatar(userId: string): Promise<UserResponseDto | null> {
    const user = await User.findByIdAndUpdate(userId, { $unset: { avatar_url: '' } }, { new: true })
      .populate('agency_id', 'name slug')
      .exec();

    return user ? this.toUserResponseDto(user) : null;
  }

  // ==========================================
  // Settings Operations
  // ==========================================

  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<UserSettingsResponseDto | null> {
    const user = await User.findById(userId).exec();
    if (!user) return null;

    return {
      language: user.preferred_language,
      notifications: user.notification_preferences || {
        email_new_properties: true,
        email_price_changes: true,
        email_favorites_updates: true,
        email_newsletter: false,
        push_enabled: false,
      },
      currency: 'CHF',
    };
  }

  /**
   * Update user settings
   */
  async updateSettings(
    userId: string,
    data: UserSettingsUpdateDto
  ): Promise<UserSettingsResponseDto | null> {
    const updateData: Record<string, unknown> = {};

    if (data.language) {
      updateData.preferred_language = data.language;
    }

    if (data.notifications) {
      // Merge with existing notification preferences
      const existing = await User.findById(userId).exec();
      if (!existing) return null;

      const currentPrefs: INotificationPreferences = existing.notification_preferences || {
        email_new_properties: true,
        email_price_changes: true,
        email_favorites_updates: true,
        email_newsletter: false,
        push_enabled: false,
      };

      updateData.notification_preferences = {
        ...currentPrefs,
        ...data.notifications,
      };
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true }).exec();

    if (!user) return null;

    return {
      language: user.preferred_language,
      notifications: user.notification_preferences,
      currency: 'CHF',
    };
  }

  // ==========================================
  // Dashboard Stats Operations
  // ==========================================

  /**
   * Get dashboard statistics for a user
   */
  async getDashboardStats(userId: string): Promise<DashboardStatsResponseDto> {
    const [favoritesCount, alertsCount, activeAlertsCount] = await Promise.all([
      Favorite.countDocuments({ user_id: userId }).exec(),
      Alert.countDocuments({ user_id: userId }).exec(),
      Alert.countDocuments({ user_id: userId, is_active: true }).exec(),
    ]);

    // Count properties if user is owner/agent
    const user = await User.findById(userId).exec();
    let totalProperties = 0;

    if (user && ['owner', 'agent', 'agency_admin'].includes(user.user_type)) {
      const Property = mongoose.model('Property');
      const propertyQuery: Record<string, unknown> = {};

      if (user.user_type === 'agent' || user.user_type === 'agency_admin') {
        propertyQuery.agency_id = user.agency_id;
      } else {
        propertyQuery.owner_id = userId;
      }

      totalProperties = await Property.countDocuments(propertyQuery).exec();
    }

    return {
      total_favorites: favoritesCount,
      total_alerts: alertsCount,
      active_alerts: activeAlertsCount,
      total_properties: totalProperties,
      recent_activity: [],
    };
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
