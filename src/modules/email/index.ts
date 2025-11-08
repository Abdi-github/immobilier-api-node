/**
 * Email Module Index
 *
 * Exports all email-related services, types, and utilities.
 */

// Types
export * from './email.types.js';

// Transporter
export {
  emailTransporter,
  createTransporter,
  getTransporter,
  verifyTransporter,
  closeTransporter,
} from './email.transporter.js';

// Queue
export {
  initializeEmailQueue,
  addEmailJob,
  addBulkEmailJobs,
  getJob,
  getJobStatus,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanOldJobs,
  closeQueue,
} from './email.queue.js';

// Service
export {
  EmailService,
  emailService,
  initializeEmailService,
  shutdownEmailService,
  sendEmailVerification,
  sendWelcomeEmail,
  sendPasswordReset,
  sendPasswordChanged,
  sendPropertySubmitted,
  sendPropertyApproved,
  sendPropertyRejected,
  sendPropertyPublished,
  sendNewLeadNotification,
  sendMassEmail,
  sendNewsletter,
  sendAnnouncement,
  getEmailStats,
  clearEmailTemplateCache,
} from './email.service.js';

// Template utilities
export { renderTemplate, clearTemplateCache, preloadTemplates } from './email.template.js';

// Default export for convenience
export { emailService as default } from './email.service.js';
