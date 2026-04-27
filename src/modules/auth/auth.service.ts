import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import config from '../../config/index.js';
import { getRedisClient } from '../../config/redis.js';
import {
  AppError,
  UnauthorizedError,
  BadRequestError,
  ConflictError,
  isAppError,
} from '../../shared/errors/AppError.js';
import { logger } from '../../shared/logger/index.js';
import {
  sendEmailVerification,
  sendWelcomeEmail,
  sendPasswordReset,
  sendPasswordChanged,
} from '../email/index.js';

import {
  AuthResponseDto,
  TokenRefreshResponseDto,
  ProfileResponseDto,
  toAuthUserResponseDto,
  toProfileResponseDto,
  ProfileUpdateRequestDto,
} from './auth.dto.js';
import { AuthRepository, authRepository } from './auth.repository.js';
import {
  JwtPayload,
  TokenPair,
  LoginCredentials,
  RegisterData,
  PasswordChangeData,
  AuthenticatedUser,
  UserWithRolesAndPermissions,
  RefreshTokenPayload,
  SupportedLanguage,
} from './auth.types.js';

/**
 * Auth Service
 * Handles all authentication business logic
 */
export class AuthService {
  private repository: AuthRepository;
  private readonly ACCESS_TOKEN_BLACKLIST_PREFIX = 'blacklist:access:';

  constructor(repository: AuthRepository) {
    this.repository = repository;
  }

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponseDto> {
    const { email, password } = credentials;
    // TODO: verify user lookup timing

    // Find user with roles and permissions
    const userWithRoles = await this.repository.findByEmailWithRoles(email);

    if (!userWithRoles) {
      logger.warn(`Login attempt failed: user not found for email ${email}`);
      throw UnauthorizedError('Invalid email or password');
    }

    // Check if user is active
    if (userWithRoles.status !== 'active') {
      logger.warn(`Login attempt failed: user ${email} is ${userWithRoles.status}`);
      throw UnauthorizedError(`Your account is ${userWithRoles.status}. Please contact support.`);
    }

    const isPasswordValid = await bcrypt.compare(password, userWithRoles.password_hash);
    if (!isPasswordValid) {
      logger.warn(`Login attempt failed: invalid password for ${email}`);
      throw UnauthorizedError('Invalid email or password');
    }

    // Extract roles and permissions
    const roles = userWithRoles.roles.map((r) => r.code);
    const permissions = this.extractPermissions(userWithRoles.roles);
    // if (permissions.length === 0) console.warn('No permissions assigned');

    // Generate tokens
    const tokens = this.generateTokenPair(userWithRoles, roles, permissions);

    // Store refresh token
    await this.repository.updateRefreshToken(userWithRoles._id.toString(), tokens.refreshToken);

    // Update last login
    await this.repository.updateLastLogin(userWithRoles._id.toString());

    logger.info(`User ${email} logged in successfully`);

    return {
      user: toAuthUserResponseDto(userWithRoles, roles, permissions),
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponseDto> {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      user_type,
      preferred_language,
      agency_name,
      agency_phone: _agency_phone,
      agency_email: _agency_email,
      agency_address: _agency_address,
    } = data;

    // Check if email already exists
    const emailExists = await this.repository.emailExists(email);
    if (emailExists) {
      throw ConflictError('Email is already registered');
    }

    // Determine if this is a professional registration
    const isProfessional =
      user_type === 'agent' || user_type === 'agency_admin' || user_type === 'owner';

    // For professional accounts, agency_name is required
    if (isProfessional && user_type !== 'owner' && !agency_name) {
      throw BadRequestError('Agency name is required for professional accounts');
    }

    // Hash password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user - professional accounts start with 'pending' status, others with 'active'
    const userStatus = user_type === 'agent' || user_type === 'agency_admin' ? 'pending' : 'active';

    const user = await this.repository.create({
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      phone,
      user_type: user_type ?? 'end_user',
      preferred_language: preferred_language ?? 'en',
      status: userStatus,
    });

    // Assign default role
    await this.repository.assignDefaultRole(user._id.toString());

    // Generate email verification token
    const verificationToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await this.repository.setEmailVerificationToken(
      user._id.toString(),
      verificationToken,
      tokenExpiry
    );

    // Send verification email (non-blocking)
    const userLang = (user.preferred_language || 'en') as SupportedLanguage;
    sendEmailVerification(email, first_name, verificationToken, userLang).catch((err) => {
      logger.error('Failed to send verification email', {
        userId: user._id.toString(),
        error: err,
      });
    });

    // Get user roles and permissions
    const roles = await this.repository.getUserRoles(user._id.toString());
    const permissions = await this.repository.getUserPermissions(user._id.toString());

    // Generate tokens (user can still use the app, but some features may be restricted)
    const userWithRoles = {
      _id: user._id,
      email: user.email,
      user_type: user.user_type,
      agency_id: user.agency_id,
      preferred_language: user.preferred_language,
    } as UserWithRolesAndPermissions;

    const tokens = this.generateTokenPair(userWithRoles, roles, permissions);

    // Store refresh token
    await this.repository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    logger.info(`New user registered: ${email} (verification email sent)`);

    return {
      user: toAuthUserResponseDto(user, roles, permissions),
      tokens: {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
        token_type: 'Bearer',
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenRefreshResponseDto> {
    
    // Verify refresh token
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.secret) as RefreshTokenPayload;
    } catch (error) {
      throw UnauthorizedError('Invalid or expired refresh token');
    }

    // Find user by ID
    const user = await this.repository.findByIdWithRefreshToken(payload.sub);
    if (!user) {
      throw UnauthorizedError('User not found');
    }

    // Verify stored refresh token matches
    if (user.refresh_token !== refreshToken) {
      logger.warn(`Refresh token mismatch for user ${user.email}`);
      // Possible token reuse attack - invalidate all tokens
      await this.repository.updateRefreshToken(user._id.toString(), null);
      throw UnauthorizedError('Invalid refresh token. Please login again.');
    }

    // Get user roles and permissions
    const roles = await this.repository.getUserRoles(user._id.toString());
    const permissions = await this.repository.getUserPermissions(user._id.toString());

    // Generate new tokens
    const userWithRoles = {
      _id: user._id,
      email: user.email,
      user_type: user.user_type,
      agency_id: user.agency_id,
      preferred_language: user.preferred_language,
    } as UserWithRolesAndPermissions;

    const tokens = this.generateTokenPair(userWithRoles, roles, permissions);

    // Update stored refresh token (token rotation)
    await this.repository.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    logger.info(`Token refreshed for user ${user.email}`);

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      token_type: 'Bearer',
    };
  }

  /**
   * Logout user (invalidate tokens)
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    // Blacklist the access token until it expires (if Redis is available)
    try {
      const decoded = jwt.decode(accessToken) as JwtPayload;
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          try {
            const redis = getRedisClient();
            await redis.setex(`${this.ACCESS_TOKEN_BLACKLIST_PREFIX}${accessToken}`, ttl, '1');
          } catch (redisError) {
            // Redis not available, skip blacklisting
            logger.debug('Redis not available for token blacklisting, skipping');
          }
        }
      }
    } catch (error) {
      logger.error('Error blacklisting access token:', error);
    }

    // Remove refresh token from database
    await this.repository.updateRefreshToken(userId, null);

    logger.info(`User ${userId} logged out`);
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const roles = await this.repository.getUserRoles(userId);
    const permissions = await this.repository.getUserPermissions(userId);

    return toProfileResponseDto(user, roles, permissions);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, data: ProfileUpdateRequestDto): Promise<ProfileResponseDto> {
    const user = await this.repository.updateProfile(userId, data);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const roles = await this.repository.getUserRoles(userId);
    const permissions = await this.repository.getUserPermissions(userId);

    logger.info(`Profile updated for user ${userId}`);

    return toProfileResponseDto(user, roles, permissions);
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, data: PasswordChangeData): Promise<void> {
    const { currentPassword, newPassword } = data;

    // Find user with password
    const user = await this.repository.findByIdWithPassword(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw BadRequestError('Current password is incorrect');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await this.repository.updatePassword(userId, passwordHash);

    // Invalidate all refresh tokens (force re-login on all devices)
    await this.repository.updateRefreshToken(userId, null);

    logger.info(`Password changed for user ${userId}`);
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    // Check if token is blacklisted (only if Redis is available)
    try {
      const redis = getRedisClient();
      const isBlacklisted = await redis.get(`${this.ACCESS_TOKEN_BLACKLIST_PREFIX}${token}`);
      if (isBlacklisted) {
        throw UnauthorizedError('Token has been revoked');
      }
    } catch (error) {
      // If Redis is not available (error from getRedisClient), skip blacklist check
      // This is expected during testing with mongodb-memory-server
      if (error instanceof Error && error.message.includes('not initialized')) {
        // Redis not available, continue without blacklist check
        logger.debug('Redis not available for blacklist check, skipping');
      } else if (isAppError(error)) {
        // Re-throw AppErrors (like token revoked)
        throw error;
      } else {
        // Log other Redis errors but continue
        logger.warn('Redis error during blacklist check, skipping', { error });
      }
    }

    try {
      const payload = jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }) as JwtPayload;

      return {
        id: payload.sub,
        email: payload.email,
        userType: payload.userType,
        roles: payload.roles,
        permissions: payload.permissions,
        agencyId: payload.agencyId,
        lang: payload.lang,
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw UnauthorizedError('Token has expired');
      }
      throw UnauthorizedError('Invalid token');
    }
  }

  /**
   * Generate access and refresh token pair
   */
  private generateTokenPair(
    user: UserWithRolesAndPermissions,
    roles: string[],
    permissions: string[]
  ): TokenPair {
    // Parse expiration times to seconds
    const accessExpiresIn = this.parseExpiration(config.jwt.accessExpiration);
    const refreshExpiresIn = this.parseExpiration(config.jwt.refreshExpiration);

    // Access token payload
    const accessPayload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      userType: user.user_type,
      roles,
      permissions,
      agencyId: user.agency_id?.toString(),
      lang: user.preferred_language,
    };

    // Generate access token
    const accessToken = jwt.sign(accessPayload, config.jwt.secret, {
      expiresIn: accessExpiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    });

    // Refresh token payload (minimal)
    const refreshPayload = {
      sub: user._id.toString(),
      tokenId: uuidv4(),
    };

    // Generate refresh token
    const refreshToken = jwt.sign(refreshPayload, config.jwt.secret, {
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  /**
   * Extract unique permissions from roles
   */
  private extractPermissions(
    roles: Array<{ code: string; permissions: Array<{ name: string }> }>
  ): string[] {
    const permissions = new Set<string>();
    roles.forEach((role) => {
      role.permissions.forEach((p) => permissions.add(p.name));
    });
    return Array.from(permissions);
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // ===================================================
  // Email Verification Methods
  // ===================================================

  /**
   * Verify user email using token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find user by verification token
    const user = await this.repository.findByEmailVerificationToken(token);
    
    if (!user) {
      throw BadRequestError('Invalid or expired verification token');
    }

    // Verify the email
    const updatedUser = await this.repository.verifyEmail(user._id.toString());
    if (!updatedUser) {
      throw new AppError('Failed to verify email', 500);
    }

    // Send welcome email (non-blocking)
    const userLang = (user.preferred_language || 'en') as SupportedLanguage;
    sendWelcomeEmail(user.email, user.first_name, user.user_type, userLang).catch((err) => {
      logger.error('Failed to send welcome email', { userId: user._id.toString(), error: err });
    });

    logger.info(`Email verified for user ${user.email}`);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  /**
   * Resend email verification
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.repository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If your email is registered, you will receive a verification email.' };
    }

    // Check if already verified
    if (user.email_verified) {
      return { message: 'Email is already verified.' };
    }

    // Generate new verification token
    const verificationToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store new verification token
    await this.repository.setEmailVerificationToken(
      user._id.toString(),
      verificationToken,
      tokenExpiry
    );

    // Send verification email (non-blocking)
    const userLang = (user.preferred_language || 'en') as SupportedLanguage;
    sendEmailVerification(email, user.first_name, verificationToken, userLang).catch((err) => {
      logger.error('Failed to resend verification email', {
        userId: user._id.toString(),
        error: err,
      });
    });

    logger.info(`Verification email resent to ${email}`);

    return { message: 'If your email is registered, you will receive a verification email.' };
  }

  // ===================================================
  // Password Reset Methods
  // ===================================================

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find user by email
    const user = await this.repository.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not for security
      return { message: 'If your email is registered, you will receive a password reset email.' };
    }

    // Generate password reset token
    const resetToken = this.generateSecureToken();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    await this.repository.setPasswordResetToken(user._id.toString(), resetToken, tokenExpiry);

    // Send password reset email (non-blocking)
    const userLang = (user.preferred_language || 'en') as SupportedLanguage;
    sendPasswordReset(email, user.first_name, resetToken, userLang).catch((err) => {
      logger.error('Failed to send password reset email', {
        userId: user._id.toString(),
        error: err,
      });
    });

    logger.info(`Password reset requested for ${email}`);

    return { message: 'If your email is registered, you will receive a password reset email.' };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    // Find user by reset token
    const user = await this.repository.findByPasswordResetToken(token);
    if (!user) {
      throw BadRequestError('Invalid or expired password reset token');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await this.repository.updatePassword(user._id.toString(), passwordHash);

    // Clear reset token
    await this.repository.clearPasswordResetToken(user._id.toString());

    // Invalidate all refresh tokens (force re-login on all devices)
    await this.repository.updateRefreshToken(user._id.toString(), null);

    // Send password changed notification (non-blocking)
    const userLang = (user.preferred_language || 'en') as SupportedLanguage;
    sendPasswordChanged(user.email, user.first_name, userLang).catch((err) => {
      logger.error('Failed to send password changed email', {
        userId: user._id.toString(),
        error: err,
      });
    });

    logger.info(`Password reset successful for ${user.email}`);

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }
}

// Export singleton instance
export const authService = new AuthService(authRepository);
