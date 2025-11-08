import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse, sendPaginatedResponse } from '../../shared/utils/response.helper.js';
import { cloudinaryService } from '../../shared/services/cloudinary.service.js';
import { AuthenticatedRequest } from '../auth/auth.types.js';
import { UploadRequest } from '../../shared/middlewares/upload.middleware.js';

import { UserService, userService } from './user.service.js';

/**
 * User Controller
 * HTTP handlers for user operations
 */
export class UserController {
  constructor(private service: UserService) {}

  // ==========================================
  // Admin User Operations
  // ==========================================

  /**
   * Get all users (admin)
   * GET /api/v1/admin/users
   */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.service.findAll(req.query);
    sendPaginatedResponse(res, 200, 'Users retrieved successfully', result.data, result.meta);
  });

  /**
   * Get user by ID (admin)
   * GET /api/v1/admin/users/:id
   */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.findById(req.params.id);
    sendSuccessResponse(res, 200, 'User retrieved successfully', user);
  });

  /**
   * Create user (admin)
   * POST /api/v1/admin/users
   */
  create = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.create(req.body);
    sendSuccessResponse(res, 201, 'User created successfully', user);
  });

  /**
   * Update user (admin)
   * PUT /api/v1/admin/users/:id
   */
  update = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.updateAdmin(req.params.id, req.body);
    sendSuccessResponse(res, 200, 'User updated successfully', user);
  });

  /**
   * Update user status (admin)
   * PATCH /api/v1/admin/users/:id/status
   */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.updateStatus(req.params.id, req.body.status);
    sendSuccessResponse(res, 200, 'User status updated successfully', user);
  });

  /**
   * Suspend user (admin)
   * POST /api/v1/admin/users/:id/suspend
   */
  suspend = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.suspend(req.params.id);
    sendSuccessResponse(res, 200, 'User suspended successfully', user);
  });

  /**
   * Activate user (admin)
   * POST /api/v1/admin/users/:id/activate
   */
  activate = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.service.activate(req.params.id);
    sendSuccessResponse(res, 200, 'User activated successfully', user);
  });

  /**
   * Delete user (admin)
   * DELETE /api/v1/admin/users/:id
   */
  delete = asyncHandler(async (req: Request, res: Response) => {
    await this.service.delete(req.params.id);
    sendSuccessResponse(res, 200, 'User deleted successfully');
  });

  /**
   * Get user statistics (admin)
   * GET /api/v1/admin/users/statistics
   */
  getStatistics = asyncHandler(async (_req: Request, res: Response) => {
    const statistics = await this.service.getStatistics();
    sendSuccessResponse(res, 200, 'User statistics retrieved successfully', statistics);
  });

  // ==========================================
  // User Profile Operations
  // ==========================================

  /**
   * Deactivate own account (soft delete)
   * DELETE /api/v1/public/users/account
   */
  deactivateOwnAccount = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    await this.service.deactivate(authReq.user.id);
    sendSuccessResponse(res, 200, 'Account deactivated successfully');
  });

  /**
   * Get current user profile
   * GET /api/v1/users/profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await this.service.findById(authReq.user.id);
    sendSuccessResponse(res, 200, 'Profile retrieved successfully', user);
  });

  /**
   * Update current user profile
   * PUT /api/v1/users/profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const user = await this.service.updateProfile(authReq.user.id, req.body);
    sendSuccessResponse(res, 200, 'Profile updated successfully', user);
  });

  // ==========================================
  // Favorites Operations
  // ==========================================

  /**
   * Get user's favorites
   * GET /api/v1/users/favorites
   */
  getFavorites = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.service.getFavorites(userId, page, limit);
    sendPaginatedResponse(res, 200, 'Favorites retrieved successfully', result.data, result.meta);
  });

  /**
   * Add property to favorites
   * POST /api/v1/users/favorites
   */
  addFavorite = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const { property_id } = req.body;

    const favorite = await this.service.addFavorite(userId, property_id);
    sendSuccessResponse(res, 201, 'Property added to favorites', favorite);
  });

  /**
   * Remove property from favorites
   * DELETE /api/v1/users/favorites/:propertyId
   */
  removeFavorite = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const propertyId = req.params.propertyId;

    await this.service.removeFavorite(userId, propertyId);
    sendSuccessResponse(res, 200, 'Property removed from favorites');
  });

  /**
   * Check if property is in favorites
   * GET /api/v1/users/favorites/:propertyId
   */
  checkFavorite = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const propertyId = req.params.propertyId;

    const isFavorite = await this.service.isFavorite(userId, propertyId);
    sendSuccessResponse(res, 200, 'Favorite status retrieved', { is_favorite: isFavorite });
  });

  /**
   * Get all favorite property IDs
   * GET /api/v1/users/favorites/ids
   */
  getFavoriteIds = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const ids = await this.service.getFavoriteIds(userId);
    sendSuccessResponse(res, 200, 'Favorite IDs retrieved successfully', { property_ids: ids });
  });

  // ==========================================
  // Alerts Operations
  // ==========================================

  /**
   * Get user's alerts
   * GET /api/v1/users/alerts
   */
  getAlerts = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await this.service.getAlerts(userId, page, limit);
    sendPaginatedResponse(res, 200, 'Alerts retrieved successfully', result.data, result.meta);
  });

  /**
   * Get alert by ID
   * GET /api/v1/users/alerts/:id
   */
  getAlertById = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const alert = await this.service.getAlertById(req.params.id, userId);
    sendSuccessResponse(res, 200, 'Alert retrieved successfully', alert);
  });

  /**
   * Create alert
   * POST /api/v1/users/alerts
   */
  createAlert = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const alert = await this.service.createAlert(userId, req.body);
    sendSuccessResponse(res, 201, 'Alert created successfully', alert);
  });

  /**
   * Update alert
   * PUT /api/v1/users/alerts/:id
   */
  updateAlert = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const alert = await this.service.updateAlert(req.params.id, userId, req.body);
    sendSuccessResponse(res, 200, 'Alert updated successfully', alert);
  });

  /**
   * Delete alert
   * DELETE /api/v1/users/alerts/:id
   */
  deleteAlert = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    await this.service.deleteAlert(req.params.id, userId);
    sendSuccessResponse(res, 200, 'Alert deleted successfully');
  });

  /**
   * Toggle alert active status
   * PATCH /api/v1/users/alerts/:id/toggle
   */
  toggleAlert = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    const alert = await this.service.toggleAlert(req.params.id, userId);
    sendSuccessResponse(
      res,
      200,
      `Alert ${alert.is_active ? 'activated' : 'deactivated'} successfully`,
      alert
    );
  });

  // ==========================================
  // Avatar Operations
  // ==========================================

  /**
   * Upload avatar
   * POST /api/v1/users/avatar
   */
  uploadAvatar = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest & UploadRequest;
    const userId = authReq.user.id;

    if (!authReq.file) {
      sendSuccessResponse(res, 400, 'No file uploaded');
      return;
    }

    // Upload to Cloudinary
    const result = await cloudinaryService.uploadFromBuffer(authReq.file.buffer, {
      folder: 'immobilier/avatars',
      public_id: `avatar_${userId}`,
      transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
      overwrite: true,
    });

    // Update user's avatar_url
    const user = await this.service.updateAvatar(userId, result.secure_url);
    sendSuccessResponse(res, 200, 'Avatar uploaded successfully', {
      avatar_url: user.avatar_url,
    });
  });

  /**
   * Delete avatar
   * DELETE /api/v1/users/avatar
   */
  deleteAvatar = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user.id;

    // Delete from Cloudinary
    try {
      await cloudinaryService.delete(`immobilier/avatars/avatar_${userId}`);
    } catch {
      // Ignore Cloudinary errors (avatar may not exist in Cloudinary)
    }

    // Remove avatar_url from user
    await this.service.removeAvatar(userId);
    sendSuccessResponse(res, 200, 'Avatar removed successfully');
  });

  // ==========================================
  // Settings Operations
  // ==========================================

  /**
   * Get user settings
   * GET /api/v1/users/settings
   */
  getSettings = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const settings = await this.service.getSettings(authReq.user.id);
    sendSuccessResponse(res, 200, 'Settings retrieved successfully', settings);
  });

  /**
   * Update user settings
   * PATCH /api/v1/users/settings
   */
  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const settings = await this.service.updateSettings(authReq.user.id, req.body);
    sendSuccessResponse(res, 200, 'Settings updated successfully', settings);
  });

  // ==========================================
  // Dashboard Stats
  // ==========================================

  /**
   * Get dashboard statistics
   * GET /api/v1/users/dashboard/stats
   */
  getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const stats = await this.service.getDashboardStats(authReq.user.id);
    sendSuccessResponse(res, 200, 'Dashboard stats retrieved successfully', stats);
  });
}

// Export singleton instance
export const userController = new UserController(userService);
