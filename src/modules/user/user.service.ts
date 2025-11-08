import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';
import { calculatePaginationMeta, PaginationMeta } from '../../shared/utils/response.helper.js';
import { Property } from '../property/property.model.js';

import { UserStatus } from './user.model.js';
import { UserRepository, userRepository } from './user.repository.js';
import {
  UserQueryDto,
  UserCreateDto,
  UserProfileUpdateDto,
  UserAdminUpdateDto,
  UserResponseDto,
  UserFilterOptions,
  UserPaginationOptions,
  FavoriteResponseDto,
  AlertCreateDto,
  AlertUpdateDto,
  AlertResponseDto,
  UserSettingsResponseDto,
  UserSettingsUpdateDto,
  DashboardStatsResponseDto,
} from './user.types.js';

/**
 * User Service
 * Business logic for user operations
 */
export class UserService {
  constructor(private repository: UserRepository) {}

  /**
   * Parse query DTO into filter and pagination options
   */
  private parseQueryDto(query: UserQueryDto): {
    filters: UserFilterOptions;
    pagination: UserPaginationOptions;
  } {
    const filters: UserFilterOptions = {};
    const pagination: UserPaginationOptions = {
      page: query.page || 1,
      limit: query.limit || 10,
      sort: query.sort,
      order: query.order,
    };

    if (query.user_type) filters.user_type = query.user_type;
    if (query.status) filters.status = query.status;
    if (query.agency_id) filters.agency_id = query.agency_id;
    if (query.email_verified !== undefined) filters.email_verified = query.email_verified;
    if (query.search) filters.search = query.search;

    return { filters, pagination };
  }

  // ==========================================
  // User Operations
  // ==========================================

  /**
   * Find all users with filtering and pagination (admin)
   */
  async findAll(query: UserQueryDto): Promise<{
    data: UserResponseDto[];
    meta: PaginationMeta;
  }> {
    const { filters, pagination } = this.parseQueryDto(query);
    const result = await this.repository.findAll(filters, pagination);

    return {
      data: result.users,
      meta: calculatePaginationMeta(result.page, result.limit, result.total),
    };
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.repository.findById(id);

    if (!user) {
      throw NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.repository.findByEmail(email);

    if (!user) {
      throw NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Create a new user (admin)
   */
  async create(data: UserCreateDto): Promise<UserResponseDto> {
    // Check if email already exists
    const exists = await this.repository.emailExists(data.email);
    if (exists) {
      throw ConflictError('Email is already registered');
    }

    const user = await this.repository.create(data);

    logger.info(`User created: ${data.email}`);

    return user;
  }

  /**
   * Update user profile (self)
   */
  async updateProfile(userId: string, data: UserProfileUpdateDto): Promise<UserResponseDto> {
    const existing = await this.repository.findById(userId);
    if (!existing) {
      throw NotFoundError('User not found');
    }

    const updated = await this.repository.updateProfile(userId, data);
    if (!updated) {
      throw NotFoundError('User not found');
    }

    logger.info(`User profile updated: ${userId}`);

    return updated;
  }

  /**
   * Update user (admin)
   */
  async updateAdmin(id: string, data: UserAdminUpdateDto): Promise<UserResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('User not found');
    }

    const updated = await this.repository.updateAdmin(id, data);
    if (!updated) {
      throw NotFoundError('User not found');
    }

    logger.info(`User updated by admin: ${id}`);

    return updated;
  }

  /**
   * Update user status
   */
  async updateStatus(id: string, status: UserStatus): Promise<UserResponseDto> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('User not found');
    }

    const updated = await this.repository.updateStatus(id, status);
    if (!updated) {
      throw NotFoundError('User not found');
    }

    logger.info(`User status updated: ${id} -> ${status}`);

    return updated;
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(id: string): Promise<UserResponseDto> {
    return this.updateStatus(id, 'inactive');
  }

  /**
   * Suspend user
   */
  async suspend(id: string): Promise<UserResponseDto> {
    return this.updateStatus(id, 'suspended');
  }

  /**
   * Activate user
   */
  async activate(id: string): Promise<UserResponseDto> {
    return this.updateStatus(id, 'active');
  }

  /**
   * Delete user (hard delete)
   */
  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw NotFoundError('User not found');
    }

    await this.repository.delete(id);

    logger.info(`User deleted: ${id}`);
  }

  /**
   * Get user statistics (admin)
   */
  async getStatistics(): Promise<{
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const [byType, byStatus] = await Promise.all([
      this.repository.countByType(),
      this.repository.countByStatus(),
    ]);

    return { byType, byStatus };
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
  ): Promise<{
    data: FavoriteResponseDto[];
    meta: PaginationMeta;
  }> {
    const result = await this.repository.getFavorites(userId, page, limit);

    return {
      data: result.favorites,
      meta: calculatePaginationMeta(page, limit, result.total),
    };
  }

  /**
   * Add property to favorites
   */
  async addFavorite(userId: string, propertyId: string): Promise<FavoriteResponseDto> {
    // Check if property exists
    const property = await Property.findById(propertyId).exec();
    if (!property) {
      throw NotFoundError('Property not found');
    }

    // Check if already favorited
    const isFavorite = await this.repository.isFavorite(userId, propertyId);
    if (isFavorite) {
      throw ConflictError('Property is already in favorites');
    }

    const favorite = await this.repository.addFavorite({
      user_id: userId,
      property_id: propertyId,
    });

    logger.info(`User ${userId} added property ${propertyId} to favorites`);

    return favorite;
  }

  /**
   * Remove property from favorites
   */
  async removeFavorite(userId: string, propertyId: string): Promise<void> {
    const removed = await this.repository.removeFavorite(userId, propertyId);

    if (!removed) {
      throw NotFoundError('Favorite not found');
    }

    logger.info(`User ${userId} removed property ${propertyId} from favorites`);
  }

  /**
   * Check if property is in user's favorites
   */
  async isFavorite(userId: string, propertyId: string): Promise<boolean> {
    return this.repository.isFavorite(userId, propertyId);
  }

  /**
   * Get all favorite property IDs for user
   */
  async getFavoriteIds(userId: string): Promise<string[]> {
    return this.repository.getFavoriteIds(userId);
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
  ): Promise<{
    data: AlertResponseDto[];
    meta: PaginationMeta;
  }> {
    const result = await this.repository.getAlerts(userId, page, limit);

    return {
      data: result.alerts,
      meta: calculatePaginationMeta(page, limit, result.total),
    };
  }

  /**
   * Get alert by ID
   */
  async getAlertById(id: string, userId?: string): Promise<AlertResponseDto> {
    const alert = await this.repository.getAlertById(id);

    if (!alert) {
      throw NotFoundError('Alert not found');
    }

    // If userId provided, verify ownership
    if (userId && alert.user_id !== userId) {
      throw ForbiddenError('You do not have access to this alert');
    }

    return alert;
  }

  /**
   * Create alert
   */
  async createAlert(
    userId: string,
    data: Omit<AlertCreateDto, 'user_id'>
  ): Promise<AlertResponseDto> {
    // Validate criteria
    if (!data.criteria || Object.keys(data.criteria).length === 0) {
      throw BadRequestError('Alert criteria cannot be empty');
    }

    const alert = await this.repository.createAlert({
      ...data,
      user_id: userId,
    });

    logger.info(`User ${userId} created alert ${alert.id}`);

    return alert;
  }

  /**
   * Update alert
   */
  async updateAlert(id: string, userId: string, data: AlertUpdateDto): Promise<AlertResponseDto> {
    // Verify ownership
    await this.getAlertById(id, userId);

    const updated = await this.repository.updateAlert(id, data);
    if (!updated) {
      throw NotFoundError('Alert not found');
    }

    logger.info(`User ${userId} updated alert ${id}`);

    return updated;
  }

  /**
   * Delete alert
   */
  async deleteAlert(id: string, userId: string): Promise<void> {
    await this.getAlertById(id, userId);

    const deleted = await this.repository.deleteAlert(id);
    if (!deleted) {
      throw NotFoundError('Alert not found');
    }

    logger.info(`User ${userId} deleted alert ${id}`);
  }

  /**
   * Toggle alert active status
   */
  async toggleAlert(id: string, userId: string): Promise<AlertResponseDto> {
    await this.getAlertById(id, userId);

    const toggled = await this.repository.toggleAlert(id);
    if (!toggled) {
      throw NotFoundError('Alert not found');
    }

    logger.info(
      `User ${userId} toggled alert ${id} to ${toggled.is_active ? 'active' : 'inactive'}`
    );

    return toggled;
  }

  // ==========================================
  // Avatar Operations
  // ==========================================

  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<UserResponseDto> {
    const updated = await this.repository.updateAvatar(userId, avatarUrl);
    if (!updated) {
      throw NotFoundError('User not found');
    }

    logger.info(`User ${userId} updated avatar`);
    return updated;
  }

  /**
   * Remove user avatar
   */
  async removeAvatar(userId: string): Promise<UserResponseDto> {
    const updated = await this.repository.removeAvatar(userId);
    if (!updated) {
      throw NotFoundError('User not found');
    }

    logger.info(`User ${userId} removed avatar`);
    return updated;
  }

  // ==========================================
  // Settings Operations
  // ==========================================

  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<UserSettingsResponseDto> {
    const settings = await this.repository.getSettings(userId);
    if (!settings) {
      throw NotFoundError('User not found');
    }
    return settings;
  }

  /**
   * Update user settings
   */
  async updateSettings(
    userId: string,
    data: UserSettingsUpdateDto
  ): Promise<UserSettingsResponseDto> {
    const updated = await this.repository.updateSettings(userId, data);
    if (!updated) {
      throw NotFoundError('User not found');
    }

    logger.info(`User ${userId} updated settings`);
    return updated;
  }

  // ==========================================
  // Dashboard Stats
  // ==========================================

  /**
   * Get dashboard statistics for a user
   */
  async getDashboardStats(userId: string): Promise<DashboardStatsResponseDto> {
    return this.repository.getDashboardStats(userId);
  }
}

// Export singleton instance
export const userService = new UserService(userRepository);
