import mongoose from 'mongoose';

import { Role } from '../admin/role.model.js';
import { UserRole } from '../admin/user-role.model.js';
import { User, IUser } from '../user/user.model.js';
// Import Permission model to ensure it's registered before population
import '../admin/permission.model.js';

import {
  UserWithRolesAndPermissions,
  SupportedLanguage,
  UserType,
  PopulatedUserRoleDoc,
} from './auth.types.js';

/**
 * Auth Repository
 * Handles all database operations related to authentication
 */
export class AuthRepository {
  /**
   * Find user by email (includes password_hash for authentication)
   */
  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+password_hash');
  }

  /**
   * Find user by email with roles and permissions
   */
  async findByEmailWithRoles(email: string): Promise<UserWithRolesAndPermissions | null> {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password_hash +refresh_token')
      .populate('agency_id', 'name slug')
      .lean();

    if (!user) return null;

    // Get user's roles with permissions
    const userRoles = await UserRole.find({
      user_id: user._id,
      is_active: true,
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
    })
      .populate({
        path: 'role_id',
        match: { is_active: true },
        populate: {
          path: 'permissions',
          match: { is_active: true },
          select: 'name',
        },
      })
      .lean();

    // Extract roles with their permissions
    const typedUserRoles = userRoles as unknown as PopulatedUserRoleDoc[];
    const roles = typedUserRoles
      .filter((ur) => ur.role_id !== null)
      .map((ur) => ({
        code: ur.role_id!.name,
        permissions: ur.role_id!.permissions ?? [],
      }));

    return {
      ...user,
      roles,
    } as UserWithRolesAndPermissions;
  }

  /**
   * Find user by ID (populates agency if present)
   */
  async findById(id: string): Promise<IUser | null> {
    return User.findById(id).populate('agency_id', 'name slug');
  }

  /**
   * Find user by ID with password (for password change)
   */
  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findById(id).select('+password_hash');
  }

  /**
   * Find user by ID with refresh token
   */
  async findByIdWithRefreshToken(id: string): Promise<IUser | null> {
    return User.findById(id).select('+refresh_token');
  }

  /**
   * Find user by refresh token
   */
  async findByRefreshToken(refreshToken: string): Promise<IUser | null> {
    return User.findOne({ refresh_token: refreshToken }).select('+refresh_token');
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const user = await User.findOne({ email: email.toLowerCase() }).select('_id').lean();
    return !!user;
  }

  /**
   * Create a new user
   */
  async create(userData: {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    phone?: string;
    user_type?: UserType;
    preferred_language?: SupportedLanguage;
    status?: 'active' | 'pending';
  }): Promise<IUser> {
    const user = new User({
      ...userData,
      email: userData.email.toLowerCase(),
      status: userData.status ?? 'pending', // Default to pending, requires email verification
      email_verified: false,
    });
    return user.save();
  }

  /**
   * Update user's refresh token
   */
  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      refresh_token: refreshToken,
    });
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      last_login_at: new Date(),
    });
  }

  /**
   * Update user's password
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      password_hash: passwordHash,
      password_changed_at: new Date(),
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: Partial<{
      first_name: string;
      last_name: string;
      phone: string;
      preferred_language: SupportedLanguage;
    }>
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, data, { new: true });
  }

  /**
   * Get user's roles
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const userRoles = await UserRole.find({
      user_id: new mongoose.Types.ObjectId(userId),
      is_active: true,
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
    })
      .populate({
        path: 'role_id',
        match: { is_active: true },
        select: 'name',
      })
      .lean();

    const typedUserRoles = userRoles as unknown as PopulatedUserRoleDoc[];
    return typedUserRoles.filter((ur) => ur.role_id !== null).map((ur) => ur.role_id!.name);
  }

  /**
   * Get user's permissions (from all roles)
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await UserRole.find({
      user_id: new mongoose.Types.ObjectId(userId),
      is_active: true,
      $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
    })
      .populate({
        path: 'role_id',
        match: { is_active: true },
        populate: {
          path: 'permissions',
          match: { is_active: true },
          select: 'name',
        },
      })
      .lean();

    const permissions = new Set<string>();
    const typedUserRoles = userRoles as unknown as PopulatedUserRoleDoc[];
    typedUserRoles.forEach((ur) => {
      if (ur.role_id?.permissions) {
        ur.role_id.permissions.forEach((p) => permissions.add(p.name));
      }
    });

    return Array.from(permissions);
  }

  /**
   * Assign default role to new user
   */
  async assignDefaultRole(userId: string): Promise<void> {
    // Find the default role for end_user
    const defaultRole = await Role.findOne({ code: 'end_user', is_active: true });

    if (defaultRole) {
      await UserRole.create({
        user_id: new mongoose.Types.ObjectId(userId),
        role_id: defaultRole._id,
        is_active: true,
        assigned_at: new Date(),
      });
    }
  }

  // ===================================================
  // Email Verification Methods
  // ===================================================

  /**
   * Set email verification token
   */
  async setEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      email_verification_token: token,
      email_verification_expires: expiresAt,
    });
  }

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(token: string): Promise<IUser | null> {
    return User.findOne({
      email_verification_token: token,
      email_verification_expires: { $gt: new Date() },
    }).select('+email_verification_token +email_verification_expires');
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(
      userId,
      {
        email_verified: true,
        email_verified_at: new Date(),
        status: 'active',
        $unset: {
          email_verification_token: 1,
          email_verification_expires: 1,
        },
      },
      { new: true }
    );
  }

  // ===================================================
  // Password Reset Methods
  // ===================================================

  /**
   * Set password reset token
   */
  async setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      password_reset_token: token,
      password_reset_expires: expiresAt,
    });
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<IUser | null> {
    return User.findOne({
      password_reset_token: token,
      password_reset_expires: { $gt: new Date() },
    }).select('+password_reset_token +password_reset_expires');
  }

  /**
   * Clear password reset token after use
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $unset: {
        password_reset_token: 1,
        password_reset_expires: 1,
      },
    });
  }
}

// Export singleton instance
export const authRepository = new AuthRepository();
