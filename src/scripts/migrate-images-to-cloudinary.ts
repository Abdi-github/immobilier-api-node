/**
 * Image Migration Script: Download External Images and Upload to Cloudinary
 *
 * This script:
 * 1. Reads all property images from the database
 * 2. Downloads images from external URLs (immobilier.ch)
 * 3. Uploads them to Cloudinary
 * 4. Updates the database with new Cloudinary URLs
 *
 * Usage:
 *   npm run migrate:images
 *   npm run migrate:images -- --dry-run      # Preview without making changes
 *   npm run migrate:images -- --batch=50     # Process 50 images at a time
 *   npm run migrate:images -- --skip=100     # Skip first 100 images
 *   npm run migrate:images -- --property=ID  # Migrate images for specific property
 */

import mongoose from 'mongoose';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import pLimit from 'p-limit';
import { Readable } from 'stream';

import { config } from '../config/index.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../shared/logger/index.js';
import { PropertyImage } from '../modules/property/property-image.model.js';

// Configuration
interface MigrationConfig {
  dryRun: boolean;
  batchSize: number;
  skip: number;
  propertyId: string | null;
  concurrency: number;
  retryAttempts: number;
  retryDelay: number;
}

// Migration statistics
interface MigrationStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  alreadyMigrated: number;
  errors: Array<{ imageId: string; url: string; error: string }>;
}

// Parse command line arguments
function parseArgs(): MigrationConfig {
  const args = process.argv.slice(2);
  const config: MigrationConfig = {
    dryRun: args.includes('--dry-run'),
    batchSize: 50,
    skip: 0,
    propertyId: null,
    concurrency: 5, // Process 5 images concurrently
    retryAttempts: 3,
    retryDelay: 1000,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--batch=')) {
      config.batchSize = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--skip=')) {
      config.skip = parseInt(arg.split('=')[1], 10);
    }
    if (arg.startsWith('--property=')) {
      config.propertyId = arg.split('=')[1];
    }
    if (arg.startsWith('--concurrency=')) {
      config.concurrency = parseInt(arg.split('=')[1], 10);
    }
  });

  return config;
}

// Configure Cloudinary
function configureCloudinary(): void {
  if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
    throw new Error(
      'Cloudinary configuration is incomplete. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.'
    );
  }

  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });

  logger.info('Cloudinary configured successfully');
}

// Check if URL is already a Cloudinary URL
function isCloudinaryUrl(url: string): boolean {
  return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
}

// Check if URL is an external immobilier.ch URL
function isExternalUrl(url: string): boolean {
  return url.includes('immobilier.ch') || url.startsWith('http');
}

// Download image from URL with retries
async function downloadImage(
  url: string,
  retryAttempts: number,
  retryDelay: number
): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          Referer: 'https://www.immobilier.ch/',
        },
      });

      return Buffer.from(response.data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (attempt < retryAttempts) {
        logger.warn(
          `Download attempt ${attempt}/${retryAttempts} failed for ${url}: ${errorMessage}. Retrying in ${retryDelay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      } else {
        logger.error(`All ${retryAttempts} download attempts failed for ${url}: ${errorMessage}`);
        return null;
      }
    }
  }

  return null;
}

// Upload buffer to Cloudinary with timeout
async function uploadToCloudinary(
  buffer: Buffer,
  propertyId: string,
  imageId: string
): Promise<string | null> {
  try {
    const uploadPromise = new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${config.cloudinary.folder}/properties/${propertyId}`,
          public_id: imageId,
          resource_type: 'image',
          format: 'webp',
          quality: 'auto:good',
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
            },
          ],
          eager_async: true,
          timeout: 120000, // 2 minute timeout
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );

      // Create a readable stream from buffer and pipe to upload stream
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    // Add a timeout wrapper
    const timeoutPromise = new Promise<string>((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 2 minutes')), 120000);
    });

    return await Promise.race([uploadPromise, timeoutPromise]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Cloudinary upload failed for image ${imageId}: ${errorMessage}`);
    return null;
  }
}

// Process a single image
async function processImage(
  image: { _id: mongoose.Types.ObjectId; property_id: mongoose.Types.ObjectId; url: string },
  migrationConfig: MigrationConfig,
  stats: MigrationStats
): Promise<void> {
  const imageId = image._id.toString();
  const propertyId = image.property_id.toString();
  const originalUrl = image.url;

  // Skip if already migrated to Cloudinary
  if (isCloudinaryUrl(originalUrl)) {
    stats.alreadyMigrated++;
    logger.debug(`Image ${imageId} already on Cloudinary, skipping`);
    return;
  }

  // Skip if not an external URL
  if (!isExternalUrl(originalUrl)) {
    stats.skipped++;
    logger.debug(`Image ${imageId} is not an external URL, skipping`);
    return;
  }

  logger.info(`Processing image ${imageId} from property ${propertyId}`);
  logger.debug(`  Original URL: ${originalUrl}`);

  if (migrationConfig.dryRun) {
    logger.info(`  [DRY RUN] Would download and upload image ${imageId}`);
    stats.successful++;
    return;
  }

  // Download image
  const imageBuffer = await downloadImage(
    originalUrl,
    migrationConfig.retryAttempts,
    migrationConfig.retryDelay
  );

  if (!imageBuffer) {
    stats.failed++;
    stats.errors.push({
      imageId,
      url: originalUrl,
      error: 'Failed to download image after multiple attempts',
    });
    return;
  }

  logger.debug(`  Downloaded ${imageBuffer.length} bytes`);

  // Upload to Cloudinary
  const cloudinaryUrl = await uploadToCloudinary(imageBuffer, propertyId, imageId);

  if (!cloudinaryUrl) {
    stats.failed++;
    stats.errors.push({
      imageId,
      url: originalUrl,
      error: 'Failed to upload to Cloudinary',
    });
    return;
  }

  logger.debug(`  Uploaded to Cloudinary: ${cloudinaryUrl}`);

  // Update database with new URL
  try {
    await PropertyImage.updateOne(
      { _id: image._id },
      {
        $set: {
          url: cloudinaryUrl,
          original_url: originalUrl, // Keep original URL for reference
          migrated_at: new Date(),
        },
      }
    );

    stats.successful++;
    logger.info(`  ✓ Successfully migrated image ${imageId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    stats.failed++;
    stats.errors.push({
      imageId,
      url: originalUrl,
      error: `Database update failed: ${errorMessage}`,
    });
    logger.error(`  ✗ Failed to update database for image ${imageId}: ${errorMessage}`);
  }
}

// Main migration function
async function migrateImages(): Promise<void> {
  const migrationConfig = parseArgs();
  const stats: MigrationStats = {
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    alreadyMigrated: 0,
    errors: [],
  };

  logger.info('='.repeat(60));
  logger.info('Image Migration to Cloudinary');
  logger.info('='.repeat(60));
  logger.info(`Configuration:`);
  logger.info(`  Dry Run: ${migrationConfig.dryRun}`);
  logger.info(`  Batch Size: ${migrationConfig.batchSize}`);
  logger.info(`  Skip: ${migrationConfig.skip}`);
  logger.info(`  Property ID: ${migrationConfig.propertyId || 'All properties'}`);
  logger.info(`  Concurrency: ${migrationConfig.concurrency}`);
  logger.info('='.repeat(60));

  try {
    // Connect to database
    await connectDatabase();
    logger.info('Connected to MongoDB');

    // Configure Cloudinary
    configureCloudinary();

    // Build query
    const query: Record<string, unknown> = {};
    if (migrationConfig.propertyId) {
      query.property_id = new mongoose.Types.ObjectId(migrationConfig.propertyId);
    }

    // Count total images
    stats.total = await PropertyImage.countDocuments(query);
    logger.info(`Total images to process: ${stats.total}`);

    if (stats.total === 0) {
      logger.info('No images found to migrate');
      return;
    }

    // Create concurrency limiter
    const limit = pLimit(migrationConfig.concurrency);

    // Process images in batches
    let skip = migrationConfig.skip;
    const batchSize = migrationConfig.batchSize;

    while (skip < stats.total) {
      logger.info(`\nProcessing batch: ${skip + 1} - ${Math.min(skip + batchSize, stats.total)}`);

      // Fetch batch of images
      const images = await PropertyImage.find(query)
        .skip(skip)
        .limit(batchSize)
        .select('_id property_id url')
        .lean();

      if (images.length === 0) {
        break;
      }

      // Process images concurrently within the batch
      const promises = images.map((image) =>
        limit(async () => {
          await processImage(
            image as {
              _id: mongoose.Types.ObjectId;
              property_id: mongoose.Types.ObjectId;
              url: string;
            },
            migrationConfig,
            stats
          );
          stats.processed++;
        })
      );

      await Promise.all(promises);

      // Progress update
      const progress = ((stats.processed / stats.total) * 100).toFixed(1);
      logger.info(`Progress: ${stats.processed}/${stats.total} (${progress}%)`);
      logger.info(
        `  Successful: ${stats.successful}, Failed: ${stats.failed}, Skipped: ${stats.skipped}, Already Migrated: ${stats.alreadyMigrated}`
      );

      skip += batchSize;

      // Small delay between batches to avoid rate limiting
      if (skip < stats.total) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Final summary
    logger.info('\n' + '='.repeat(60));
    logger.info('Migration Complete');
    logger.info('='.repeat(60));
    logger.info(`Total Images: ${stats.total}`);
    logger.info(`Processed: ${stats.processed}`);
    logger.info(`Successful: ${stats.successful}`);
    logger.info(`Failed: ${stats.failed}`);
    logger.info(`Skipped: ${stats.skipped}`);
    logger.info(`Already Migrated: ${stats.alreadyMigrated}`);

    if (stats.errors.length > 0) {
      logger.info('\nErrors:');
      stats.errors.forEach((err, index) => {
        logger.error(`  ${index + 1}. Image ${err.imageId}: ${err.error}`);
        logger.error(`     URL: ${err.url}`);
      });
    }

    if (migrationConfig.dryRun) {
      logger.info('\n[DRY RUN] No changes were made to the database.');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Migration failed: ${errorMessage}`);
    throw error;
  } finally {
    // Disconnect from database
    await disconnectDatabase();
    logger.info('Disconnected from MongoDB');
  }
}

// Run migration
migrateImages()
  .then(() => {
    logger.info('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration script failed:', error);
    process.exit(1);
  });
