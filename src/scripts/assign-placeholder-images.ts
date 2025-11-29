/**
 * Placeholder Image Assignment Script
 *
 * This script:
 * 1. Uploads placeholder images to Cloudinary (once per unique image)
 * 2. Assigns uploaded images to properties that have 404/failed images
 * 3. Maps images by category (apartment, house, parking, plot)
 *
 * Usage:
 *   npm run assign:placeholders
 *   npm run assign:placeholders -- --dry-run      # Preview without making changes
 *   npm run assign:placeholders -- --upload-only  # Only upload images, don't assign
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

import { config } from '../config/index.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../shared/logger/index.js';
import { PropertyImage } from '../modules/property/property-image.model.js';
import { Property } from '../modules/property/property.model.js';
import { Category } from '../modules/category/category.model.js';

// Configuration
interface ScriptConfig {
  dryRun: boolean;
  uploadOnly: boolean;
}

// Uploaded image info
interface UploadedImage {
  localPath: string;
  cloudinaryUrl: string;
  publicId: string;
  isMain: boolean;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

// Category image set
interface CategoryImageSet {
  categorySlug: string;
  propertySets: {
    name: string;
    images: UploadedImage[];
  }[];
}

// Parse command line arguments
function parseArgs(): ScriptConfig {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    uploadOnly: args.includes('--upload-only'),
  };
}

// Configure Cloudinary
function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
  logger.info('Cloudinary configured');
}

// Get all placeholder images organized by category
function getPlaceholderImages(): Map<string, Map<string, string[]>> {
  const baseDir = path.resolve(process.cwd(), 'data/placeholder_images');
  const result = new Map<string, Map<string, string[]>>();

  const categories = ['apartement', 'house', 'parking', 'plot']; // Note: 'apartement' spelling in folder

  for (const category of categories) {
    const categoryPath = path.join(baseDir, category);
    if (!fs.existsSync(categoryPath)) {
      logger.warn(`Category folder not found: ${categoryPath}`);
      continue;
    }

    const propertyMap = new Map<string, string[]>();
    const propertyFolders = fs
      .readdirSync(categoryPath)
      .filter((f) => fs.statSync(path.join(categoryPath, f)).isDirectory());

    for (const propertyFolder of propertyFolders) {
      const propertyPath = path.join(categoryPath, propertyFolder);
      const images = fs
        .readdirSync(propertyPath)
        .filter((f) => /\.(jpg|jpeg|png)$/i.test(f))
        .map((f) => path.join(propertyPath, f));

      if (images.length > 0) {
        propertyMap.set(propertyFolder, images);
      }
    }

    // Map 'apartement' folder to 'apartment' category
    const categoryKey = category === 'apartement' ? 'apartment' : category;
    result.set(categoryKey, propertyMap);
  }

  return result;
}

// Upload a single image to Cloudinary
async function uploadImage(
  localPath: string,
  category: string,
  propertySet: string
): Promise<UploadedImage | null> {
  try {
    const filename = path.basename(localPath, path.extname(localPath));
    const isMain = filename.toLowerCase() === 'main';
    const publicId = `${config.cloudinary.folder}/placeholders/${category}/${propertySet}/${filename}`;

    logger.debug(`Uploading: ${localPath} -> ${publicId}`);

    const result: UploadApiResponse = await cloudinary.uploader.upload(localPath, {
      folder: `${config.cloudinary.folder}/placeholders/${category}/${propertySet}`,
      public_id: filename,
      resource_type: 'image',
      overwrite: false, // Don't re-upload if exists
      format: 'webp',
      quality: 'auto:good',
      transformation: [
        {
          width: 1920,
          height: 1080,
          crop: 'limit',
          quality: 'auto:good',
        },
      ],
    });

    return {
      localPath,
      cloudinaryUrl: result.secure_url,
      publicId: result.public_id,
      isMain,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error: unknown) {
    // Check if it's a "resource already exists" error
    if (
      error &&
      typeof error === 'object' &&
      'http_code' in error &&
      (error as { http_code: number }).http_code === 409
    ) {
      // Image already exists, fetch its URL
      const filename = path.basename(localPath, path.extname(localPath));
      const publicId = `${config.cloudinary.folder}/placeholders/${category}/${propertySet}/${filename}`;

      try {
        const existing = await cloudinary.api.resource(publicId);
        return {
          localPath,
          cloudinaryUrl: existing.secure_url,
          publicId: existing.public_id,
          isMain: filename.toLowerCase() === 'main',
          width: existing.width,
          height: existing.height,
          format: existing.format,
          bytes: existing.bytes,
        };
      } catch {
        logger.error(`Failed to fetch existing image: ${publicId}`);
      }
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Failed to upload ${localPath}: ${errorMessage}`);
    return null;
  }
}

// Upload all placeholder images to Cloudinary
async function uploadAllPlaceholders(
  placeholderMap: Map<string, Map<string, string[]>>,
  dryRun: boolean
): Promise<Map<string, CategoryImageSet>> {
  const uploadedSets = new Map<string, CategoryImageSet>();

  for (const [category, propertyMap] of placeholderMap) {
    logger.info(`\nProcessing category: ${category}`);
    const categorySet: CategoryImageSet = {
      categorySlug: category,
      propertySets: [],
    };

    for (const [propertySetName, imagePaths] of propertyMap) {
      logger.info(`  Property set: ${propertySetName} (${imagePaths.length} images)`);
      const uploadedImages: UploadedImage[] = [];

      for (const imagePath of imagePaths) {
        if (dryRun) {
          const filename = path.basename(imagePath, path.extname(imagePath));
          uploadedImages.push({
            localPath: imagePath,
            cloudinaryUrl: `[DRY RUN] Would upload to Cloudinary`,
            publicId: `placeholders/${category}/${propertySetName}/${filename}`,
            isMain: filename.toLowerCase() === 'main',
          });
        } else {
          const uploaded = await uploadImage(imagePath, category, propertySetName);
          if (uploaded) {
            uploadedImages.push(uploaded);
            logger.debug(`    ✓ Uploaded: ${path.basename(imagePath)}`);
          }
        }
      }

      if (uploadedImages.length > 0) {
        categorySet.propertySets.push({
          name: propertySetName,
          images: uploadedImages,
        });
      }
    }

    uploadedSets.set(category, categorySet);
  }

  return uploadedSets;
}

// Get category ID to slug mapping
async function getCategoryMapping(): Promise<Map<string, string>> {
  const categories = await Category.find({}, { _id: 1, slug: 1 });
  const mapping = new Map<string, string>();

  for (const cat of categories) {
    mapping.set(cat._id.toString(), cat.slug);
  }

  return mapping;
}

// Get properties with failed images grouped by category
async function getPropertiesWithFailedImages(
  categoryMapping: Map<string, string>
): Promise<Map<string, string[]>> {
  // Find all images that are still external (failed migration)
  const failedImages = await PropertyImage.find(
    { url: { $regex: /immobilier\.ch/ } },
    { property_id: 1 }
  );

  // Get unique property IDs
  const propertyIds = [...new Set(failedImages.map((i) => i.property_id.toString()))];

  // Group properties by category
  const result = new Map<string, string[]>();

  for (const propId of propertyIds) {
    const property = await Property.findById(propId, { category_id: 1 });
    if (property) {
      const categorySlug = categoryMapping.get(property.category_id.toString()) || 'unknown';

      if (!result.has(categorySlug)) {
        result.set(categorySlug, []);
      }
      result.get(categorySlug)!.push(propId);
    }
  }

  return result;
}

// Assign placeholder images to a property
async function assignImagesToProperty(
  propertyId: string,
  imageSet: UploadedImage[],
  dryRun: boolean
): Promise<number> {
  // Get existing failed images for this property
  const failedImages = await PropertyImage.find({
    property_id: new mongoose.Types.ObjectId(propertyId),
    url: { $regex: /immobilier\.ch/ },
  });

  if (failedImages.length === 0) {
    return 0;
  }

  let updatedCount = 0;

  // Sort image set to put main image first
  const sortedImages = [...imageSet].sort((a, b) => {
    if (a.isMain && !b.isMain) return -1;
    if (!a.isMain && b.isMain) return 1;
    return 0;
  });

  for (let i = 0; i < failedImages.length; i++) {
    const failedImage = failedImages[i];
    // Cycle through available placeholder images
    const placeholderImage = sortedImages[i % sortedImages.length];

    if (dryRun) {
      logger.debug(
        `  [DRY RUN] Would update image ${failedImage._id} with placeholder ${placeholderImage.publicId}`
      );
    } else {
      await PropertyImage.findByIdAndUpdate(failedImage._id, {
        url: placeholderImage.cloudinaryUrl,
        secure_url: placeholderImage.cloudinaryUrl,
        public_id: placeholderImage.publicId,
        source: 'cloudinary',
        width: placeholderImage.width,
        height: placeholderImage.height,
        format: placeholderImage.format,
        bytes: placeholderImage.bytes,
        original_url: failedImage.url, // Keep original URL for reference
        migrated_at: new Date(),
        // Set first image as primary if it's the main placeholder
        is_primary: i === 0 && placeholderImage.isMain,
      });
    }
    updatedCount++;
  }

  return updatedCount;
}

// Main function
async function main(): Promise<void> {
  const scriptConfig = parseArgs();

  logger.info('='.repeat(60));
  logger.info('Placeholder Image Assignment Script');
  logger.info('='.repeat(60));
  logger.info(`Configuration:`);
  logger.info(`  Dry Run: ${scriptConfig.dryRun}`);
  logger.info(`  Upload Only: ${scriptConfig.uploadOnly}`);
  logger.info('='.repeat(60));

  try {
    // Configure Cloudinary
    configureCloudinary();

    // Connect to database
    await connectDatabase();
    logger.info('Connected to MongoDB');

    // Get placeholder images organized by category
    logger.info('\n📁 Scanning placeholder images...');
    const placeholderMap = getPlaceholderImages();

    let totalImages = 0;
    for (const [category, propertyMap] of placeholderMap) {
      let categoryTotal = 0;
      for (const images of propertyMap.values()) {
        categoryTotal += images.length;
      }
      logger.info(`  ${category}: ${propertyMap.size} property sets, ${categoryTotal} images`);
      totalImages += categoryTotal;
    }
    logger.info(`  Total: ${totalImages} placeholder images`);

    // Upload all placeholder images
    logger.info('\n☁️  Uploading placeholder images to Cloudinary...');
    const uploadedSets = await uploadAllPlaceholders(placeholderMap, scriptConfig.dryRun);

    // Summary of uploads
    let uploadedCount = 0;
    for (const categorySet of uploadedSets.values()) {
      for (const propSet of categorySet.propertySets) {
        uploadedCount += propSet.images.length;
      }
    }
    logger.info(`\n✓ Uploaded/verified ${uploadedCount} images to Cloudinary`);

    if (scriptConfig.uploadOnly) {
      logger.info('\n--upload-only flag set, skipping image assignment');
      return;
    }

    // Get category mapping
    const categoryMapping = await getCategoryMapping();

    // Get properties with failed images
    logger.info('\n🔍 Finding properties with failed images...');
    const propertiesByCategory = await getPropertiesWithFailedImages(categoryMapping);

    let totalProperties = 0;
    for (const [category, properties] of propertiesByCategory) {
      logger.info(`  ${category}: ${properties.length} properties`);
      totalProperties += properties.length;
    }
    logger.info(`  Total: ${totalProperties} properties need placeholder images`);

    // Assign placeholder images to properties
    logger.info('\n🖼️  Assigning placeholder images to properties...');

    let totalUpdated = 0;
    const stats: { [key: string]: { properties: number; images: number } } = {};

    for (const [category, propertyIds] of propertiesByCategory) {
      const categorySet = uploadedSets.get(category);

      if (!categorySet || categorySet.propertySets.length === 0) {
        // Fallback to apartment images if category doesn't have placeholders
        const fallbackSet = uploadedSets.get('apartment');
        if (fallbackSet && fallbackSet.propertySets.length > 0) {
          logger.warn(`  No placeholders for ${category}, using apartment images as fallback`);
          stats[category] = { properties: 0, images: 0 };

          for (let i = 0; i < propertyIds.length; i++) {
            const propertyId = propertyIds[i];
            // Rotate through available property sets
            const propSet = fallbackSet.propertySets[i % fallbackSet.propertySets.length];
            const updated = await assignImagesToProperty(
              propertyId,
              propSet.images,
              scriptConfig.dryRun
            );
            if (updated > 0) {
              stats[category].properties++;
              stats[category].images += updated;
              totalUpdated += updated;
            }
          }
        } else {
          logger.warn(`  Skipping ${category}: no placeholder images available`);
        }
        continue;
      }

      stats[category] = { properties: 0, images: 0 };

      for (let i = 0; i < propertyIds.length; i++) {
        const propertyId = propertyIds[i];
        // Rotate through available property sets
        const propSet = categorySet.propertySets[i % categorySet.propertySets.length];
        const updated = await assignImagesToProperty(
          propertyId,
          propSet.images,
          scriptConfig.dryRun
        );
        if (updated > 0) {
          stats[category].properties++;
          stats[category].images += updated;
          totalUpdated += updated;
        }

        // Log progress every 50 properties
        if ((i + 1) % 50 === 0) {
          logger.info(`  Progress: ${category} - ${i + 1}/${propertyIds.length} properties`);
        }
      }

      logger.info(
        `  ✓ ${category}: ${stats[category].properties} properties, ${stats[category].images} images`
      );
    }

    // Final summary
    logger.info('\n' + '='.repeat(60));
    logger.info('SUMMARY');
    logger.info('='.repeat(60));
    logger.info(`Placeholder images uploaded: ${uploadedCount}`);
    logger.info(`Properties updated: ${totalProperties}`);
    logger.info(`Total images assigned: ${totalUpdated}`);
    logger.info('\nBy category:');
    for (const [cat, stat] of Object.entries(stats)) {
      logger.info(`  ${cat}: ${stat.properties} properties, ${stat.images} images`);
    }

    if (scriptConfig.dryRun) {
      logger.info('\n[DRY RUN] No changes were made to the database.');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Script failed: ${errorMessage}`, {
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  } finally {
    await disconnectDatabase();
    logger.info('\nDisconnected from MongoDB');
    logger.info('Script completed');
  }
}

// Run the script
main();
