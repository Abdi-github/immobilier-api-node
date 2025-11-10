import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';
import sharp from 'sharp';

import { config } from '../../config/index.js';
import { logger } from '../logger/index.js';
import { AppError } from '../errors/AppError.js';

/**
 * Cloudinary configuration options
 */
interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/**
 * Image upload options
 */
export interface ImageUploadOptions {
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
  transformation?: CloudinaryTransformation[];
  tags?: string[];
  resource_type?: 'image' | 'video' | 'raw' | 'auto';
  format?: string;
  quality?: number | 'auto';
  eager?: CloudinaryTransformation[];
  eager_async?: boolean;
  allowed_formats?: string[];
}

/**
 * Cloudinary transformation options
 */
export interface CloudinaryTransformation {
  width?: number;
  height?: number;
  crop?: 'scale' | 'fit' | 'fill' | 'pad' | 'thumb' | 'crop' | 'limit' | 'mfit' | 'lfill' | 'auto';
  gravity?:
    | 'auto'
    | 'face'
    | 'center'
    | 'north'
    | 'south'
    | 'east'
    | 'west'
    | 'north_east'
    | 'north_west'
    | 'south_east'
    | 'south_west'
    | 'face:auto';
  quality?: number | 'auto' | 'auto:good' | 'auto:best' | 'auto:eco' | 'auto:low';
  format?: string;
  fetch_format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  effect?: string;
  radius?: number | 'max';
  angle?: number;
  opacity?: number;
  border?: string;
  background?: string;
  overlay?: string;
  underlay?: string;
  dpr?: number | 'auto';
  responsive_width?: boolean;
}

/**
 * Upload result interface
 */
export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  secure_url: string;
  original_filename: string;
  eager?: Array<{
    transformation: string;
    width: number;
    height: number;
    bytes: number;
    format: string;
    url: string;
    secure_url: string;
  }>;
}

/**
 * Processed image result with thumbnail
 */
export interface ProcessedImageResult {
  original: CloudinaryUploadResult;
  thumbnail?: {
    url: string;
    secure_url: string;
    width: number;
    height: number;
  };
}

/**
 * Batch upload result
 */
export interface BatchUploadResult {
  successful: ProcessedImageResult[];
  failed: Array<{
    filename: string;
    error: string;
  }>;
}

/**
 * Image deletion result
 */
export interface ImageDeletionResult {
  public_id: string;
  result: 'ok' | 'not found';
}

/**
 * Default upload options for property images
 */
const DEFAULT_PROPERTY_IMAGE_OPTIONS: ImageUploadOptions = {
  folder: 'immobilier/properties',
  resource_type: 'image',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  quality: 'auto',
  format: 'webp',
  transformation: [
    {
      width: 1920,
      height: 1080,
      crop: 'limit',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
  eager: [
    {
      width: 400,
      height: 300,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:good',
      fetch_format: 'auto',
    },
  ],
  eager_async: true,
};

/**
 * Cloudinary image upload/transform service (singleton)
 */
export class CloudinaryService {
  private static instance: CloudinaryService;
  private isConfigured = false;

  constructor() {
    this.configure();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CloudinaryService {
    if (!CloudinaryService.instance) {
      CloudinaryService.instance = new CloudinaryService();
    }
    return CloudinaryService.instance;
  }

  /**
   * Configure Cloudinary with environment variables
   */
  private configure(): void {
    const cloudinaryConfig: CloudinaryConfig = {
      cloudName: config.cloudinary.cloudName,
      apiKey: config.cloudinary.apiKey,
      apiSecret: config.cloudinary.apiSecret,
    };

    // Check if all required config values are present
    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
      logger.warn('Cloudinary configuration is incomplete. Image uploads will not work.');
      this.isConfigured = false;
      return;
    }

    cloudinary.config({
      cloud_name: cloudinaryConfig.cloudName,
      api_key: cloudinaryConfig.apiKey,
      api_secret: cloudinaryConfig.apiSecret,
      secure: true,
    });

    this.isConfigured = true;
    logger.info('Cloudinary service configured successfully');
  }

  /**
   * Check if Cloudinary is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Ensure Cloudinary is configured before operations
   */
  private ensureConfigured(): void {
    if (!this.isConfigured) {
      throw new AppError(
        'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
        500,
        'EXT_CLOUDINARY_NOT_CONFIGURED'
      );
    }
  }

  /**
   * Process image with Sharp before uploading (resize, optimize, convert format)
   */
  async preprocessImage(
    buffer: Buffer,
    options: {
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
      format?: 'jpeg' | 'png' | 'webp' | 'avif';
    } = {}
  ): Promise<Buffer> {
    const { maxWidth = 2048, maxHeight = 2048, quality = 85, format = 'webp' } = options;

    try {
      let sharpInstance = sharp(buffer).rotate(); // Auto-rotate based on EXIF

      // Get metadata
      const metadata = await sharpInstance.metadata();

      // Resize if necessary
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          sharpInstance = sharpInstance.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
      }

      // Convert to specified format with quality
      switch (format) {
        case 'jpeg':
          sharpInstance = sharpInstance.jpeg({ quality, mozjpeg: true });
          break;
        case 'png':
          sharpInstance = sharpInstance.png({ quality, compressionLevel: 9 });
          break;
        case 'webp':
          sharpInstance = sharpInstance.webp({ quality, effort: 6 });
          break;
        case 'avif':
          sharpInstance = sharpInstance.avif({ quality, effort: 6 });
          break;
      }

      return await sharpInstance.toBuffer();
    } catch (error) {
      logger.error('Image preprocessing failed', { error });
      throw new AppError('Failed to process image', 500, 'EXT_IMAGE_PROCESSING_FAILED');
    }
  }

  /**
   * Upload a single image from buffer
   */
  async uploadFromBuffer(
    buffer: Buffer,
    options: ImageUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    this.ensureConfigured();

    const mergedOptions = { ...DEFAULT_PROPERTY_IMAGE_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: mergedOptions.folder,
          public_id: mergedOptions.public_id,
          overwrite: mergedOptions.overwrite ?? false,
          resource_type: mergedOptions.resource_type || 'image',
          allowed_formats: mergedOptions.allowed_formats,
          format: mergedOptions.format,
          quality: mergedOptions.quality,
          transformation: mergedOptions.transformation,
          eager: mergedOptions.eager,
          eager_async: mergedOptions.eager_async,
          tags: mergedOptions.tags,
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            logger.error('Cloudinary upload failed', { error });
            reject(
              new AppError(
                `Image upload failed: ${error.message}`,
                500,
                'EXT_CLOUDINARY_UPLOAD_FAILED'
              )
            );
          } else if (result) {
            logger.info('Image uploaded successfully', {
              public_id: result.public_id,
              url: result.secure_url,
            });
            resolve(result as CloudinaryUploadResult);
          } else {
            reject(
              new AppError(
                'Image upload failed: No result returned',
                500,
                'EXT_CLOUDINARY_UPLOAD_FAILED'
              )
            );
          }
        }
      );

      // Convert buffer to readable stream and pipe to Cloudinary
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Upload image from file path
   */
  async uploadFromPath(
    filePath: string,
    options: ImageUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    this.ensureConfigured();

    const mergedOptions = { ...DEFAULT_PROPERTY_IMAGE_OPTIONS, ...options };

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: mergedOptions.folder,
        public_id: mergedOptions.public_id,
        overwrite: mergedOptions.overwrite ?? false,
        resource_type: mergedOptions.resource_type || 'image',
        allowed_formats: mergedOptions.allowed_formats,
        format: mergedOptions.format,
        quality: mergedOptions.quality,
        transformation: mergedOptions.transformation,
        eager: mergedOptions.eager,
        eager_async: mergedOptions.eager_async,
        tags: mergedOptions.tags,
      });

      logger.info('Image uploaded successfully', {
        public_id: result.public_id,
        url: result.secure_url,
      });

      return result as CloudinaryUploadResult;
    } catch (error) {
      logger.error('Cloudinary upload from path failed', { error, filePath });
      throw new AppError('Image upload failed', 500, 'EXT_CLOUDINARY_UPLOAD_FAILED');
    }
  }

  /**
   * Upload image from URL
   */
  async uploadFromUrl(
    url: string,
    options: ImageUploadOptions = {}
  ): Promise<CloudinaryUploadResult> {
    this.ensureConfigured();

    const mergedOptions = { ...DEFAULT_PROPERTY_IMAGE_OPTIONS, ...options };

    try {
      const result = await cloudinary.uploader.upload(url, {
        folder: mergedOptions.folder,
        public_id: mergedOptions.public_id,
        overwrite: mergedOptions.overwrite ?? false,
        resource_type: mergedOptions.resource_type || 'image',
        allowed_formats: mergedOptions.allowed_formats,
        format: mergedOptions.format,
        quality: mergedOptions.quality,
        transformation: mergedOptions.transformation,
        eager: mergedOptions.eager,
        eager_async: mergedOptions.eager_async,
        tags: mergedOptions.tags,
      });

      logger.info('Image uploaded from URL successfully', {
        public_id: result.public_id,
        originalUrl: url,
        newUrl: result.secure_url,
      });

      return result as CloudinaryUploadResult;
    } catch (error) {
      logger.error('Cloudinary upload from URL failed', { error, url });
      throw new AppError('Image upload from URL failed', 500, 'EXT_CLOUDINARY_UPLOAD_FAILED');
    }
  }

  /**
   * Upload and process image with automatic thumbnail generation
   */
  async uploadWithThumbnail(
    buffer: Buffer,
    options: ImageUploadOptions = {}
  ): Promise<ProcessedImageResult> {
    this.ensureConfigured();

    // Preprocess image with Sharp
    const processedBuffer = await this.preprocessImage(buffer);

    // Upload with eager transformation for thumbnail
    const uploadOptions: ImageUploadOptions = {
      ...options,
      eager: [
        {
          width: 400,
          height: 300,
          crop: 'fill',
          gravity: 'auto',
          quality: 'auto:good',
          fetch_format: 'auto',
        },
        ...(options.eager || []),
      ],
      eager_async: false, // Wait for thumbnail generation
    };

    const result = await this.uploadFromBuffer(processedBuffer, uploadOptions);

    // Extract thumbnail from eager transformations
    const thumbnail = result.eager?.[0];

    return {
      original: result,
      thumbnail: thumbnail
        ? {
            url: thumbnail.url,
            secure_url: thumbnail.secure_url,
            width: thumbnail.width,
            height: thumbnail.height,
          }
        : undefined,
    };
  }

  /**
   * Batch upload multiple images
   */
  async uploadBatch(
    files: Array<{ buffer: Buffer; filename: string; options?: ImageUploadOptions }>,
    options: ImageUploadOptions = {}
  ): Promise<BatchUploadResult> {
    this.ensureConfigured();

    const results: BatchUploadResult = {
      successful: [],
      failed: [],
    };

    // Process uploads concurrently with limit
    const CONCURRENT_LIMIT = 5;
    const batches = this.chunkArray(files, CONCURRENT_LIMIT);

    for (const batch of batches) {
      const batchPromises = batch.map(async (file) => {
        try {
          const mergedOptions = { ...options, ...file.options };
          const result = await this.uploadWithThumbnail(file.buffer, mergedOptions);
          results.successful.push(result);
        } catch (error) {
          results.failed.push({
            filename: file.filename,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(batchPromises);
    }

    logger.info('Batch upload completed', {
      successful: results.successful.length,
      failed: results.failed.length,
    });

    return results;
  }

  /**
   * Delete a single image by public_id
   */
  async delete(publicId: string): Promise<ImageDeletionResult> {
    this.ensureConfigured();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await cloudinary.uploader.destroy(publicId);

      logger.info('Image deleted', { publicId, result: result.result });

      return {
        public_id: publicId,
        result: result.result as 'ok' | 'not found',
      };
    } catch (error) {
      logger.error('Cloudinary delete failed', { error, publicId });
      throw new AppError('Image deletion failed', 500, 'EXT_CLOUDINARY_DELETE_FAILED');
    }
  }

  /**
   * Delete multiple images by public_ids
   */
  async deleteBatch(publicIds: string[]): Promise<ImageDeletionResult[]> {
    this.ensureConfigured();

    if (publicIds.length === 0) {
      return [];
    }

    try {
      const result = await cloudinary.api.delete_resources(publicIds);

      const deletionResults: ImageDeletionResult[] = Object.entries(result.deleted || {}).map(
        ([publicId, status]) => ({
          public_id: publicId,
          result: status as 'ok' | 'not found',
        })
      );

      logger.info('Batch delete completed', {
        requested: publicIds.length,
        deleted: deletionResults.filter((r) => r.result === 'ok').length,
      });

      return deletionResults;
    } catch (error) {
      logger.error('Cloudinary batch delete failed', { error, publicIds });
      throw new AppError('Batch image deletion failed', 500, 'EXT_CLOUDINARY_BATCH_DELETE_FAILED');
    }
  }

  /**
   * Delete all images in a folder
   */
  async deleteFolder(folderPath: string): Promise<{ deleted: number }> {
    this.ensureConfigured();

    try {
      // First, get all resources in the folder
      const resources = await cloudinary.api.resources({
        type: 'upload',
        prefix: folderPath,
        max_results: 500,
      });

      if (resources.resources.length === 0) {
        return { deleted: 0 };
      }

      const publicIds = resources.resources.map((r: { public_id: string }) => r.public_id);
      await this.deleteBatch(publicIds);

      // Delete the folder itself
      await cloudinary.api.delete_folder(folderPath);

      logger.info('Folder deleted', { folderPath, resourcesDeleted: publicIds.length });

      return { deleted: publicIds.length };
    } catch (error) {
      logger.error('Cloudinary folder delete failed', { error, folderPath });
      throw new AppError('Folder deletion failed', 500, 'EXT_CLOUDINARY_FOLDER_DELETE_FAILED');
    }
  }

  /**
   * Generate a signed upload URL for direct client uploads
   */
  generateSignedUploadUrl(
    options: {
      folder?: string;
      publicId?: string;
      maxFileSize?: number;
      allowedFormats?: string[];
      expiresIn?: number;
    } = {}
  ): {
    uploadUrl: string;
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
  } {
    this.ensureConfigured();

    const timestamp = Math.round(Date.now() / 1000);

    const params: Record<string, unknown> = {
      timestamp,
      folder: options.folder || 'immobilier/properties',
      ...(options.publicId && { public_id: options.publicId }),
      ...(options.allowedFormats && { allowed_formats: options.allowedFormats.join(',') }),
    };

    const signature = cloudinary.utils.api_sign_request(params, config.cloudinary.apiSecret);

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`,
      signature,
      timestamp,
      apiKey: config.cloudinary.apiKey,
      cloudName: config.cloudinary.cloudName,
    };
  }

  /**
   * Generate transformation URL for an existing image
   */
  generateTransformationUrl(publicId: string, transformations: CloudinaryTransformation[]): string {
    this.ensureConfigured();

    return cloudinary.url(publicId, {
      transformation: transformations,
      secure: true,
    });
  }

  /**
   * Get image info/metadata
   */
  async getImageInfo(publicId: string): Promise<Record<string, unknown>> {
    this.ensureConfigured();

    try {
      const result = await cloudinary.api.resource(publicId, {
        image_metadata: true,
        exif: true,
        colors: true,
        faces: true,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get image info', { error, publicId });
      throw new AppError('Failed to get image info', 500, 'EXT_CLOUDINARY_INFO_FAILED');
    }
  }

  /**
   * Update image metadata/tags
   */
  async updateImageMetadata(
    publicId: string,
    updates: { tags?: string[]; context?: Record<string, string> }
  ): Promise<void> {
    this.ensureConfigured();

    try {
      if (updates.tags) {
        await cloudinary.uploader.replace_tag(updates.tags.join(','), [publicId]);
      }

      if (updates.context) {
        const contextString = Object.entries(updates.context)
          .map(([key, value]) => `${key}=${value}`)
          .join('|');
        await cloudinary.uploader.add_context(contextString, [publicId]);
      }

      logger.info('Image metadata updated', { publicId, updates });
    } catch (error) {
      logger.error('Failed to update image metadata', { error, publicId });
      throw new AppError('Failed to update image metadata', 500, 'EXT_CLOUDINARY_UPDATE_FAILED');
    }
  }

  /**
   * Helper: Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const cloudinaryService = CloudinaryService.getInstance();
