/**
 * Email Transporter
 *
 * Nodemailer transporter configuration for SMTP email delivery.
 */

import nodemailer, { Transporter } from 'nodemailer';
import SMTPPool from 'nodemailer/lib/smtp-pool/index.js';

import config from '../../config/index.js';
import { logger } from '../../shared/logger/index.js';

/**
 * SMTP Transporter instance (using pool for better performance)
 */
let transporter: Transporter<SMTPPool.SentMessageInfo> | null = null;

/**
 * Create and configure the email transporter
 */
export const createTransporter = (): Transporter<SMTPPool.SentMessageInfo> => {
  if (transporter) {
    return transporter;
  }

  const transportOptions: SMTPPool.Options = {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    // Authentication - only add if credentials are provided
    ...(config.email.auth.user &&
      config.email.auth.pass && {
        auth: {
          user: config.email.auth.user,
          pass: config.email.auth.pass,
        },
      }),
    // Connection timeout settings
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 30000, // 30 seconds
    // TLS settings
    tls: {
      rejectUnauthorized: config.isProduction, // Allow self-signed in dev
    },
  };

  transporter = nodemailer.createTransport(transportOptions);

  logger.info('Email transporter created', {
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    pooled: true,
  });

  return transporter;
};

/**
 * Get the email transporter (creates if not exists)
 */
export const getTransporter = (): Transporter<SMTPPool.SentMessageInfo> => {
  if (!transporter) {
    return createTransporter();
  }
  return transporter;
};

/**
 * Verify transporter connection
 */
export const verifyTransporter = async (): Promise<boolean> => {
  const transport = getTransporter();

  try {
    await transport.verify();
    logger.info('Email transporter connection verified');
    return true;
  } catch (error) {
    const err = error as Error;
    logger.error('Email transporter verification failed', {
      error: err.message,
      host: config.email.host,
      port: config.email.port,
    });
    return false;
  }
};

/**
 * Close transporter connection
 */
export const closeTransporter = (): void => {
  if (transporter) {
    transporter.close();
    transporter = null;
    logger.info('Email transporter closed');
  }
};

/**
 * Export transporter instance (lazy initialization)
 */
export const emailTransporter = {
  get instance() {
    return getTransporter();
  },
  sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
    const transport = getTransporter();
    return transport.sendMail(mailOptions);
  },
  verify: verifyTransporter,
  close: closeTransporter,
};

export default emailTransporter;
