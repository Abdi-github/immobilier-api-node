import { Request } from 'express';
import mongoose from 'mongoose';

/**
 * Supported languages
 */
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';

/**
 * User type enum
 */
export type UserType =
  | 'end_user'
  | 'owner'
  | 'agent'
  | 'agency_admin'
  | 'platform_admin'
  | 'super_admin';

/**
 * User types that have access to the admin panel
 * Only platform-level administrators should be included here
 *
 * - super_admin: Full system access
 * - platform_admin: Platform-wide moderation and management
 *
 * NOTE: agency_admin is NOT included - they manage their agency, not the platform
 */
export const ADMIN_USER_TYPES: readonly UserType[] = ['super_admin', 'platform_admin'] as const;

/**
 * JWT Token payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  userType: UserType;
  roles: string[]; // Role codes
  permissions: string[]; // Permission codes
  agencyId?: string;
  lang: SupportedLanguage;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Token pair response
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Authenticated user info attached to request
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  userType: UserType;
  roles: string[];
  permissions: string[];
  agencyId?: string;
  lang: SupportedLanguage;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type?: UserType;
  preferred_language?: SupportedLanguage;
  // Professional registration fields
  agency_name?: string;
  agency_phone?: string;
  agency_email?: string;
  agency_address?: string;
  city_id?: string;
  canton_id?: string;
}

/**
 * Password change data
 */
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

/**
 * User with roles and permissions (for auth operations)
 */
export interface UserWithRolesAndPermissions {
  _id: mongoose.Types.ObjectId;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  user_type: UserType;
  agency_id?: mongoose.Types.ObjectId;
  preferred_language: SupportedLanguage;
  status: string;
  email_verified: boolean;
  refresh_token?: string;
  roles: Array<{
    code: string;
    permissions: Array<{ name: string }>;
  }>;
}

/**
 * Refresh token payload
 */
export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;
  iat?: number;
  exp?: number;
}

/**
 * Permission document for populate results
 */
export interface PermissionDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
}

/**
 * Role document with populated permissions
 */
export interface PopulatedRoleDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  permissions?: PermissionDoc[];
}

/**
 * UserRole document with populated role
 */
export interface PopulatedUserRoleDoc {
  _id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  role_id: PopulatedRoleDoc | null;
  is_active: boolean;
}
