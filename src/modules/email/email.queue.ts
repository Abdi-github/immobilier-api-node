/**
 * Email Queue Service
 *
 * Uses Bull (Redis-backed) job queue for reliable email delivery.
 * Features: automatic retries, rate limiting, priority queues, batch processing.
 */

import Bull, { Job, Queue, JobOptions } from 'bull';

import config from '../../config/index.js';
import { logger } from '../../shared/logger/index.js';
import {
  EmailJobPayload,
  EmailJobResult,
  EmailPriority,
  EmailType,
  EmailJobStatus,
  BulkEmailOptions,
} from './email.types.js';
import { emailTransporter } from './email.transporter.js';
import { renderTemplate } from './email.template.js';
import { SupportedLanguage } from '../auth/auth.types.js';

/**
 * Email queue name
 */
const QUEUE_NAME = 'email-queue';

/**
 * Bull queue instance
 */
let emailQueue: Queue<EmailJobPayload> | null = null;

/**
 * Initialize email queue
 */
export const initializeEmailQueue = async (): Promise<Queue<EmailJobPayload>> => {
  if (emailQueue) {
    return emailQueue;
  }

  logger.debug('Creating Bull queue...', {
    queueName: QUEUE_NAME,
    redisHost: config.redis.host,
    redisPort: config.redis.port,
  });

  emailQueue = new Bull<EmailJobPayload>(QUEUE_NAME, {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
    },
    defaultJobOptions: {
      attempts: config.email.queue.defaultAttempts,
      backoff: {
        type: 'exponential',
        delay: config.email.queue.backoffDelay,
      },
      removeOnComplete: config.email.queue.removeOnComplete,
      removeOnFail: config.email.queue.removeOnFail,
    },
    limiter: {
      max: config.email.rateLimit.max,
      duration: config.email.rateLimit.duration,
    },
    settings: {
      stalledInterval: 30000, // 30 seconds
      maxStalledCount: 3,
    },
  });

  logger.debug('Bull queue created, setting up event handlers...');

  // Set up event handlers
  setupQueueEventHandlers(emailQueue);

  logger.debug('Event handlers set, waiting for queue to be ready...');

  // Wait for queue to be ready using isReady() method
  try {
    await emailQueue.isReady();
    logger.debug('Queue is ready');
  } catch (error) {
    logger.error('Queue failed to become ready', { error });
    throw error;
  }

  logger.debug('Starting queue processor...');

  // Start processing jobs (non-blocking)
  emailQueue.process(config.email.queue.concurrency, processEmailJob);

  logger.info('Email queue initialized', {
    queueName: QUEUE_NAME,
    concurrency: config.email.queue.concurrency,
    rateLimit: `${config.email.rateLimit.max} per ${config.email.rateLimit.duration}ms`,
  });

  return emailQueue;
};

/**
 * Set up queue event handlers
 */
const setupQueueEventHandlers = (queue: Queue<EmailJobPayload>): void => {
  queue.on('completed', (job: Job<EmailJobPayload>, result: EmailJobResult) => {
    logger.info('Email job completed', {
      jobId: job.id,
      emailType: job.data.type,
      to: Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to,
      messageId: result.messageId,
    });
  });

  queue.on('failed', (job: Job<EmailJobPayload>, error: Error) => {
    logger.error('Email job failed', {
      jobId: job.id,
      emailType: job.data.type,
      to: Array.isArray(job.data.to) ? job.data.to.join(', ') : job.data.to,
      attempts: job.attemptsMade,
      error: error.message,
    });
  });

  queue.on('stalled', (job: Job<EmailJobPayload>) => {
    logger.warn('Email job stalled', {
      jobId: job.id,
      emailType: job.data.type,
    });
  });

  queue.on('error', (error: Error) => {
    logger.error('Email queue error', { error: error.message });
  });

  queue.on('waiting', (jobId: string) => {
    logger.debug('Email job waiting', { jobId });
  });
};

/**
 * Process email job
 */
const processEmailJob = async (job: Job<EmailJobPayload>): Promise<EmailJobResult> => {
  const { id, type, to, subject, html, text, language } = job.data;

  logger.debug('Processing email job', {
    jobId: job.id,
    internalId: id,
    type,
    to,
    attempt: job.attemptsMade + 1,
  });

  try {
    const result = await emailTransporter.sendMail({
      from: `${config.email.from.name} <${config.email.from.address}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      text,
      headers: {
        'X-Email-Type': type,
        'X-Email-Language': language,
        'X-Email-Job-Id': String(job.id),
      },
    });

    return {
      jobId: String(job.id),
      messageId: result.messageId,
      accepted: result.accepted as string[],
      rejected: result.rejected as string[],
      pending: [],
      envelope: {
        from: result.envelope.from || '',
        to: Array.isArray(result.envelope.to) ? result.envelope.to : [result.envelope.to || ''],
      },
      response: result.response,
    };
  } catch (error) {
    const err = error as Error;
    logger.error('Email sending failed', {
      jobId: job.id,
      type,
      to,
      error: err.message,
    });
    throw error;
  }
};

/**
 * Add email job to queue
 */
export interface AddEmailJobOptions {
  type: EmailType;
  to: string | string[];
  language: SupportedLanguage;
  data: Record<string, unknown>;
  priority?: EmailPriority;
  delay?: number;
  metadata?: Record<string, unknown>;
}

export const addEmailJob = async (options: AddEmailJobOptions): Promise<Job<EmailJobPayload>> => {
  const queue = await getQueue();

  const { type, to, language, data, priority = EmailPriority.NORMAL, delay, metadata } = options;

  // Render template
  const rendered = renderTemplate(type, language, data);
  if (!rendered) {
    throw new Error(`Failed to render email template: ${type} for ${language}`);
  }

  // Create job payload
  const payload: EmailJobPayload = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    language,
    priority,
    createdAt: new Date(),
    metadata,
  };

  // Job options
  const jobOptions: JobOptions = {
    priority,
    delay,
    jobId: payload.id,
  };

  const job = await queue.add(payload, jobOptions);

  logger.info('Email job queued', {
    jobId: job.id,
    type,
    to: Array.isArray(to) ? to.join(', ') : to,
    language,
    priority,
    delay,
  });

  return job;
};

/**
 * Add bulk email jobs (for mass sending)
 */
export const addBulkEmailJobs = async (
  options: BulkEmailOptions
): Promise<Job<EmailJobPayload>[]> => {
  await getQueue(); // Ensure queue is initialized
  const {
    type,
    recipients,
    priority = EmailPriority.LOW,
    batchSize = config.email.batch.size,
    delayBetweenBatches = config.email.batch.delay,
  } = options;

  const jobs: Job<EmailJobPayload>[] = [];
  const batches = Math.ceil(recipients.length / batchSize);

  logger.info('Starting bulk email send', {
    type,
    totalRecipients: recipients.length,
    batchSize,
    batches,
  });

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const batchIndex = Math.floor(i / batchSize);
    const delay = batchIndex * delayBetweenBatches;

    try {
      const job = await addEmailJob({
        type,
        to: recipient.email,
        language: recipient.language,
        data: {
          userName: recipient.name,
          ...recipient.data,
        },
        priority,
        delay,
        metadata: {
          bulkSend: true,
          batchIndex,
          recipientIndex: i,
        },
      });
      jobs.push(job);
    } catch (error) {
      logger.error('Failed to queue bulk email', {
        recipientEmail: recipient.email,
        error: (error as Error).message,
      });
    }
  }

  logger.info('Bulk email jobs queued', {
    type,
    queued: jobs.length,
    failed: recipients.length - jobs.length,
  });

  return jobs;
};

/**
 * Get queue instance
 */
export const getQueue = async (): Promise<Queue<EmailJobPayload>> => {
  if (!emailQueue) {
    return initializeEmailQueue();
  }
  return emailQueue;
};

/**
 * Get job by ID
 */
export const getJob = async (jobId: string): Promise<Job<EmailJobPayload> | null> => {
  const queue = await getQueue();
  return queue.getJob(jobId);
};

/**
 * Get job status
 */
export const getJobStatus = async (jobId: string): Promise<EmailJobStatus | null> => {
  const job = await getJob(jobId);
  if (!job) return null;

  const state = await job.getState();

  switch (state) {
    case 'waiting':
    case 'delayed':
      return EmailJobStatus.QUEUED;
    case 'active':
      return EmailJobStatus.PROCESSING;
    case 'completed':
      return EmailJobStatus.COMPLETED;
    case 'failed':
      return job.attemptsMade < (job.opts.attempts || 3)
        ? EmailJobStatus.RETRYING
        : EmailJobStatus.FAILED;
    default:
      return EmailJobStatus.QUEUED;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}> => {
  const queue = await getQueue();
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, paused };
};

/**
 * Pause queue
 */
export const pauseQueue = async (): Promise<void> => {
  const queue = await getQueue();
  await queue.pause();
  logger.info('Email queue paused');
};

/**
 * Resume queue
 */
export const resumeQueue = async (): Promise<void> => {
  const queue = await getQueue();
  await queue.resume();
  logger.info('Email queue resumed');
};

/**
 * Clean completed jobs older than specified age
 */
export const cleanOldJobs = async (olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> => {
  const queue = await getQueue();
  await queue.clean(olderThanMs, 'completed');
  await queue.clean(olderThanMs * 7, 'failed'); // Keep failed jobs longer
  logger.info('Old email jobs cleaned');
};

/**
 * Close queue connection
 */
export const closeQueue = async (): Promise<void> => {
  if (emailQueue) {
    await emailQueue.close();
    emailQueue = null;
    logger.info('Email queue closed');
  }
};

export default {
  initializeEmailQueue,
  addEmailJob,
  addBulkEmailJobs,
  getQueue,
  getJob,
  getJobStatus,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  cleanOldJobs,
  closeQueue,
};
