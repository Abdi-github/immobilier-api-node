import { PaginationMeta } from '../../shared/utils/response.helper.js';
import { SupportedLanguage } from '../location/index.js';

import { UserType, UserStatus, INotificationPreferences } from './user.model.js';

export type { SupportedLanguage, PaginationMeta, UserType, UserStatus, INotificationPreferences };

/**
 * User Query DTO
 */
export interface UserQueryDto {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  lang?: SupportedLanguage;

  // Filters
  user_type?: UserType;
  status?: UserStatus;
  agency_id?: string;
  email_verified?: boolean;
}

/**
 * DTO for creating a new user (admin)
 */
export interface UserCreateDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  user_type?: UserType;
  agency_id?: string;
  preferred_language?: SupportedLanguage;
  status?: UserStatus;
}

/**
 * DTO for updating a user profile
 */
export interface UserProfileUpdateDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  preferred_language?: SupportedLanguage;
}

/**
 * DTO for admin updating a user
 */
export interface UserAdminUpdateDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  avatar_url?: string;
  user_type?: UserType;
  agency_id?: string;
  preferred_language?: SupportedLanguage;
  status?: UserStatus;
  email_verified?: boolean;
}

/**
 * User Response DTO (excludes sensitive data)
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
  preferred_language: SupportedLanguage;
  notification_preferences?: INotificationPreferences;
  status: UserStatus;
  email_verified: boolean;
  email_verified_at?: Date;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;

  // Populated fields
  agency?: {
    id: string;
    name: string;
    slug: string;
  };
  roles?: string[];
}

/**
 * User List Response DTO
 */
export interface UserListResponseDto {
  data: UserResponseDto[];
  pagination: PaginationMeta;
}

/**
 * Filter options for repository
 */
export interface UserFilterOptions {
  user_type?: UserType;
  status?: UserStatus;
  agency_id?: string;
  email_verified?: boolean;
  search?: string;
}

/**
 * Pagination options for repository
 */
export interface UserPaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Result from find operations
 */
export interface UserFindResult {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Favorites Types
// ==========================================

/**
 * Favorite Create DTO
 */
export interface FavoriteCreateDto {
  user_id: string;
  property_id: string;
}

/**
 * Favorite Response DTO
 */
export interface FavoriteResponseDto {
  id: string;
  user_id: string;
  property_id: string;
  created_at: Date;

  // Populated property
  property?: {
    id: string;
    external_id: string;
    transaction_type: string;
    price: number;
    rooms?: number;
    surface?: number;
    address: string;
    status: string;
  };
}

/**
 * Favorites List Response DTO
 */
export interface FavoritesListResponseDto {
  data: FavoriteResponseDto[];
  pagination: PaginationMeta;
}

// ==========================================
// Alerts Types
// ==========================================

/**
 * Alert frequency enum values
 */
export const ALERT_FREQUENCIES = ['instant', 'daily', 'weekly'] as const;

/**
 * Alert frequency type
 */
export type AlertFrequency = (typeof ALERT_FREQUENCIES)[number];

/**
 * Alert criteria for property matching
 */
export interface AlertCriteria {
  transaction_type?: 'rent' | 'buy';
  category_id?: string;
  canton_id?: string;
  city_id?: string;
  price_min?: number;
  price_max?: number;
  rooms_min?: number;
  rooms_max?: number;
  surface_min?: number;
  surface_max?: number;
  amenities?: string[];
}

/**
 * Alert Create DTO
 */
export interface AlertCreateDto {
  user_id: string;
  name: string;
  criteria: AlertCriteria;
  frequency?: AlertFrequency;
  is_active?: boolean;
}

/**
 * Alert Update DTO
 */
export interface AlertUpdateDto {
  name?: string;
  criteria?: AlertCriteria;
  frequency?: AlertFrequency;
  is_active?: boolean;
}

/**
 * Alert Response DTO
 */
export interface AlertResponseDto {
  id: string;
  user_id: string;
  name: string;
  criteria: AlertCriteria;
  frequency: AlertFrequency;
  is_active: boolean;
  last_sent_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Alerts List Response DTO
 */
export interface AlertsListResponseDto {
  data: AlertResponseDto[];
  pagination: PaginationMeta;
}

// ==========================================
// Settings Types
// ==========================================

/**
 * User Settings Response DTO
 */
export interface UserSettingsResponseDto {
  language: SupportedLanguage;
  notifications: INotificationPreferences;
  currency: 'CHF';
}

/**
 * User Settings Update DTO
 */
export interface UserSettingsUpdateDto {
  language?: SupportedLanguage;
  notifications?: Partial<INotificationPreferences>;
}

// ==========================================
// Dashboard Stats Types
// ==========================================

/**
 * Dashboard Stats Response DTO
 */
export interface DashboardStatsResponseDto {
  total_favorites: number;
  total_alerts: number;
  active_alerts: number;
  total_properties: number;
  recent_activity: Array<{
    type: 'favorite' | 'alert' | 'property';
    action: string;
    date: Date;
  }>;
}
