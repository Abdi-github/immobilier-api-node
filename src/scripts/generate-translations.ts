/**
 * Generate Property Translations Seed Data
 *
 * This script generates translations for all properties in the seed data.
 * It uses LibreTranslate (self-hosted, free, unlimited) as the translation provider.
 *
 * Usage:
 * 1. Start LibreTranslate container: docker compose -f docker-compose.dev.yml up libretranslate
 * 2. Run script: docker compose exec api npx ts-node --esm src/scripts/generate-translations.ts
 *
 * Options:
 * --batch-size=N    Number of properties to process per batch (default: 10)
 * --delay=N         Delay in ms between batches (default: 1000)
 * --output=PATH     Output file path (default: data/property_translations.json)
 * --dry-run         Don't write output, just show what would be translated
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

// ES Module directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
interface PropertySeedData {
  _id: string;
  property_id: string;
  language: 'en' | 'fr' | 'de' | 'it';
  description: string;
  addresses: string[];
  category_id: string;
}

interface PropertyTranslationSeed {
  _id: string;
  property_id: string;
  language: 'en' | 'fr' | 'de' | 'it';
  title: string;
  description: string;
  source: 'original' | 'libretranslate' | 'deepl';
  quality_score: number;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

interface TranslationResult {
  translatedText: string;
}

// Configuration
const CONFIG = {
  batchSize: 10,
  delayMs: 500,
  outputPath: path.join(__dirname, '../../data/property_translations.json'),
  libreTranslateUrl: process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000',
  supportedLanguages: ['en', 'fr', 'de', 'it'] as const,
};

// Parse command line arguments
const parseArgs = (): {
  batchSize: number;
  delay: number;
  output: string;
  dryRun: boolean;
} => {
  const args = process.argv.slice(2);
  const config = {
    batchSize: CONFIG.batchSize,
    delay: CONFIG.delayMs,
    output: CONFIG.outputPath,
    dryRun: false,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--batch-size=')) {
      config.batchSize = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay=')) {
      config.delay = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--output=')) {
      config.output = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    }
  });

  return config;
};

/**
 * Generate a new ObjectId string
 */
const generateObjectId = (): string => {
  return new mongoose.Types.ObjectId().toString();
};

/**
 * Load properties from seed data
 */
const loadProperties = (): PropertySeedData[] => {
  const filePath = path.join(__dirname, '../../data/properties.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

/**
 * Load categories to generate titles
 */
const loadCategories = (): Record<string, { name: Record<string, string> }> => {
  const filePath = path.join(__dirname, '../../data/categories.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  const categories = JSON.parse(data) as Array<{ _id: string; name: Record<string, string> }>;

  const categoryMap: Record<string, { name: Record<string, string> }> = {};
  categories.forEach((cat) => {
    categoryMap[cat._id] = { name: cat.name };
  });

  return categoryMap;
};

/**
 * Translate text using LibreTranslate API
 */
const translateText = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  try {
    const response = await fetch(`${CONFIG.libreTranslateUrl}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: sourceLang,
        target: targetLang,
        format: 'text',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LibreTranslate error: ${response.status} - ${error}`);
    }

    const result = (await response.json()) as TranslationResult;
    return result.translatedText;
  } catch (error) {
    console.error(`Translation failed for ${sourceLang} -> ${targetLang}:`, error);
    // Return placeholder on error
    return `[${targetLang.toUpperCase()}] ${text}`;
  }
};

/**
 * Generate title from address and category
 */
const generateTitle = (
  property: PropertySeedData,
  categories: Record<string, { name: Record<string, string> }>,
  language: string
): string => {
  const category = categories[property.category_id];
  const categoryName = category?.name?.[language] || category?.name?.['en'] || 'Property';

  // Extract city from address (usually in format "postal_code City," or "City, Region")
  const addressParts = property.addresses[0]?.split(',') || [];
  const location = addressParts[0]?.trim() || 'Swiss Location';

  return `${categoryName} - ${location}`;
};

/**
 * Create a translation entry (original or translated)
 */
const createTranslationEntry = (
  propertyId: string,
  language: 'en' | 'fr' | 'de' | 'it',
  title: string,
  description: string,
  isOriginal: boolean
): PropertyTranslationSeed => {
  const now = new Date().toISOString();

  return {
    _id: generateObjectId(),
    property_id: propertyId,
    language,
    title,
    description,
    source: isOriginal ? 'original' : 'libretranslate',
    quality_score: isOriginal ? 100 : 85,
    approval_status: 'APPROVED', // Pre-approved for seed data
    created_at: now,
    updated_at: now,
  };
};

/**
 * Sleep utility
 */
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Check if LibreTranslate is available
 */
const checkLibreTranslate = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${CONFIG.libreTranslateUrl}/languages`);
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * Generate translations for all properties
 */
const generateTranslations = async (options: ReturnType<typeof parseArgs>): Promise<void> => {
  console.log('🔄 Starting translation generation...\n');
  console.log('Configuration:');
  console.log(`  Batch Size: ${options.batchSize}`);
  console.log(`  Delay: ${options.delay}ms`);
  console.log(`  Output: ${options.output}`);
  console.log(`  Dry Run: ${options.dryRun}\n`);

  // Check LibreTranslate availability
  const isLibreTranslateAvailable = await checkLibreTranslate();
  if (!isLibreTranslateAvailable) {
    console.warn('⚠️  LibreTranslate is not available. Using placeholder translations.');
    console.warn('   Start it with: docker compose -f docker-compose.dev.yml up libretranslate\n');
  } else {
    console.log('✅ LibreTranslate is available\n');
  }

  // Load data
  const properties = loadProperties();
  const categories = loadCategories();

  console.log(`📊 Found ${properties.length} properties to process\n`);

  const allTranslations: PropertyTranslationSeed[] = [];
  const targetLanguages = CONFIG.supportedLanguages.filter((lang) => lang !== 'fr');

  // Calculate totals
  const totalOriginal = properties.length;
  const totalTranslations = properties.length * targetLanguages.length;
  const total = totalOriginal + totalTranslations;

  console.log(`📝 Will generate:`);
  console.log(`   - ${totalOriginal} original (French) entries`);
  console.log(`   - ${totalTranslations} translations (${targetLanguages.join(', ')})`);
  console.log(`   - ${total} total entries\n`);

  if (options.dryRun) {
    console.log('🔍 Dry run mode - no translations will be generated');
    return;
  }

  let processed = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < properties.length; i += options.batchSize) {
    const batch = properties.slice(i, i + options.batchSize);
    const batchNum = Math.floor(i / options.batchSize) + 1;
    const totalBatches = Math.ceil(properties.length / options.batchSize);

    console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} properties)...`);

    for (const property of batch) {
      try {
        // 1. Create original French entry
        const originalTitle = generateTitle(property, categories, 'fr');
        const originalTranslation = createTranslationEntry(
          property._id,
          'fr',
          originalTitle,
          property.description || '',
          true
        );
        allTranslations.push(originalTranslation);

        // 2. Create translations for other languages
        for (const targetLang of targetLanguages) {
          let translatedTitle: string;
          let translatedDescription: string;

          if (isLibreTranslateAvailable) {
            // Use LibreTranslate
            translatedTitle = await translateText(originalTitle, 'fr', targetLang);
            translatedDescription = await translateText(
              property.description || '',
              'fr',
              targetLang
            );
          } else {
            // Use placeholders
            translatedTitle = `[${targetLang.toUpperCase()}] ${originalTitle}`;
            translatedDescription = `[${targetLang.toUpperCase()} Translation Pending]\n\n${property.description || ''}`;
          }

          const translation = createTranslationEntry(
            property._id,
            targetLang,
            translatedTitle,
            translatedDescription,
            false
          );
          allTranslations.push(translation);
        }

        processed++;
      } catch (error) {
        console.error(`  ❌ Error processing property ${property._id}:`, error);
        errors++;
      }
    }

    // Show progress
    const progress = (((i + batch.length) / properties.length) * 100).toFixed(1);
    console.log(`  ✅ Progress: ${progress}% (${processed} processed, ${errors} errors)`);

    // Delay between batches to avoid overwhelming the translation service
    if (i + options.batchSize < properties.length) {
      await sleep(options.delay);
    }
  }

  console.log(`\n🎉 Translation generation complete!`);
  console.log(`   - Total translations: ${allTranslations.length}`);
  console.log(`   - Processed: ${processed}`);
  console.log(`   - Errors: ${errors}\n`);

  // Write output file
  console.log(`💾 Writing to ${options.output}...`);
  fs.writeFileSync(options.output, JSON.stringify(allTranslations, null, 2));
  console.log('✅ Done!\n');

  // Summary
  const byLanguage = allTranslations.reduce(
    (acc, t) => {
      acc[t.language] = (acc[t.language] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('📊 Summary by language:');
  Object.entries(byLanguage).forEach(([lang, count]) => {
    console.log(`   - ${lang}: ${count} translations`);
  });
};

/**
 * Generate placeholder translations without LibreTranslate
 * Useful for initial setup or when translation service is unavailable
 */
const generatePlaceholderTranslations = (options: ReturnType<typeof parseArgs>): void => {
  console.log('🔄 Generating placeholder translations...\n');

  const properties = loadProperties();
  const categories = loadCategories();

  console.log(`📊 Found ${properties.length} properties to process\n`);

  const allTranslations: PropertyTranslationSeed[] = [];
  const targetLanguages = CONFIG.supportedLanguages.filter((lang) => lang !== 'fr');

  for (const property of properties) {
    // 1. Create original French entry
    const originalTitle = generateTitle(property, categories, 'fr');
    const originalTranslation = createTranslationEntry(
      property._id,
      'fr',
      originalTitle,
      property.description || '',
      true
    );
    allTranslations.push(originalTranslation);

    // 2. Create placeholder translations for other languages
    for (const targetLang of targetLanguages) {
      const translatedTitle = `[${targetLang.toUpperCase()}] ${originalTitle}`;
      const translatedDescription = property.description
        ? `[Translation to ${targetLang.toUpperCase()} pending]\n\n${property.description}`
        : `[Translation to ${targetLang.toUpperCase()} pending]`;

      const translation = createTranslationEntry(
        property._id,
        targetLang,
        translatedTitle,
        translatedDescription,
        false
      );
      // Mark as pending for manual review
      translation.approval_status = 'PENDING';
      translation.quality_score = 0;
      allTranslations.push(translation);
    }
  }

  if (!options.dryRun) {
    console.log(`💾 Writing to ${options.output}...`);
    fs.writeFileSync(options.output, JSON.stringify(allTranslations, null, 2));
    console.log('✅ Done!\n');
  }

  console.log(`📊 Generated ${allTranslations.length} translation entries`);
  console.log(`   - ${properties.length} original (French)`);
  console.log(
    `   - ${properties.length * targetLanguages.length} placeholders (${targetLanguages.join(', ')})`
  );
};

// Main execution
const main = async (): Promise<void> => {
  const options = parseArgs();

  // Check if we should use placeholder mode (quick generation without translation service)
  const usePlaceholder = process.argv.includes('--placeholder');

  if (usePlaceholder) {
    generatePlaceholderTranslations(options);
  } else {
    await generateTranslations(options);
  }
};

main().catch(console.error);
