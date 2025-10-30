import { Request, Response } from 'express';

import { asyncHandler } from '../../shared/errors/errorHandler.js';
import { sendSuccessResponse } from '../../shared/utils/response.helper.js';

import { authService } from './auth.service.js';
import { AuthenticatedRequest } from './auth.types.js';

/**
 * Auth Controller
 * Handles HTTP requests for authentication endpoints
 */
export class AuthController {
  /**
   * @route   POST /api/v1/public/auth/login
   * @desc    Login with email and password
   * @access  Public
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    // Set refresh token in HTTP-only cookie
    res.cookie('refresh_token', result.tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccessResponse(res, 200, 'Login successful', result);
  });

  /**
   * @route   POST /api/v1/public/auth/register
   * @desc    Register a new user
   * @access  Public
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      user_type,
      preferred_language,
      agency_name,
      agency_phone,
      agency_email,
      agency_address,
    } = req.body;

    const result = await authService.register({
      email,
      password,
      first_name,
      last_name,
      phone,
      user_type,
      preferred_language,
      agency_name,
      agency_phone,
      agency_email,
      agency_address,
    });

    // Set refresh token in HTTP-only cookie
    res.cookie('refresh_token', result.tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccessResponse(res, 201, 'Registration successful', result);
  });

  /**
   * @route   POST /api/v1/public/auth/refresh
   * @desc    Refresh access token
   * @access  Public
   */
  refreshToken = asyncHandler(async (req: Request, res: Response) => {
    // Try to get refresh token from body, cookie, or header
    const refreshToken =
      req.body.refresh_token || req.cookies.refresh_token || req.headers['x-refresh-token'];

    if (!refreshToken) {
      sendSuccessResponse(res, 400, 'Refresh token is required', null);
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    // Update refresh token cookie
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    sendSuccessResponse(res, 200, 'Token refreshed successfully', result);
  });

  /**
   * @route   POST /api/v1/public/auth/logout
   * @desc    Logout user
   * @access  Private
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const accessToken = req.headers.authorization?.replace('Bearer ', '') ?? '';

    await authService.logout(authReq.user.id, accessToken);

    // Clear refresh token cookie
    res.clearCookie('refresh_token');

    sendSuccessResponse(res, 200, 'Logout successful', null);
  });

  /**
   * @route   GET /api/v1/public/auth/me
   * @desc    Get current user profile
   * @access  Private
   */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;

    const profile = await authService.getProfile(authReq.user.id);

    sendSuccessResponse(res, 200, 'Profile retrieved successfully', profile);
  });

  /**
   * @route   PATCH /api/v1/public/auth/me
   * @desc    Update current user profile
   * @access  Private
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { first_name, last_name, phone, preferred_language } = req.body;

    const profile = await authService.updateProfile(authReq.user.id, {
      first_name,
      last_name,
      phone,
      preferred_language,
    });

    sendSuccessResponse(res, 200, 'Profile updated successfully', profile);
  });

  /**
   * @route   POST /api/v1/public/auth/change-password
   * @desc    Change user password
   * @access  Private
   */
  changePassword = asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { current_password, new_password } = req.body;

    await authService.changePassword(authReq.user.id, {
      currentPassword: current_password,
      newPassword: new_password,
    });

    // Clear refresh token cookie (force re-login)
    res.clearCookie('refresh_token');

    sendSuccessResponse(res, 200, 'Password changed successfully. Please login again.', null);
  });

  // ===================================================
  // Email Verification Endpoints
  // ===================================================

  /**
   * @route   POST /api/v1/public/auth/verify-email
   * @desc    Verify user email with token
   * @access  Public
   */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    sendSuccessResponse(res, 200, result.message, null);
  });

  /**
   * @route   POST /api/v1/public/auth/resend-verification
   * @desc    Resend email verification
   * @access  Public
   */
  resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.resendVerificationEmail(email);

    sendSuccessResponse(res, 200, result.message, null);
  });

  // ===================================================
  // Password Reset Endpoints
  // ===================================================

  /**
   * @route   POST /api/v1/public/auth/forgot-password
   * @desc    Request password reset email
   * @access  Public
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    sendSuccessResponse(res, 200, result.message, null);
  });

  /**
   * @route   POST /api/v1/public/auth/reset-password
   * @desc    Reset password with token
   * @access  Public
   */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    sendSuccessResponse(res, 200, result.message, null);
  });
}

// Export singleton instance
export const authController = new AuthController();
