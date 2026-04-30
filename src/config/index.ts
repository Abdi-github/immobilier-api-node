import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Supported languages type
export type SupportedLanguage = 'en' | 'fr' | 'de' | 'it';

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4003',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4200',
  'http://localhost:4203',
];

const resolveCorsOrigins = (): string[] => {
  const configuredOrigins = process.env.CORS_ORIGIN?.split(',') || DEFAULT_CORS_ORIGINS;
  const trimmedOrigins = configuredOrigins.map((origin) => origin.trim()).filter(Boolean);

  if ((process.env.NODE_ENV || 'development') !== 'development') {
    return Array.from(new Set(trimmedOrigins));
  }

  const expandedOrigins = new Set<string>();

  for (const origin of trimmedOrigins) {
    expandedOrigins.add(origin);

    try {
      const url = new URL(origin);
      if (!['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) {
        continue;
      }

      for (const hostname of ['localhost', '127.0.0.1', '0.0.0.0']) {
        expandedOrigins.add(`${url.protocol}//${hostname}${url.port ? `:${url.port}` : ''}`);
      }
    } catch {
      expandedOrigins.add(origin);
    }
  }

  return Array.from(expandedOrigins);
};

// Configuration object
export const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4003', 10),
  apiVersion: process.env.API_VERSION || 'v1',
  apiPrefix: process.env.API_PREFIX || '/api',

  // Database - MongoDB
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/immobilier_dev',
    dbName: process.env.MONGODB_DB_NAME || 'immobilier_dev',
  },

  // Cache - Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // JWT Authentication
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '7d',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '30d',
    issuer: process.env.JWT_ISSUER || 'immobilier.ch',
    audience: process.env.JWT_AUDIENCE || 'immobilier.ch',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequestsGuest: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_GUEST || '100', 10),
    maxRequestsAuth: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_AUTH || '300', 10),
    maxRequestsAdmin: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_ADMIN || '1000', 10),
  },

  // CORS
  cors: {
    origin: resolveCorsOrigins(),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'immobilier',
  },

  // Image Upload Settings
  imageUpload: {
    maxFileSize: parseInt(process.env.MAX_IMAGE_SIZE || '10485760', 10), // 10MB
    maxImagesPerBatch: parseInt(process.env.MAX_IMAGES_PER_BATCH || '10', 10),
    maxImagesPerProperty: parseInt(process.env.MAX_IMAGES_PER_PROPERTY || '50', 10),
    allowedMimeTypes: (
      process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp'
    ).split(','),
    enableOptimization: process.env.ENABLE_IMAGE_OPTIMIZATION !== 'false',
    thumbnailWidth: parseInt(process.env.THUMBNAIL_WIDTH || '300', 10),
    thumbnailHeight: parseInt(process.env.THUMBNAIL_HEIGHT || '200', 10),
    maxImageWidth: parseInt(process.env.MAX_IMAGE_WIDTH || '2000', 10),
    imageQuality: parseInt(process.env.IMAGE_QUALITY || '85', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    dir: process.env.LOG_DIR || 'logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  // i18n
  i18n: {
    defaultLanguage: (process.env.DEFAULT_LANGUAGE as SupportedLanguage) || 'en',
    supportedLanguages: (process.env.SUPPORTED_LANGUAGES?.split(',') as SupportedLanguage[]) || [
      'en',
      'fr',
      'de',
      'it',
    ],
  },

  // DeepL Translation
  deepl: {
    apiKey: process.env.DEEPL_API_KEY || '',
  },

  // Bcrypt
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },

  // Pagination
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  },

  // Email Configuration
  email: {
    host: process.env.MAIL_HOST || 'mailpit',
    port: parseInt(process.env.MAIL_PORT || '1025', 10),
    secure: process.env.MAIL_SECURE === 'true',
    auth: {
      user: process.env.MAIL_USER || '',
      pass: process.env.MAIL_PASSWORD || '',
    },
    from: {
      name: process.env.MAIL_FROM_NAME || 'Immobilier.ch',
      address: process.env.MAIL_FROM || 'noreply@immobilier.ch',
    },
    replyTo: process.env.MAIL_REPLY_TO || 'support@immobilier.ch',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@immobilier.ch',
    // Queue settings
    queue: {
      defaultAttempts: parseInt(process.env.EMAIL_QUEUE_MAX_RETRIES || '3', 10),
      backoffDelay: parseInt(process.env.EMAIL_QUEUE_BACKOFF || '5000', 10),
      removeOnComplete: parseInt(process.env.EMAIL_QUEUE_KEEP_COMPLETED || '100', 10),
      removeOnFail: parseInt(process.env.EMAIL_QUEUE_KEEP_FAILED || '500', 10),
      concurrency: parseInt(process.env.EMAIL_QUEUE_CONCURRENCY || '5', 10),
    },
    // Rate limiting for mass emails
    rateLimit: {
      max: parseInt(process.env.EMAIL_RATE_LIMIT_MAX || '100', 10),
      duration: parseInt(process.env.EMAIL_RATE_LIMIT_DURATION || '60000', 10), // 1 minute
    },
    // Batch settings for mass emails
    batch: {
      size: parseInt(process.env.EMAIL_BATCH_SIZE || '50', 10),
      delay: parseInt(process.env.EMAIL_BATCH_DELAY || '1000', 10), // 1 second between batches
    },
  },

  // Frontend URLs (for email links)
  frontend: {
    baseUrl: process.env.FRONTEND_URL || 'http://localhost:5174',
    adminUrl: process.env.FRONTEND_ADMIN_URL || 'http://localhost:5174',
    verifyEmailPath: '/verify-email',
    resetPasswordPath: '/reset-password',
    propertyPath: '/properties',
    dashboardPath: '/dashboard',
    unsubscribePath: '/unsubscribe',
  },

  // Development helpers
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
} as const;

// Validate required configuration in production
export const validateConfig = (): void => {
  if (config.isProduction) {
    const requiredEnvVars = ['JWT_SECRET', 'MONGODB_URI'];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    if (config.jwt.secret === 'dev-secret-key-change-in-production') {
      throw new Error('JWT_SECRET must be changed in production');
    }
  }
};

export default config;
