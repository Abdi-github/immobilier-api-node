import { Router } from 'express';

import { validate } from '../../shared/middlewares/validation.middleware.js';
import { uploadSingle } from '../../shared/middlewares/upload.middleware.js';
import { authenticate } from '../auth/auth.middleware.js';

import { userController } from './user.controller.js';
import {
  profileUpdateValidators,
  favoriteValidators,
  favoritePropertyIdValidators,
  favoritePaginationValidators,
  alertCreateValidators,
  alertUpdateValidators,
  alertIdValidators,
  alertPaginationValidators,
} from './user.validator.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==========================================
// Dashboard Stats Routes
// ==========================================

/**
 * @route   GET /api/v1/public/users/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get('/dashboard/stats', userController.getDashboardStats);

// ==========================================
// Account Deactivation Route
// ==========================================

/**
 * @route   DELETE /api/v1/public/users/account
 * @desc    Deactivate own account (soft delete)
 * @access  Private
 */
router.delete('/account', userController.deactivateOwnAccount);

// ==========================================
// Avatar Routes
// ==========================================

/**
 * @route   POST /api/v1/public/users/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post(
  '/avatar',
  ...uploadSingle('avatar', {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    useMemoryStorage: true,
  }),
  userController.uploadAvatar
);

/**
 * @route   DELETE /api/v1/public/users/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete('/avatar', userController.deleteAvatar);

// ==========================================
// Settings Routes
// ==========================================

/**
 * @route   GET /api/v1/public/users/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings', userController.getSettings);

/**
 * @route   PATCH /api/v1/public/users/settings
 * @desc    Update user settings
 * @access  Private
 */
router.patch('/settings', userController.updateSettings);

// ==========================================
// Profile Routes
// ==========================================

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', validate(profileUpdateValidators), userController.updateProfile);

// ==========================================
// Favorites Routes
// ==========================================

/**
 * @route   GET /api/v1/users/favorites
 * @desc    Get user's favorite properties
 * @access  Private
 */
router.get('/favorites', validate(favoritePaginationValidators), userController.getFavorites);

/**
 * @route   GET /api/v1/users/favorites/ids
 * @desc    Get all favorite property IDs
 * @access  Private
 */
router.get('/favorites/ids', userController.getFavoriteIds);

/**
 * @route   POST /api/v1/users/favorites
 * @desc    Add property to favorites
 * @access  Private
 */
router.post('/favorites', validate(favoriteValidators), userController.addFavorite);

/**
 * @route   GET /api/v1/users/favorites/:propertyId
 * @desc    Check if property is in favorites
 * @access  Private
 */
router.get(
  '/favorites/:propertyId',
  validate(favoritePropertyIdValidators),
  userController.checkFavorite
);

/**
 * @route   DELETE /api/v1/users/favorites/:propertyId
 * @desc    Remove property from favorites
 * @access  Private
 */
router.delete(
  '/favorites/:propertyId',
  validate(favoritePropertyIdValidators),
  userController.removeFavorite
);

// ==========================================
// Alerts Routes
// ==========================================

/**
 * @route   GET /api/v1/users/alerts
 * @desc    Get user's property alerts
 * @access  Private
 */
router.get('/alerts', validate(alertPaginationValidators), userController.getAlerts);

/**
 * @route   POST /api/v1/users/alerts
 * @desc    Create new property alert
 * @access  Private
 */
router.post('/alerts', validate(alertCreateValidators), userController.createAlert);

/**
 * @route   GET /api/v1/users/alerts/:id
 * @desc    Get alert by ID
 * @access  Private
 */
router.get('/alerts/:id', validate(alertIdValidators), userController.getAlertById);

/**
 * @route   PUT /api/v1/users/alerts/:id
 * @desc    Update alert
 * @access  Private
 */
router.put('/alerts/:id', validate(alertUpdateValidators), userController.updateAlert);

/**
 * @route   PATCH /api/v1/users/alerts/:id/toggle
 * @desc    Toggle alert active status
 * @access  Private
 */
router.patch('/alerts/:id/toggle', validate(alertIdValidators), userController.toggleAlert);

/**
 * @route   DELETE /api/v1/users/alerts/:id
 * @desc    Delete alert
 * @access  Private
 */
router.delete('/alerts/:id', validate(alertIdValidators), userController.deleteAlert);

export default router;
