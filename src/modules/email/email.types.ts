/**
 * Email Module Types
 *
 * Type definitions for the email service, templates, and queue jobs.
 */

import { SupportedLanguage } from '../auth/auth.types.js';

/**
 * Supported email types
 */
export enum EmailType {
  // User registration & verification
  EMAIL_VERIFICATION = 'email_verification',
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',

  // Property workflow
  PROPERTY_SUBMITTED = 'property_submitted',
  PROPERTY_APPROVED = 'property_approved',
  PROPERTY_REJECTED = 'property_rejected',
  PROPERTY_PUBLISHED = 'property_published',
  PROPERTY_ARCHIVED = 'property_archived',

  // Leads & inquiries
  NEW_LEAD = 'new_lead',
  LEAD_RESPONSE = 'lead_response',

  // Mass emails
  NEWSLETTER = 'newsletter',
  ANNOUNCEMENT = 'announcement',
  CUSTOM = 'custom',
}

/**
 * Email job priority levels
 */
export enum EmailPriority {
  LOW = 10,
  NORMAL = 5,
  HIGH = 3,
  CRITICAL = 1,
}

/**
 * Email job status
 */
export enum EmailJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

/**
 * Base email data interface
 */
export interface BaseEmailData {
  to: string | string[];
  subject?: string;
  language: SupportedLanguage;
  templateData?: Record<string, unknown>;
}

/**
 * Email verification data
 */
export interface EmailVerificationData extends BaseEmailData {
  userName: string;
  verificationUrl: string;
  expiresIn: string;
}

/**
 * Welcome email data
 */
export interface WelcomeEmailData extends BaseEmailData {
  userName: string;
  userType: string;
  loginUrl: string;
}

/**
 * Password reset data
 */
export interface PasswordResetData extends BaseEmailData {
  userName: string;
  resetUrl: string;
  expiresIn: string;
}

/**
 * Property submission data
 */
export interface PropertySubmittedData extends BaseEmailData {
  userName: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyId: string;
  submissionDate: string;
}

/**
 * Property approved data
 */
export interface PropertyApprovedData extends BaseEmailData {
  userName: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyId: string;
  propertyUrl: string;
  approvedDate: string;
}

/**
 * Property rejected data
 */
export interface PropertyRejectedData extends BaseEmailData {
  userName: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyId: string;
  rejectionReason: string;
  rejectedDate: string;
  editUrl: string;
}

/**
 * Property published data
 */
export interface PropertyPublishedData extends BaseEmailData {
  userName: string;
  propertyTitle: string;
  propertyAddress: string;
  propertyId: string;
  propertyUrl: string;
  publishedDate: string;
}

/**
 * New lead notification data
 */
export interface NewLeadData extends BaseEmailData {
  userName: string;
  propertyTitle: string;
  propertyAddress: string;
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  leadMessage: string;
  leadDate: string;
  dashboardUrl: string;
}

/**
 * Newsletter/mass email data
 */
export interface MassEmailData extends BaseEmailData {
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
}

/**
 * Generic email options
 */
export interface EmailOptions {
  type: EmailType;
  data: BaseEmailData;
  priority?: EmailPriority;
  delay?: number; // Delay in milliseconds
  attempts?: number; // Number of retry attempts
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
}

/**
 * Email job payload (stored in queue)
 */
export interface EmailJobPayload {
  id: string;
  type: EmailType;
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  language: SupportedLanguage;
  priority: EmailPriority;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Email job result
 */
export interface EmailJobResult {
  jobId: string;
  messageId?: string;
  accepted: string[];
  rejected: string[];
  pending: string[];
  envelope: {
    from: string;
    to: string[];
  };
  response?: string;
}

/**
 * Bulk email options for mass sending
 */
export interface BulkEmailOptions {
  type: EmailType;
  recipients: Array<{
    email: string;
    name: string;
    language: SupportedLanguage;
    data?: Record<string, unknown>;
  }>;
  priority?: EmailPriority;
  batchSize?: number;
  delayBetweenBatches?: number;
}

/**
 * Email statistics
 */
export interface EmailStatistics {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byType: Record<EmailType, number>;
  byLanguage: Record<SupportedLanguage, number>;
}

/**
 * Email configuration
 */
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    address: string;
  };
  replyTo?: string;
  // Rate limiting
  maxConcurrent?: number;
  rateLimit?: {
    max: number;
    duration: number; // in milliseconds
  };
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions: {
    attempts: number;
    backoff: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
    removeOnComplete: boolean | number;
    removeOnFail: boolean | number;
  };
}
