import multer, { FileFilterCallback, StorageEngine, Multer } from 'multer';
import { Request, Response, NextFunction, RequestHandler } from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';

import { AppError } from '../errors/AppError.js';
import { logger } from '../logger/index.js';

/**
 * Allowed MIME types for image uploads
 */
const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

/**
 * Allowed file extensions for image uploads
 */
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'] as const;

/**
 * Upload configuration options
 */
export interface UploadConfig {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Maximum number of files per request (default: 10) */
  maxFiles?: number;
  /** Allowed MIME types */
  allowedMimeTypes?: readonly string[];
  /** Allowed file extensions */
  allowedExtensions?: readonly string[];
  /** Upload destination directory for disk storage */
  destination?: string;
  /** Field name for single file upload */
  fieldName?: string;
  /** Field names and max counts for multiple file uploads */
  fields?: Array<{ name: string; maxCount: number }>;
  /** Use memory storage (for Cloudinary) or disk storage */
  useMemoryStorage?: boolean;
  /** Preserve original filename */
  preserveFilename?: boolean;
}

/**
 * Default upload configuration
 */
const DEFAULT_CONFIG: Required<Omit<UploadConfig, 'fields'>> & Pick<UploadConfig, 'fields'> = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
  allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
  destination: path.join(os.tmpdir(), 'immobilier-uploads'),
  fieldName: 'image',
  useMemoryStorage: true, // Default to memory for Cloudinary
  preserveFilename: false,
};

/**
 * Extended Express Request with file information
 */
export interface UploadRequest extends Request {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

/**
 * Parsed file information for easier access
 */
export interface ParsedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer?: Buffer;
  size: number;
  path?: string;
  filename?: string;
  extension: string;
}

/**
 * Generate unique filename
 */
const generateUniqueFilename = (originalname: string): string => {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${randomString}${ext}`;
};

/**
 * File filter function for image validation
 */
const createFileFilter = (config: UploadConfig): multer.Options['fileFilter'] => {
  return (_req: Request, file: Express.Multer.File, callback: FileFilterCallback): void => {
    const allowedMimeTypes = config.allowedMimeTypes || DEFAULT_CONFIG.allowedMimeTypes;
    const allowedExtensions = config.allowedExtensions || DEFAULT_CONFIG.allowedExtensions;

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new AppError(
        `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
        400,
        'VALID_INVALID_FILE_TYPE'
      );
      callback(error as unknown as Error);
      return;
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext as (typeof ALLOWED_IMAGE_EXTENSIONS)[number])) {
      const error = new AppError(
        `Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`,
        400,
        'VALID_INVALID_FILE_EXTENSION'
      );
      callback(error as unknown as Error);
      return;
    }

    callback(null, true);
  };
};

/**
 * Create disk storage configuration
 */
const createDiskStorage = (config: UploadConfig): StorageEngine => {
  const destination = config.destination || DEFAULT_CONFIG.destination;

  // Ensure destination directory exists
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      if (config.preserveFilename) {
        cb(null, file.originalname);
      } else {
        cb(null, generateUniqueFilename(file.originalname));
      }
    },
  });
};

/**
 * Create Multer instance with configuration
 */
const createMulterInstance = (config: UploadConfig = {}): Multer => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const storage = mergedConfig.useMemoryStorage
    ? multer.memoryStorage()
    : createDiskStorage(mergedConfig);

  return multer({
    storage,
    limits: {
      fileSize: mergedConfig.maxFileSize,
      files: mergedConfig.maxFiles,
    },
    fileFilter: createFileFilter(mergedConfig),
  });
};

/**
 * Upload error handler middleware
 */
const handleUploadError = (
  error: Error,
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (error instanceof multer.MulterError) {
    let message: string;
    let code: string;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds the maximum allowed limit';
        code = 'VALID_FILE_TOO_LARGE';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files uploaded';
        code = 'VALID_TOO_MANY_FILES';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected field name for file upload';
        code = 'VALID_UNEXPECTED_FIELD';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Too many parts in the request';
        code = 'VALID_TOO_MANY_PARTS';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Field name is too long';
        code = 'VALID_FIELD_NAME_TOO_LONG';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Field value is too long';
        code = 'VALID_FIELD_VALUE_TOO_LONG';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields in the request';
        code = 'VALID_TOO_MANY_FIELDS';
        break;
      default:
        message = `Upload error: ${error.message}`;
        code = 'VALID_UPLOAD_ERROR';
    }

    logger.warn('Multer upload error', { code: error.code, message: error.message });
    next(new AppError(message, 400, code));
    return;
  }

  next(error);
};

/**
 * Parse uploaded files to easier format
 */
export const parseUploadedFiles = (req: UploadRequest): ParsedFile[] => {
  const files: ParsedFile[] = [];

  // Single file
  if (req.file) {
    files.push({
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      encoding: req.file.encoding,
      mimetype: req.file.mimetype,
      buffer: req.file.buffer,
      size: req.file.size,
      path: req.file.path,
      filename: req.file.filename,
      extension: path.extname(req.file.originalname).toLowerCase(),
    });
  }

  // Multiple files (array)
  if (req.files && Array.isArray(req.files)) {
    for (const file of req.files) {
      files.push({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
        path: file.path,
        filename: file.filename,
        extension: path.extname(file.originalname).toLowerCase(),
      });
    }
  }

  // Multiple files (fields)
  if (req.files && !Array.isArray(req.files)) {
    for (const fieldFiles of Object.values(req.files)) {
      for (const file of fieldFiles) {
        files.push({
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
          path: file.path,
          filename: file.filename,
          extension: path.extname(file.originalname).toLowerCase(),
        });
      }
    }
  }

  return files;
};

/**
 * Cleanup temporary uploaded files
 */
export const cleanupUploadedFiles = async (files: ParsedFile[]): Promise<void> => {
  for (const file of files) {
    if (file.path) {
      try {
        await fs.promises.unlink(file.path);
        logger.debug('Cleaned up temporary file', { path: file.path });
      } catch (error) {
        logger.warn('Failed to cleanup temporary file', { path: file.path, error });
      }
    }
  }
};

/**
 * Validate that files exist in request
 */
export const validateFilesExist = (req: UploadRequest, minFiles = 1, maxFiles?: number): void => {
  const files = parseUploadedFiles(req);

  if (files.length < minFiles) {
    throw new AppError(`At least ${minFiles} file(s) must be uploaded`, 400, 'VALID_REQUIRED_FILE');
  }

  if (maxFiles !== undefined && files.length > maxFiles) {
    throw new AppError(`Maximum ${maxFiles} file(s) can be uploaded`, 400, 'VALID_TOO_MANY_FILES');
  }
};

// ==============================================
// Upload Middleware Factory Functions
// ==============================================

/**
 * Create single file upload middleware
 */
export const uploadSingle = (
  fieldName: string = 'image',
  config: UploadConfig = {}
): RequestHandler[] => {
  const upload = createMulterInstance(config);

  return [upload.single(fieldName), handleUploadError as unknown as RequestHandler];
};

/**
 * Create multiple files upload middleware (same field)
 */
export const uploadMultiple = (
  fieldName: string = 'images',
  maxCount: number = 10,
  config: UploadConfig = {}
): RequestHandler[] => {
  const upload = createMulterInstance({ ...config, maxFiles: maxCount });

  return [upload.array(fieldName, maxCount), handleUploadError as unknown as RequestHandler];
};

/**
 * Create multiple fields upload middleware
 */
export const uploadFields = (
  fields: Array<{ name: string; maxCount: number }>,
  config: UploadConfig = {}
): RequestHandler[] => {
  const totalMaxFiles = fields.reduce((sum, field) => sum + field.maxCount, 0);
  const upload = createMulterInstance({ ...config, maxFiles: totalMaxFiles });

  return [upload.fields(fields), handleUploadError as unknown as RequestHandler];
};

/**
 * Create any file upload middleware (no specific fields)
 */
export const uploadAny = (config: UploadConfig = {}): RequestHandler[] => {
  const upload = createMulterInstance(config);

  return [upload.any(), handleUploadError as unknown as RequestHandler];
};

/**
 * No file upload middleware (for requests without files)
 */
export const uploadNone = (): RequestHandler[] => {
  const upload = createMulterInstance();

  return [upload.none(), handleUploadError as unknown as RequestHandler];
};

// ==============================================
// Pre-configured Middleware for Property Images
// ==============================================

/**
 * Property image upload configuration
 */
const PROPERTY_IMAGE_CONFIG: UploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 20,
  allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
  allowedExtensions: ALLOWED_IMAGE_EXTENSIONS,
  useMemoryStorage: true, // For Cloudinary
};

/**
 * Upload single property image
 */
export const uploadPropertyImage = uploadSingle('image', PROPERTY_IMAGE_CONFIG);

/**
 * Upload multiple property images
 */
export const uploadPropertyImages = uploadMultiple('images', 20, PROPERTY_IMAGE_CONFIG);

/**
 * Upload property images with different fields
 */
export const uploadPropertyImageFields = uploadFields(
  [
    { name: 'primary', maxCount: 1 },
    { name: 'gallery', maxCount: 19 },
  ],
  PROPERTY_IMAGE_CONFIG
);

// ==============================================
// Validation Middleware
// ==============================================

/**
 * Middleware to validate that at least one image was uploaded
 */
export const requireImage: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    validateFilesExist(req as UploadRequest, 1);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate image count
 */
export const requireImages = (min: number, max?: number): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      validateFilesExist(req as UploadRequest, min, max);
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to make images optional (no validation)
 */
export const optionalImages: RequestHandler = (
  _req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next();
};

// ==============================================
// Cleanup Middleware
// ==============================================

/**
 * Middleware to cleanup uploaded files after request completes
 * Useful when using disk storage
 */
export const cleanupAfterRequest: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const uploadReq = req as UploadRequest;

  // Cleanup on response finish
  res.on('finish', async () => {
    const files = parseUploadedFiles(uploadReq);
    if (files.length > 0) {
      await cleanupUploadedFiles(files);
    }
  });

  // Cleanup on response error
  res.on('error', async () => {
    const files = parseUploadedFiles(uploadReq);
    if (files.length > 0) {
      await cleanupUploadedFiles(files);
    }
  });

  next();
};

// Export types
export type { FileFilterCallback };
export { ALLOWED_IMAGE_MIME_TYPES, ALLOWED_IMAGE_EXTENSIONS };
