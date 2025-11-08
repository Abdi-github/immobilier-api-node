/**
 * Email Service
 *
 * High-level email service providing easy-to-use methods for sending
 * various types of emails with automatic queuing and templating.
 */

import config from '../../config/index.js';
import { logger } from '../../shared/logger/index.js';
import { SupportedLanguage } from '../auth/auth.types.js';
import {
  EmailType,
  EmailPriority,
  BulkEmailOptions,
} from './email.types.js';
import {
  addEmailJob,
  addBulkEmailJobs,
  initializeEmailQueue,
  getQueueStats,
  closeQueue,
} from './email.queue.js';
import { emailTransporter } from './email.transporter.js';
import { preloadTemplates, clearTemplateCache } from './email.template.js';

/**
 * Initialize email service
 */
export const initializeEmailService = async (): Promise<void> => {
  try {
    
    // Verify SMTP connection
    const isConnected = await emailTransporter.verify();
    if (!isConnected) {
      logger.warn('Email transporter verification failed - emails may not be delivered');
    } else {
    }

    // Initialize queue
    await initializeEmailQueue();

    // Preload templates in production
    if (config.isProduction) {
      await preloadTemplates();
    }

    logger.info('Email service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize email service', { error });
    throw error;
  }
};

/**
 * Shutdown email service
 */
export const shutdownEmailService = async (): Promise<void> => {
  await closeQueue();
  emailTransporter.close();
  clearTemplateCache();
  logger.info('Email service shut down');
};

// ===================================================
// User Registration & Authentication Emails
// ===================================================

/**
 * Send email verification
 */
export const sendEmailVerification = async (
  to: string,
  firstName: string,
  verificationToken: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const verificationUrl = `${config.frontend.baseUrl}${config.frontend.verifyEmailPath}?token=${verificationToken}`;

  const job = await addEmailJob({
    type: EmailType.EMAIL_VERIFICATION,
    to,
    language,
    data: {
      firstName,
      verificationUrl,
      expiresIn: '24 hours',
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.HIGH,
  });

  logger.info('Email verification queued', { to, jobId: job.id });
  return String(job.id);
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (
  to: string,
  firstName: string,
  userType: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const dashboardUrl = `${config.frontend.baseUrl}/dashboard`;
  const isOwnerOrAgent = ['owner', 'agent', 'agency_admin'].includes(userType);

  const job = await addEmailJob({
    type: EmailType.WELCOME,
    to,
    language,
    data: {
      firstName,
      userType,
      isOwnerOrAgent,
      dashboardUrl,
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.NORMAL,
  });

  logger.info('Welcome email queued', { to, jobId: job.id });
  return String(job.id);
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (
  to: string,
  firstName: string,
  resetToken: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const resetUrl = `${config.frontend.baseUrl}${config.frontend.resetPasswordPath}?token=${resetToken}`;

  const job = await addEmailJob({
    type: EmailType.PASSWORD_RESET,
    to,
    language,
    data: {
      firstName,
      resetUrl,
      expiresIn: '1 hour',
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.HIGH,
  });

  logger.info('Password reset email queued', { to, jobId: job.id });
  return String(job.id);
};

/**
 * Send password changed notification
 */
export const sendPasswordChanged = async (
  to: string,
  firstName: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const job = await addEmailJob({
    type: EmailType.PASSWORD_CHANGED,
    to,
    language,
    data: {
      firstName,
      changedAt: new Date().toISOString(),
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.HIGH,
  });

  logger.info('Password changed email queued', { to, jobId: job.id });
  return String(job.id);
};

// ===================================================
// Property Workflow Emails
// ===================================================

/**
 * Send property submission confirmation
 */
export const sendPropertySubmitted = async (
  to: string,
  firstName: string,
  propertyTitle: string,
  propertyAddress: string,
  propertyId: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const job = await addEmailJob({
    type: EmailType.PROPERTY_SUBMITTED,
    to,
    language,
    data: {
      firstName,
      propertyTitle,
      propertyAddress,
      propertyId,
      submissionDate: new Date().toLocaleDateString(language),
      dashboardUrl: `${config.frontend.adminUrl}${config.frontend.dashboardPath}/properties`,
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.NORMAL,
  });

  logger.info('Property submitted email queued', { to, propertyId, jobId: job.id });
  return String(job.id);
};

/**
 * Send property approved notification
 */
export const sendPropertyApproved = async (
  to: string,
  firstName: string,
  propertyTitle: string,
  propertyAddress: string,
  propertyPrice: number,
  isRent: boolean,
  propertyId: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const propertyUrl = `${config.frontend.baseUrl}${config.frontend.propertyPath}/${propertyId}`;
  const dashboardUrl = `${config.frontend.adminUrl}${config.frontend.dashboardPath}/properties`;

  const job = await addEmailJob({
    type: EmailType.PROPERTY_APPROVED,
    to,
    language,
    data: {
      firstName,
      propertyTitle,
      propertyAddress,
      propertyPrice,
      isRent,
      propertyId,
      propertyUrl,
      dashboardUrl,
      approvedDate: new Date().toLocaleDateString(language),
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.NORMAL,
  });

  logger.info('Property approved email queued', { to, propertyId, jobId: job.id });
  return String(job.id);
};

/**
 * Send property rejected notification
 */
export const sendPropertyRejected = async (
  to: string,
  firstName: string,
  propertyTitle: string,
  propertyAddress: string,
  propertyId: string,
  rejectionReason: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const editPropertyUrl = `${config.frontend.adminUrl}${config.frontend.dashboardPath}/properties/${propertyId}/edit`;

  const job = await addEmailJob({
    type: EmailType.PROPERTY_REJECTED,
    to,
    language,
    data: {
      firstName,
      propertyTitle,
      propertyAddress,
      propertyId,
      rejectionReason,
      editPropertyUrl,
      rejectedDate: new Date().toLocaleDateString(language),
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.HIGH,
  });

  logger.info('Property rejected email queued', { to, propertyId, jobId: job.id });
  return String(job.id);
};

/**
 * Send property published notification
 */
export const sendPropertyPublished = async (
  to: string,
  firstName: string,
  propertyTitle: string,
  propertyAddress: string,
  propertyPrice: number,
  isRent: boolean,
  propertyId: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const propertyUrl = `${config.frontend.baseUrl}${config.frontend.propertyPath}/${propertyId}`;
  const dashboardUrl = `${config.frontend.adminUrl}${config.frontend.dashboardPath}/properties`;

  const job = await addEmailJob({
    type: EmailType.PROPERTY_PUBLISHED,
    to,
    language,
    data: {
      firstName,
      propertyTitle,
      propertyAddress,
      propertyPrice,
      isRent,
      propertyId,
      propertyUrl,
      dashboardUrl,
      publishedDate: new Date().toLocaleDateString(language),
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.NORMAL,
  });

  logger.info('Property published email queued', { to, propertyId, jobId: job.id });
  return String(job.id);
};

// ===================================================
// Lead / Inquiry Emails
// ===================================================

/**
 * Send new lead notification to property owner/agent
 */
export const sendNewLeadNotification = async (
  to: string,
  firstName: string,
  propertyTitle: string,
  propertyAddress: string,
  leadName: string,
  leadEmail: string,
  leadPhone: string | undefined,
  leadMessage: string,
  language: SupportedLanguage = 'en'
): Promise<string> => {
  const dashboardUrl = `${config.frontend.adminUrl}${config.frontend.dashboardPath}/leads`;

  const job = await addEmailJob({
    type: EmailType.NEW_LEAD,
    to,
    language,
    data: {
      firstName,
      propertyTitle,
      propertyAddress,
      leadName,
      leadEmail,
      leadPhone,
      leadMessage,
      leadDate: new Date().toLocaleDateString(language),
      dashboardUrl,
      supportEmail: config.email.replyTo,
      currentYear: new Date().getFullYear(),
    },
    priority: EmailPriority.HIGH,
  });

  logger.info('New lead notification queued', { to, jobId: job.id });
  return String(job.id);
};

// ===================================================
// Mass Email / Newsletter
// ===================================================

/**
 * Send mass email (newsletter, announcement)
 */
export const sendMassEmail = async (
  options: BulkEmailOptions
): Promise<{ queued: number; failed: number }> => {
  const jobs = await addBulkEmailJobs(options);

  return {
    queued: jobs.length,
    failed: options.recipients.length - jobs.length,
  };
};

/**
 * Send newsletter
 */
export const sendNewsletter = async (
  recipients: Array<{ email: string; name: string; language: SupportedLanguage }>,
  subject: string,
  content: string,
  ctaText?: string,
  ctaUrl?: string
): Promise<{ queued: number; failed: number }> => {
  return sendMassEmail({
    type: EmailType.NEWSLETTER,
    recipients: recipients.map((r) => ({
      ...r,
      data: {
        subject,
        content,
        ctaText,
        ctaUrl,
        unsubscribeUrl: `${config.frontend.baseUrl}${config.frontend.unsubscribePath}`,
      },
    })),
    priority: EmailPriority.LOW,
    batchSize: config.email.batch.size,
    delayBetweenBatches: config.email.batch.delay,
  });
};

/**
 * Send announcement
 */
export const sendAnnouncement = async (
  recipients: Array<{ email: string; name: string; language: SupportedLanguage }>,
  subject: string,
  content: string
): Promise<{ queued: number; failed: number }> => {
  return sendMassEmail({
    type: EmailType.ANNOUNCEMENT,
    recipients: recipients.map((r) => ({
      ...r,
      data: {
        subject,
        content,
        unsubscribeUrl: `${config.frontend.baseUrl}${config.frontend.unsubscribePath}`,
      },
    })),
    priority: EmailPriority.NORMAL,
    batchSize: config.email.batch.size,
    delayBetweenBatches: config.email.batch.delay,
  });
};

// ===================================================
// Utility Functions
// ===================================================

/**
 * Get email queue statistics
 */
export const getEmailStats = async () => {
  return getQueueStats();
};

/**
 * Clear template cache (for development)
 */
export const clearEmailTemplateCache = (): void => {
  clearTemplateCache();
};

/**
 * Email Service singleton instance
 */
export const emailService = {
  initialize: initializeEmailService,
  shutdown: shutdownEmailService,
  // User emails
  sendEmailVerification,
  sendWelcomeEmail,
  sendPasswordReset,
  sendPasswordChanged,
  // Property emails
  sendPropertySubmitted,
  sendPropertyApproved,
  sendPropertyRejected,
  sendPropertyPublished,
  // Lead emails
  sendNewLeadNotification,
  // Mass emails
  sendMassEmail,
  sendNewsletter,
  sendAnnouncement,
  // Utilities
  getStats: getEmailStats,
  clearTemplateCache: clearEmailTemplateCache,
};

/**
 * EmailService class for dependency injection
 */
export class EmailService {
  async initialize(): Promise<void> {
    return initializeEmailService();
  }

  async shutdown(): Promise<void> {
    return shutdownEmailService();
  }

  async sendEmailVerification(
    to: string,
    firstName: string,
    verificationToken: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendEmailVerification(to, firstName, verificationToken, language);
  }

  async sendWelcomeEmail(
    to: string,
    firstName: string,
    userType: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendWelcomeEmail(to, firstName, userType, language);
  }

  async sendPasswordReset(
    to: string,
    firstName: string,
    resetToken: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendPasswordReset(to, firstName, resetToken, language);
  }

  async sendPasswordChanged(
    to: string,
    firstName: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendPasswordChanged(to, firstName, language);
  }

  async sendPropertySubmitted(
    to: string,
    firstName: string,
    propertyTitle: string,
    propertyAddress: string,
    propertyId: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendPropertySubmitted(
      to,
      firstName,
      propertyTitle,
      propertyAddress,
      propertyId,
      language
    );
  }

  async sendPropertyApproved(
    to: string,
    firstName: string,
    propertyTitle: string,
    propertyAddress: string,
    propertyPrice: number,
    isRent: boolean,
    propertyId: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendPropertyApproved(
      to,
      firstName,
      propertyTitle,
      propertyAddress,
      propertyPrice,
      isRent,
      propertyId,
      language
    );
  }

  async sendPropertyRejected(
    to: string,
    firstName: string,
    propertyTitle: string,
    propertyAddress: string,
    propertyId: string,
    rejectionReason: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendPropertyRejected(
      to,
      firstName,
      propertyTitle,
      propertyAddress,
      propertyId,
      rejectionReason,
      language
    );
  }

  async sendPropertyPublished(
    to: string,
    firstName: string,
    propertyTitle: string,
    propertyAddress: string,
    propertyPrice: number,
    isRent: boolean,
    propertyId: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendPropertyPublished(
      to,
      firstName,
      propertyTitle,
      propertyAddress,
      propertyPrice,
      isRent,
      propertyId,
      language
    );
  }

  async sendNewLeadNotification(
    to: string,
    firstName: string,
    propertyTitle: string,
    propertyAddress: string,
    leadName: string,
    leadEmail: string,
    leadPhone: string | undefined,
    leadMessage: string,
    language: SupportedLanguage = 'en'
  ): Promise<string> {
    return sendNewLeadNotification(
      to,
      firstName,
      propertyTitle,
      propertyAddress,
      leadName,
      leadEmail,
      leadPhone,
      leadMessage,
      language
    );
  }

  async sendMassEmail(options: BulkEmailOptions): Promise<{ queued: number; failed: number }> {
    return sendMassEmail(options);
  }

  async getStats() {
    return getEmailStats();
  }

  clearTemplateCache(): void {
    clearEmailTemplateCache();
  }
}

export default emailService;
