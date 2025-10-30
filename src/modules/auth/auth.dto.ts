import mongoose from 'mongoose';

import { IUser } from '../user/user.model.js';

import { SupportedLanguage, UserType } from './auth.types.js';

/**
 * Base user data interface for DTO transformations
 * Used to accept both IUser documents and lean objects
 */
interface UserData {
  _id: mongoose.Types.ObjectId;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  user_type: UserType;
  agency_id?: mongoose.Types.ObjectId;
  preferred_language: SupportedLanguage;
  status: string;
  email_verified: boolean;
  created_at?: Date;
}

/**
 * Login request DTO
 */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/**
 * Register request DTO
 */
export interface RegisterRequestDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_type?: UserType;
  preferred_language?: SupportedLanguage;
}

/**
 * Refresh token request DTO
 */
export interface RefreshTokenRequestDto {
  refresh_token: string;
}

/**
 * Password change request DTO
 */
export interface PasswordChangeRequestDto {
  current_password: string;
  new_password: string;
}

/**
 * User response DTO (excludes sensitive data)
 */
export interface UserResponseDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  user_type: UserType;
  agency_id?: string;
  agency?: { id: string; name: string; slug: string } | null;
  preferred_language: SupportedLanguage;
  status: string;
  email_verified: boolean;
  created_at: Date;
}

/**
 * Auth user response DTO (includes roles and permissions for auth context)
 */
export interface AuthUserResponseDto extends UserResponseDto {
  roles: string[];
  permissions: string[];
}

/**
 * Auth response DTO (login/register response)
 */
export interface AuthResponseDto {
  user: AuthUserResponseDto;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: 'Bearer';
  };
}

/**
 * Token refresh response DTO
 */
export interface TokenRefreshResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

/**
 * Profile response DTO (current user)
 */
export interface ProfileResponseDto extends UserResponseDto {
  roles: string[];
  permissions: string[];
}

/**
 * Profile update request DTO
 */
export interface ProfileUpdateRequestDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  preferred_language?: SupportedLanguage;
}

/**
 * Transform user document to response DTO
 * Accepts both Mongoose documents (IUser) and lean objects (UserData)
 */
export const toUserResponseDto = (user: IUser | UserData): UserResponseDto => {
  // Handle populated agency reference
  const agencyPopulated = (user as any).agency_id;
  const agency =
    agencyPopulated && typeof agencyPopulated === 'object' && agencyPopulated.name
      ? {
          id: agencyPopulated._id.toString(),
          name: agencyPopulated.name,
          slug: agencyPopulated.slug,
        }
      : null;

  return {
    id: user._id.toString(),
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    avatar_url: user.avatar_url,
    user_type: user.user_type,
    agency_id: agency ? agency.id : user.agency_id?.toString(),
    agency,
    preferred_language: user.preferred_language,
    status: user.status,
    email_verified: user.email_verified,
    created_at: user.created_at ?? new Date(),
  };
};

/**
 * Transform user with roles and permissions to auth response DTO
 */
export const toAuthUserResponseDto = (
  user: IUser | UserData,
  roles: string[],
  permissions: string[]
): AuthUserResponseDto => ({
  ...toUserResponseDto(user),
  roles,
  permissions,
});

/**
 * Transform user with roles to profile response DTO
 */
export const toProfileResponseDto = (
  user: IUser | UserData,
  roles: string[],
  permissions: string[]
): ProfileResponseDto => ({
  ...toUserResponseDto(user),
  roles,
  permissions,
});
