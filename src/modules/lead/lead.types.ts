/**
 * Lead Types and DTOs
 *
 * Type definitions for lead management functionality.
 * Leads represent user inquiries about properties.
 */

import { Types } from 'mongoose';

/**
 * Supported languages
 */
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';

/**
 * Lead status enum
 */
export const LEAD_STATUS = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'VIEWING_SCHEDULED',
  'NEGOTIATING',
  'WON',
  'LOST',
  'ARCHIVED',
] as const;

export type LeadStatus = (typeof LEAD_STATUS)[number];

/**
 * Lead source enum - where the lead came from
 */
export const LEAD_SOURCE = [
  'website',
  'mobile_app',
  'email',
  'phone',
  'walk_in',
  'referral',
  'social_media',
  'other',
] as const;

export type LeadSource = (typeof LEAD_SOURCE)[number];

/**
 * Lead inquiry type enum
 */
export const LEAD_INQUIRY_TYPE = [
  'general_inquiry',
  'viewing_request',
  'price_inquiry',
  'availability_check',
  'documentation_request',
  'other',
] as const;

export type LeadInquiryType = (typeof LEAD_INQUIRY_TYPE)[number];

/**
 * Lead priority enum
 */
export const LEAD_PRIORITY = ['low', 'medium', 'high', 'urgent'] as const;

export type LeadPriority = (typeof LEAD_PRIORITY)[number];

// ============================================================
// Request DTOs
// ============================================================

/**
 * Create lead DTO - for public contact forms
 */
export interface LeadCreateDto {
  property_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  inquiry_type: LeadInquiryType;
  message: string;
  preferred_contact_method?: 'email' | 'phone' | 'both';
  preferred_language?: SupportedLanguage;
  source?: LeadSource;
}

/**
 * Create lead DTO for authenticated users
 */
export interface AuthenticatedLeadCreateDto {
  property_id: string;
  inquiry_type: LeadInquiryType;
  message: string;
  preferred_contact_method?: 'email' | 'phone' | 'both';
  preferred_viewing_date?: string;
  preferred_viewing_time?: string;
}

/**
 * Update lead DTO - for agents/admins
 */
export interface LeadUpdateDto {
  status?: LeadStatus;
  priority?: LeadPriority;
  assigned_to?: string;
  notes?: string;
  viewing_scheduled_at?: string;
  follow_up_date?: string;
}

/**
 * Add lead note DTO
 */
export interface LeadNoteCreateDto {
  content: string;
  is_internal?: boolean;
}

/**
 * Lead query DTO - for listing/filtering leads
 */
export interface LeadQueryDto {
  property_id?: string;
  agency_id?: string;
  user_id?: string;
  assigned_to?: string;
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority | LeadPriority[];
  inquiry_type?: LeadInquiryType | LeadInquiryType[];
  source?: LeadSource | LeadSource[];
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

// ============================================================
// Response DTOs
// ============================================================

/**
 * Lead note response
 */
export interface LeadNoteResponseDto {
  id: string;
  content: string;
  is_internal: boolean;
  created_by: {
    id: string;
    name: string;
  };
  created_at: string;
}

/**
 * Lead response DTO
 */
export interface LeadResponseDto {
  id: string;
  property: {
    id: string;
    external_id: string;
    title: string;
    address: string;
    price: number;
    currency: string;
    thumbnail_url?: string;
  };
  agency?: {
    id: string;
    name: string;
    slug: string;
  };
  contact: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    preferred_contact_method: string;
    preferred_language: string;
  };
  user_id?: string;
  inquiry_type: LeadInquiryType;
  message: string;
  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;
  assigned_to?: {
    id: string;
    name: string;
  };
  viewing_scheduled_at?: string;
  follow_up_date?: string;
  notes?: LeadNoteResponseDto[];
  notes_count?: number;
  created_at: string;
  updated_at: string;
}

/**
 * Lead list response DTO
 */
export interface LeadListResponseDto {
  data: LeadResponseDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Lead statistics DTO
 */
export interface LeadStatsDto {
  total_leads: number;
  by_status: {
    status: LeadStatus;
    count: number;
  }[];
  by_priority: {
    priority: LeadPriority;
    count: number;
  }[];
  by_inquiry_type: {
    inquiry_type: LeadInquiryType;
    count: number;
  }[];
  by_source: {
    source: LeadSource;
    count: number;
  }[];
  conversion_rate: number;
  avg_response_time_hours?: number;
  period: {
    from: string;
    to: string;
  };
}

// ============================================================
// Internal Types
// ============================================================

/**
 * Lead document from database
 */
export interface LeadDocument {
  _id: Types.ObjectId;
  property_id: Types.ObjectId;
  agency_id?: Types.ObjectId;
  user_id?: Types.ObjectId;

  // Contact info (for non-authenticated users or override)
  contact_first_name: string;
  contact_last_name: string;
  contact_email: string;
  contact_phone?: string;
  preferred_contact_method: 'email' | 'phone' | 'both';
  preferred_language: SupportedLanguage;

  inquiry_type: LeadInquiryType;
  message: string;

  status: LeadStatus;
  priority: LeadPriority;
  source: LeadSource;

  assigned_to?: Types.ObjectId;
  viewing_scheduled_at?: Date;
  follow_up_date?: Date;

  notes: LeadNoteDocument[];

  first_response_at?: Date;
  closed_at?: Date;
  close_reason?: string;

  created_at: Date;
  updated_at: Date;
}

/**
 * Lead note document
 */
export interface LeadNoteDocument {
  _id: Types.ObjectId;
  content: string;
  is_internal: boolean;
  created_by: Types.ObjectId;
  created_at: Date;
}

/**
 * Lead with populated references
 */
export interface PopulatedLead extends Omit<
  LeadDocument,
  'property_id' | 'agency_id' | 'assigned_to' | 'user_id'
> {
  property_id: {
    _id: Types.ObjectId;
    external_id: string;
    address: string;
    price: number;
    currency: string;
    category_id: Types.ObjectId;
    city_id: Types.ObjectId;
    canton_id: Types.ObjectId;
  };
  agency_id?: {
    _id: Types.ObjectId;
    name: string;
    slug: string;
  };
  user_id?: {
    _id: Types.ObjectId;
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_to?: {
    _id: Types.ObjectId;
    first_name: string;
    last_name: string;
  };
}

/**
 * Lead filter options for repository
 */
export interface LeadFilterOptions {
  property_id?: Types.ObjectId;
  agency_id?: Types.ObjectId;
  user_id?: Types.ObjectId;
  assigned_to?: Types.ObjectId;
  status?: LeadStatus | LeadStatus[];
  priority?: LeadPriority | LeadPriority[];
  inquiry_type?: LeadInquiryType | LeadInquiryType[];
  source?: LeadSource | LeadSource[];
  date_from?: Date;
  date_to?: Date;
}

/**
 * Lead sort options
 */
export type LeadSortOption =
  | 'created_at_asc'
  | 'created_at_desc'
  | 'updated_at_asc'
  | 'updated_at_desc'
  | 'priority_asc'
  | 'priority_desc'
  | 'status_asc'
  | 'status_desc';
