/**
 * Generate Pre-Translated Property Seed Data
 *
 * This script generates multilingual property translations using simple template-based
 * translations for demonstration purposes. It's designed for portfolio projects
 * where having realistic multilingual data is more important than perfect translations.
 *
 * Usage:
 * node -r ts-node/register src/scripts/generate-translations-seed.ts
 *
 * Or with Docker:
 * docker compose exec api npx ts-node --esm src/scripts/generate-translations-seed.ts
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
  transaction_type: 'rent' | 'buy';
  rooms?: string;
  surface?: string;
  price: number | string;
}

interface CategoryData {
  _id: string;
  name: Record<string, string>;
  section: string;
}

interface PropertyTranslationSeed {
  _id: string;
  property_id: string;
  language: 'en' | 'fr' | 'de' | 'it';
  title: string;
  description: string;
  source: 'original' | 'libretranslate' | 'deepl' | 'human';
  quality_score: number;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  updated_at: string;
}

// Template translations for common phrases
const TRANSLATION_TEMPLATES = {
  // Property type descriptions by language
  propertyIntro: {
    en: (type: string, location: string) => `Discover this beautiful ${type} in ${location}.`,
    fr: (type: string, location: string) => `Découvrez ce magnifique ${type} à ${location}.`,
    de: (type: string, location: string) =>
      `Entdecken Sie dieses wunderschöne ${type} in ${location}.`,
    it: (type: string, location: string) => `Scoprite questo magnifico ${type} a ${location}.`,
  },

  // Features description
  features: {
    en: (rooms: string, surface: string) =>
      `This property offers ${rooms || 'multiple'} rooms and ${surface || 'spacious'} of living space.`,
    fr: (rooms: string, surface: string) =>
      `Cette propriété offre ${rooms || 'plusieurs'} pièces et ${surface || 'généreux'} de surface habitable.`,
    de: (rooms: string, surface: string) =>
      `Diese Immobilie bietet ${rooms || 'mehrere'} Zimmer und ${surface || 'großzügige'} Wohnfläche.`,
    it: (rooms: string, surface: string) =>
      `Questa proprietà offre ${rooms || 'diverse'} stanze e ${surface || 'ampia'} superficie abitabile.`,
  },

  // Call to action
  callToAction: {
    en: 'Contact us today to schedule a viewing!',
    fr: "Contactez-nous dès aujourd'hui pour planifier une visite!",
    de: 'Kontaktieren Sie uns noch heute, um einen Besichtigungstermin zu vereinbaren!',
    it: 'Contattateci oggi per programmare una visita!',
  },

  // Transaction type
  transactionType: {
    rent: {
      en: 'for rent',
      fr: 'à louer',
      de: 'zur Miete',
      it: 'in affitto',
    },
    buy: {
      en: 'for sale',
      fr: 'à vendre',
      de: 'zum Verkauf',
      it: 'in vendita',
    },
  },
};

// Category name translations (fallbacks when not in data)
// @ts-expect-error Kept for future seed script usage
const _CATEGORY_TRANSLATIONS: Record<string, Record<string, Record<string, string>>> = {
  residential: {
    house: { en: 'House', fr: 'Maison', de: 'Haus', it: 'Casa' },
    apartment: { en: 'Apartment', fr: 'Appartement', de: 'Wohnung', it: 'Appartamento' },
    villa: { en: 'Villa', fr: 'Villa', de: 'Villa', it: 'Villa' },
    studio: { en: 'Studio', fr: 'Studio', de: 'Studio', it: 'Monolocale' },
    loft: { en: 'Loft', fr: 'Loft', de: 'Loft', it: 'Loft' },
    chalet: { en: 'Chalet', fr: 'Chalet', de: 'Chalet', it: 'Chalet' },
    farm: { en: 'Farm', fr: 'Ferme', de: 'Bauernhof', it: 'Fattoria' },
  },
  commercial: {
    office: { en: 'Office', fr: 'Bureau', de: 'Büro', it: 'Ufficio' },
    shop: { en: 'Shop', fr: 'Commerce', de: 'Geschäft', it: 'Negozio' },
    warehouse: { en: 'Warehouse', fr: 'Entrepôt', de: 'Lager', it: 'Magazzino' },
    restaurant: { en: 'Restaurant', fr: 'Restaurant', de: 'Restaurant', it: 'Ristorante' },
  },
  land: {
    building_land: {
      en: 'Building Land',
      fr: 'Terrain constructible',
      de: 'Bauland',
      it: 'Terreno edificabile',
    },
    agricultural_land: {
      en: 'Agricultural Land',
      fr: 'Terrain agricole',
      de: 'Ackerland',
      it: 'Terreno agricolo',
    },
  },
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
 * Load categories
 */
const loadCategories = (): Map<string, CategoryData> => {
  const filePath = path.join(__dirname, '../../data/categories.json');
  const data = fs.readFileSync(filePath, 'utf-8');
  const categories = JSON.parse(data) as CategoryData[];

  const categoryMap = new Map<string, CategoryData>();
  categories.forEach((cat) => {
    categoryMap.set(cat._id, cat);
  });

  return categoryMap;
};

/**
 * Extract location from addresses
 */
const extractLocation = (addresses: string[]): string => {
  if (!addresses || addresses.length === 0) return 'Switzerland';

  // First address usually contains postal code and city
  const firstAddress = addresses[0];

  // Try to extract city name (format: "1234 CityName,")
  const match = firstAddress.match(/\d+\s+([^,]+)/);
  if (match) {
    return match[1].trim();
  }

  // Fallback: use first part of address
  const parts = firstAddress.split(',');
  return parts[0]?.trim() || 'Switzerland';
};

/**
 * Get category name in a specific language
 */
const getCategoryName = (
  categoryId: string,
  categories: Map<string, CategoryData>,
  language: string
): string => {
  const category = categories.get(categoryId);

  if (category?.name?.[language]) {
    return category.name[language];
  }

  // Fallback to English or French
  if (category?.name?.en) return category.name.en;
  if (category?.name?.fr) return category.name.fr;

  return 'Property';
};

/**
 * Generate a localized title for a property
 */
const generateTitle = (
  property: PropertySeedData,
  categories: Map<string, CategoryData>,
  language: 'en' | 'fr' | 'de' | 'it'
): string => {
  const categoryName = getCategoryName(property.category_id, categories, language);
  const location = extractLocation(property.addresses);

  // Handle missing transaction_type with fallback
  const transactionType = property.transaction_type || 'buy';
  const transactionTypeTemplate = TRANSLATION_TEMPLATES.transactionType[transactionType];
  const transactionText =
    transactionTypeTemplate?.[language] || TRANSLATION_TEMPLATES.transactionType.buy[language];

  return `${categoryName} ${transactionText} - ${location}`;
};

/**
 * Generate a localized description based on the original
 */
const generateLocalizedDescription = (
  property: PropertySeedData,
  categories: Map<string, CategoryData>,
  language: 'en' | 'fr' | 'de' | 'it'
): string => {
  const categoryName = getCategoryName(property.category_id, categories, language);
  const location = extractLocation(property.addresses);

  // If original language matches target, return original
  if (language === property.language) {
    return property.description || '';
  }

  // Build a template-based description
  const parts: string[] = [];

  // Introduction
  parts.push(TRANSLATION_TEMPLATES.propertyIntro[language](categoryName.toLowerCase(), location));

  // Features
  if (property.rooms || property.surface) {
    parts.push(
      TRANSLATION_TEMPLATES.features[language](property.rooms || '', property.surface || '')
    );
  }

  // For non-source languages, add a note about the original description
  if (language !== 'fr' && property.description) {
    // Truncate original description for context
    const truncatedOriginal = property.description.substring(0, 200);
    parts.push(
      `\n[Original description in French follows]\n${truncatedOriginal}${property.description.length > 200 ? '...' : ''}`
    );
  }

  // Call to action
  parts.push('\n' + TRANSLATION_TEMPLATES.callToAction[language]);

  return parts.join(' ');
};

/**
 * Create a translation entry
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
    source: isOriginal ? 'original' : 'human', // Mark as 'human' since these are template-based
    quality_score: isOriginal ? 100 : 75,
    approval_status: 'APPROVED', // Pre-approved for seed data
    created_at: now,
    updated_at: now,
  };
};

/**
 * Main generation function
 */
const generateTranslationsSeed = (): void => {
  console.log('🌍 Generating Pre-Translated Property Seed Data\n');
  console.log('='.repeat(50));

  const properties = loadProperties();
  const categories = loadCategories();

  console.log(`📊 Properties to process: ${properties.length}`);
  console.log(`📚 Categories loaded: ${categories.size}`);
  console.log(`🌐 Target languages: en, fr, de, it\n`);

  const allTranslations: PropertyTranslationSeed[] = [];
  const supportedLanguages: Array<'en' | 'fr' | 'de' | 'it'> = ['en', 'fr', 'de', 'it'];

  let processed = 0;
  const startTime = Date.now();

  for (const property of properties) {
    for (const lang of supportedLanguages) {
      const isOriginal = lang === property.language;

      let title: string;
      let description: string;

      if (isOriginal) {
        // For original language, generate title from category and use original description
        title = generateTitle(property, categories, lang);
        description = property.description || '';
      } else {
        // For other languages, generate localized content
        title = generateTitle(property, categories, lang);
        description = generateLocalizedDescription(property, categories, lang);
      }

      const translation = createTranslationEntry(
        property._id,
        lang,
        title,
        description,
        isOriginal
      );

      allTranslations.push(translation);
    }

    processed++;

    // Progress update every 100 properties
    if (processed % 100 === 0) {
      const progress = ((processed / properties.length) * 100).toFixed(1);
      console.log(`  📝 Progress: ${progress}% (${processed}/${properties.length})`);
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Generation complete in ${duration}s`);
  console.log(`📊 Total translations generated: ${allTranslations.length}`);

  // Summary by language
  const byLanguage = allTranslations.reduce(
    (acc, t) => {
      acc[t.language] = (acc[t.language] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('\n📈 Breakdown by language:');
  Object.entries(byLanguage).forEach(([lang, count]) => {
    const isOriginal = lang === 'fr';
    console.log(
      `   - ${lang.toUpperCase()}: ${count} ${isOriginal ? '(original)' : '(translated)'}`
    );
  });

  // Write to file
  const outputPath = path.join(__dirname, '../../data/property_translations.json');
  console.log(`\n💾 Writing to: ${outputPath}`);

  fs.writeFileSync(outputPath, JSON.stringify(allTranslations, null, 2));

  console.log('✅ Done!\n');

  // File size info
  const stats = fs.statSync(outputPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📦 Output file size: ${fileSizeMB} MB`);
};

// Run
generateTranslationsSeed();
