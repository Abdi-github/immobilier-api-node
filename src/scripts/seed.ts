import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from '../config/index.js';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { logger } from '../shared/logger/index.js';

// Import models
import { Canton } from '../modules/location/canton.model.js';
import { City } from '../modules/location/city.model.js';
import { Category } from '../modules/category/category.model.js';
import { Amenity } from '../modules/amenity/amenity.model.js';
import { Agency } from '../modules/agency/agency.model.js';
import { Property } from '../modules/property/property.model.js';
import { PropertyImage } from '../modules/property/property-image.model.js';
import { PropertyTranslation } from '../modules/property-translation/property-translation.model.js';
import { User } from '../modules/user/user.model.js';
import { Role } from '../modules/admin/role.model.js';
import { Permission } from '../modules/admin/permission.model.js';
import { UserRole } from '../modules/admin/user-role.model.js';
import { RolePermission } from '../modules/admin/role-permission.model.js';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load JSON data from a file
 */
const loadJsonData = <T>(filename: string): T[] => {
  const filePath = path.join(__dirname, '../../data', filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as T[];
};

/**
 * Convert string _id to ObjectId
 */
const toObjectId = (id: string): mongoose.Types.ObjectId => {
  return new mongoose.Types.ObjectId(id);
};

/**
 * Seed cantons
 */
const seedCantons = async (): Promise<void> => {
  logger.info('Seeding cantons...');
  const cantons = loadJsonData<Record<string, unknown>>('cantons.json');

  const processedCantons = cantons.map((canton) => ({
    _id: toObjectId(canton._id as string),
    code: canton.code,
    name: canton.name,
    is_active: canton.is_active ?? true,
  }));

  await Canton.insertMany(processedCantons);
  logger.info(`Seeded ${processedCantons.length} cantons`);
};

/**
 * Seed cities
 */
const seedCities = async (): Promise<void> => {
  logger.info('Seeding cities...');
  const cities = loadJsonData<Record<string, unknown>>('cities.json');

  // Process cities in batches for better performance
  const batchSize = 1000;
  let processed = 0;

  for (let i = 0; i < cities.length; i += batchSize) {
    const batch = cities.slice(i, i + batchSize).map((city) => ({
      _id: toObjectId(city._id as string),
      canton_id: toObjectId(city.canton_id as string),
      name: {
        en: city.name as string,
        fr: city.name as string,
        de: city.name as string,
        it: city.name as string,
      },
      postal_code: city.postal_code as string,
      image_url: (city.image_url as string) || undefined,
      is_active: city.is_active ?? true,
    }));

    await City.insertMany(batch, { ordered: false });
    processed += batch.length;
    logger.info(`Seeded ${processed}/${cities.length} cities`);
  }
};

/**
 * Seed categories
 */
const seedCategories = async (): Promise<void> => {
  logger.info('Seeding categories...');
  const categories = loadJsonData<Record<string, unknown>>('categories.json');

  const processedCategories = categories.map((category, index) => ({
    _id: toObjectId(category._id as string),
    section: category.section as string,
    name: category.name,
    slug:
      (category.name as Record<string, string>).en?.toLowerCase().replace(/\s+/g, '-') ||
      `category-${index}`,
    sort_order: index,
    is_active: category.is_active ?? true,
  }));

  await Category.insertMany(processedCategories);
  logger.info(`Seeded ${processedCategories.length} categories`);
};

/**
 * Seed amenities
 */
const seedAmenities = async (): Promise<void> => {
  logger.info('Seeding amenities...');
  const amenities = loadJsonData<Record<string, unknown>>('amenities.json');

  const processedAmenities = amenities.map((amenity, index) => ({
    _id: toObjectId(amenity._id as string),
    name: amenity.name,
    group: 'general' as const, // Default group
    sort_order: index,
    is_active: amenity.is_active ?? true,
  }));

  await Amenity.insertMany(processedAmenities);
  logger.info(`Seeded ${processedAmenities.length} amenities`);
};

/**
 * Seed agencies
 */
const seedAgencies = async (): Promise<void> => {
  logger.info('Seeding agencies...');
  const agencies = loadJsonData<Record<string, unknown>>('agencies.json');

  const processedAgencies = agencies.map((agency, index) => {
    // Generate slug from name with proper character handling
    const slug =
      (agency.name as string)
        ?.toLowerCase()
        .replace(/[àáâäã]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôöõ]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ñ]/g, 'n')
        .replace(/[ç]/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `agency-${index}`;

    return {
      _id: toObjectId(agency._id as string),
      name: agency.name as string,
      slug,
      description: agency.description || undefined,
      logo_url: agency.logo || undefined,
      website: agency.website || undefined,
      email: agency.email || undefined,
      phone: agency.phone || undefined,
      contact_person: agency.contact_person || undefined,
      address: (agency.address as string) || 'Unknown Address',
      city_id: toObjectId(agency.city_id as string),
      canton_id: toObjectId(agency.canton_id as string),
      postal_code: (agency.postal_code as string) || undefined,
      status: 'active' as const,
      is_verified: (agency.verified as boolean) ?? true,
      verification_date: agency.verified ? new Date() : undefined,
      total_properties: (agency.total_properties as number) ?? 0,
    };
  });

  await Agency.insertMany(processedAgencies);
  logger.info(`Seeded ${processedAgencies.length} agencies`);
};

/**
 * Parse price string to number
 */
const parsePrice = (price: string | number | undefined | null): number => {
  if (price === undefined || price === null) return 0;
  if (typeof price === 'number') return price;
  // Handle "Prix sur demande" and other non-numeric strings
  const numericPrice = parseFloat(price.replace(/[^\d.]/g, ''));
  return isNaN(numericPrice) ? 0 : numericPrice;
};

/**
 * Parse rooms string to number
 */
const parseRooms = (rooms: string | number | undefined): number | undefined => {
  if (rooms === undefined || rooms === null) return undefined;
  if (typeof rooms === 'number') return rooms;
  const numericRooms = parseFloat(rooms.replace(/[^\d.]/g, ''));
  return isNaN(numericRooms) ? undefined : numericRooms;
};

/**
 * Parse surface string to number
 */
const parseSurface = (surface: string | number | undefined): number | undefined => {
  if (surface === undefined || surface === null) return undefined;
  if (typeof surface === 'number') return surface;
  const numericSurface = parseFloat(surface.replace(/[^\d.]/g, ''));
  return isNaN(numericSurface) ? undefined : numericSurface;
};

/**
 * Seed properties
 */
const seedProperties = async (): Promise<void> => {
  logger.info('Seeding properties...');
  const properties = loadJsonData<Record<string, unknown>>('properties.json');

  // Process properties in batches
  const batchSize = 500;
  let processed = 0;

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize).map((property) => {
      const addresses = property.addresses as string[] | undefined;
      const address = addresses?.join(', ') || 'Unknown Address';

      return {
        _id: toObjectId(property._id as string),
        external_id: property.property_id as string,
        external_url: (property.listing_url as string) || undefined,
        source_language: ((property.language as string) || 'fr') as 'en' | 'fr' | 'de' | 'it',
        category_id: toObjectId(property.category_id as string),
        agency_id: property.agency_id ? toObjectId(property.agency_id as string) : undefined,
        transaction_type: property.transaction_type as 'rent' | 'buy',
        price: parsePrice(property.price as string | number),
        currency: 'CHF' as const,
        rooms: parseRooms(property.rooms as string | number | undefined),
        surface: parseSurface(property.surface as string | number | undefined),
        address,
        city_id: toObjectId(property.city_id as string),
        canton_id: toObjectId(property.canton_id as string),
        postal_code: undefined,
        proximity: (property.proximity as Record<string, string>) || undefined,
        amenities: ((property.amenity_id as string[]) || []).map(toObjectId),
        status: 'PUBLISHED' as const,
        published_at: new Date(),
      };
    });

    await Property.insertMany(batch, { ordered: false });
    processed += batch.length;
    logger.info(`Seeded ${processed}/${properties.length} properties`);
  }
};

/**
 * Seed property translations (from JSON file or generated from properties)
 */
const seedPropertyTranslations = async (): Promise<void> => {
  logger.info('Seeding property translations...');

  // Try to load pre-generated translations from file
  const translationsFilePath = path.join(__dirname, '../../data/property_translations.json');

  if (fs.existsSync(translationsFilePath)) {
    logger.info('Loading property translations from JSON file...');
    const translations = loadJsonData<Record<string, unknown>>('property_translations.json');

    // Process translations in batches
    const batchSize = 500;
    let processed = 0;

    for (let i = 0; i < translations.length; i += batchSize) {
      const batch = translations.slice(i, i + batchSize).map((translation) => ({
        _id: toObjectId(translation._id as string),
        property_id: toObjectId(translation.property_id as string),
        language: translation.language as 'en' | 'fr' | 'de' | 'it',
        title: (translation.title as string).substring(0, 300),
        description: translation.description as string,
        source:
          (translation.source as 'original' | 'deepl' | 'human' | 'libretranslate') || 'original',
        quality_score: (translation.quality_score as number) || 100,
        approval_status:
          (translation.approval_status as 'PENDING' | 'APPROVED' | 'REJECTED') || 'APPROVED',
        approved_at: translation.approval_status === 'APPROVED' ? new Date() : undefined,
      }));

      await PropertyTranslation.insertMany(batch, { ordered: false });
      processed += batch.length;
      logger.info(`Seeded ${processed}/${translations.length} property translations (from file)`);
    }
    return;
  }

  // Fallback: Generate original language translations from property data
  logger.info('No property_translations.json found. Generating original language entries only...');
  logger.warn(
    'Run "npx ts-node --esm src/scripts/generate-translations-seed.ts" to generate multilingual translations.'
  );

  const properties = loadJsonData<Record<string, unknown>>('properties.json');

  // Create translations from property descriptions (original language only)
  const batchSize = 500;
  let processed = 0;

  for (let i = 0; i < properties.length; i += batchSize) {
    const batch = properties.slice(i, i + batchSize).map((property) => {
      const addresses = property.addresses as string[] | undefined;
      const title = addresses?.[0] || `Property ${property.property_id}`;
      const description = (property.description as string) || 'No description available';
      const language = ((property.language as string) || 'fr') as 'en' | 'fr' | 'de' | 'it';

      return {
        property_id: toObjectId(property._id as string),
        language,
        title: title.substring(0, 300),
        description,
        source: 'original' as const,
        quality_score: 100,
        approval_status: 'APPROVED' as const,
        approved_at: new Date(),
      };
    });

    await PropertyTranslation.insertMany(batch, { ordered: false });
    processed += batch.length;
    logger.info(`Seeded ${processed}/${properties.length} property translations (original only)`);
  }
};

/**
 * Seed property images
 */
const seedPropertyImages = async (): Promise<void> => {
  logger.info('Seeding property images...');
  const images = loadJsonData<Record<string, unknown>>('property_images.json');

  // Process images in batches
  const batchSize = 1000;
  let processed = 0;

  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize).map((image) => ({
      _id: toObjectId(image._id as string),
      property_id: toObjectId(image.property_id as string),
      url: image.url as string,
      thumbnail_url: image.url as string,
      sort_order: (image.order as number) || 0,
      is_primary: (image.order as number) === 1,
    }));

    await PropertyImage.insertMany(batch, { ordered: false });
    processed += batch.length;
    logger.info(`Seeded ${processed}/${images.length} property images`);
  }
};

/**
 * Seed users
 */
const seedUsers = async (): Promise<void> => {
  logger.info('Seeding users...');
  const users = loadJsonData<Record<string, unknown>>('users.json');

  const processedUsers = users.map((user) => ({
    _id: toObjectId(user._id as string),
    email: user.email as string,
    password_hash: user.password_hash as string, // Already hashed
    first_name: user.first_name as string,
    last_name: user.last_name as string,
    phone: (user.phone as string) || undefined,
    preferred_language: ((user.preferred_language as string) || 'en') as 'en' | 'fr' | 'de' | 'it',
    // user_type: 'end_user' as const, // Will be determined by roles
    user_type: user.user_type as string,
    agency_id: user.agency_id ? toObjectId(user.agency_id as string) : undefined,
    status: (user.is_active as boolean) ? ('active' as const) : ('inactive' as const),
    email_verified: (user.is_verified as boolean) || false,
    email_verified_at: user.verified_at ? new Date(user.verified_at as string) : undefined,
  }));

  await User.insertMany(processedUsers);
  logger.info(`Seeded ${processedUsers.length} users`);
};

/**
 * Seed permissions
 */
const seedPermissions = async (): Promise<void> => {
  logger.info('Seeding permissions...');
  const permissions = loadJsonData<Record<string, unknown>>('permissions.json');

  const processedPermissions = permissions.map((permission) => ({
    _id: toObjectId(permission._id as string),
    name: permission.name as string, // e.g., "users:read"
    display_name: permission.display_name as Record<string, string>,
    description: permission.description as Record<string, string>,
    resource: permission.resource as string,
    action: permission.action as string,
    is_active: (permission.is_active as boolean) ?? true,
  }));

  await Permission.insertMany(processedPermissions);
  logger.info(`Seeded ${processedPermissions.length} permissions`);
};

/**
 * Seed roles
 */
const seedRoles = async (): Promise<void> => {
  logger.info('Seeding roles...');
  const roles = loadJsonData<Record<string, unknown>>('roles.json');

  const processedRoles = roles.map((role) => ({
    _id: toObjectId(role._id as string),
    name: role.name as string, // e.g., "super_admin"
    display_name: role.display_name as Record<string, string>,
    description: role.description as Record<string, string>,
    permissions: [], // Will be assigned via role_permissions
    is_system: (role.is_system as boolean) ?? false,
    is_active: (role.is_active as boolean) ?? true,
  }));

  await Role.insertMany(processedRoles);
  logger.info(`Seeded ${processedRoles.length} roles`);
};

/**
 * Seed role permissions (many-to-many relationship)
 */
const seedRolePermissions = async (): Promise<void> => {
  logger.info('Seeding role permissions...');
  const rolePermissions = loadJsonData<Record<string, unknown>>('role_permissions.json');

  // Process role permissions
  const processedRolePermissions = rolePermissions.map((rp) => ({
    _id: toObjectId(rp._id as string),
    role_id: toObjectId(rp.role_id as string),
    permission_id: toObjectId(rp.permission_id as string),
    assigned_at: rp.created_at ? new Date(rp.created_at as string) : new Date(),
    is_active: true,
  }));

  await RolePermission.insertMany(processedRolePermissions);

  // Also update Role documents with their permission IDs for efficient querying
  const rolePermissionGroups = rolePermissions.reduce<Record<string, mongoose.Types.ObjectId[]>>(
    (acc, rp) => {
      const roleId = rp.role_id as string;
      if (!acc[roleId]) {
        acc[roleId] = [];
      }
      acc[roleId].push(toObjectId(rp.permission_id as string));
      return acc;
    },
    {}
  );

  // Update each role with its permissions
  const updatePromises = Object.entries(rolePermissionGroups).map(([roleId, permissionIds]) =>
    Role.findByIdAndUpdate(roleId, { $set: { permissions: permissionIds } })
  );

  await Promise.all(updatePromises);
  logger.info(`Seeded ${processedRolePermissions.length} role permissions`);
};

/**
 * Seed user roles
 */
const seedUserRoles = async (): Promise<void> => {
  logger.info('Seeding user roles...');
  const userRoles = loadJsonData<Record<string, unknown>>('user_roles.json');

  const processedUserRoles = userRoles.map((userRole) => ({
    _id: toObjectId(userRole._id as string),
    user_id: toObjectId(userRole.user_id as string),
    role_id: toObjectId(userRole.role_id as string),
    assigned_by: userRole.assigned_by ? toObjectId(userRole.assigned_by as string) : undefined,
    assigned_at: userRole.assigned_at ? new Date(userRole.assigned_at as string) : new Date(),
    is_active: (userRole.is_active as boolean) ?? true,
  }));

  await UserRole.insertMany(processedUserRoles);
  logger.info(`Seeded ${processedUserRoles.length} user roles`);
};

/**
 * Clear all collections
 */
const clearCollections = async (): Promise<void> => {
  logger.info('Clearing existing data...');

  await Promise.all([
    Canton.deleteMany({}),
    City.deleteMany({}),
    Category.deleteMany({}),
    Amenity.deleteMany({}),
    Agency.deleteMany({}),
    Property.deleteMany({}),
    PropertyImage.deleteMany({}),
    PropertyTranslation.deleteMany({}),
    User.deleteMany({}),
    Role.deleteMany({}),
    Permission.deleteMany({}),
    UserRole.deleteMany({}),
    RolePermission.deleteMany({}),
  ]);

  logger.info('All collections cleared');
};

/**
 * Main seed function
 */
const seed = async (): Promise<void> => {
  try {
    logger.info('Starting database seeding...');
    logger.info(`Environment: ${config.env}`);

    // Connect to database
    await connectDatabase();

    // Clear existing data
    await clearCollections();

    // Seed in order (respecting foreign key dependencies)
    await seedCantons();
    await seedCities();
    await seedCategories();
    await seedAmenities();
    await seedAgencies();
    await seedProperties();
    await seedPropertyTranslations();
    await seedPropertyImages();
    await seedUsers();
    await seedPermissions();
    await seedRoles();
    await seedRolePermissions();
    await seedUserRoles();

    logger.info('✅ Database seeding completed successfully!');
    logger.info('');
    logger.info('📋 Summary:');
    logger.info(`   - Cantons: ${await Canton.countDocuments()}`);
    logger.info(`   - Cities: ${await City.countDocuments()}`);
    logger.info(`   - Categories: ${await Category.countDocuments()}`);
    logger.info(`   - Amenities: ${await Amenity.countDocuments()}`);
    logger.info(`   - Agencies: ${await Agency.countDocuments()}`);
    logger.info(`   - Properties: ${await Property.countDocuments()}`);
    logger.info(`   - Property Images: ${await PropertyImage.countDocuments()}`);
    logger.info(`   - Property Translations: ${await PropertyTranslation.countDocuments()}`);
    logger.info(`   - Users: ${await User.countDocuments()}`);
    logger.info(`   - Permissions: ${await Permission.countDocuments()}`);
    logger.info(`   - Roles: ${await Role.countDocuments()}`);
    logger.info(`   - Role Permissions: ${await RolePermission.countDocuments()}`);
    logger.info(`   - User Roles: ${await UserRole.countDocuments()}`);
    logger.info('');
    logger.info('🔐 Test Credentials:');
    logger.info('   Email: superadmin.en@immobilier.ch');
    logger.info('   Password: Password123!');
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  } finally {
    await disconnectDatabase();
  }
};

// Run seed if this is the main module
seed().catch((error) => {
  logger.error('Seed script error:', error);
  process.exit(1);
});

export { seed };
