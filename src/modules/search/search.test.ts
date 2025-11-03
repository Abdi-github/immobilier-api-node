// Search tests — full-text, filters, geo, autocomplete

import bcrypt from 'bcryptjs';
import { Application } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../app.js';
import { config } from '../../config/index.js';
import { Permission } from '../admin/permission.model.js';
import { Role } from '../admin/role.model.js';
import { UserRole } from '../admin/user-role.model.js';
import { User } from '../user/user.model.js';
import { Property } from '../property/property.model.js';
import { PropertyTranslation } from '../property-translation/property-translation.model.js';
import { PropertyImage } from '../property/property-image.model.js';
import { Canton } from '../location/canton.model.js';
import { City } from '../location/city.model.js';
import { Category } from '../category/category.model.js';
import { Agency } from '../agency/agency.model.js';
import { Amenity } from '../amenity/amenity.model.js';

// Test IDs (pre-generated ObjectIds for consistency)
const testIds = {
  canton1: new mongoose.Types.ObjectId(),
  canton2: new mongoose.Types.ObjectId(),
  city1: new mongoose.Types.ObjectId(),
  city2: new mongoose.Types.ObjectId(),
  city3: new mongoose.Types.ObjectId(),
  category1: new mongoose.Types.ObjectId(),
  category2: new mongoose.Types.ObjectId(),
  agency1: new mongoose.Types.ObjectId(),
  amenity1: new mongoose.Types.ObjectId(),
  amenity2: new mongoose.Types.ObjectId(),
  property1: new mongoose.Types.ObjectId(),
  property2: new mongoose.Types.ObjectId(),
  property3: new mongoose.Types.ObjectId(),
  property4: new mongoose.Types.ObjectId(),
  adminUser: new mongoose.Types.ObjectId(),
  regularUser: new mongoose.Types.ObjectId(),
};

// Test data
const testCantons = [
  {
    _id: testIds.canton1,
    code: 'GE',
    name: { en: 'Geneva', fr: 'Genève', de: 'Genf', it: 'Ginevra' },
    is_active: true,
  },
  {
    _id: testIds.canton2,
    code: 'ZH',
    name: { en: 'Zurich', fr: 'Zurich', de: 'Zürich', it: 'Zurigo' },
    is_active: true,
  },
];

const testCities = [
  {
    _id: testIds.city1,
    canton_id: testIds.canton1,
    name: { en: 'Geneva City', fr: 'Ville de Genève', de: 'Stadt Genf', it: 'Città di Ginevra' },
    postal_codes: ['1201', '1202', '1203'],
    is_active: true,
  },
  {
    _id: testIds.city2,
    canton_id: testIds.canton1,
    name: { en: 'Carouge', fr: 'Carouge', de: 'Carouge', it: 'Carouge' },
    postal_codes: ['1227'],
    is_active: true,
  },
  {
    _id: testIds.city3,
    canton_id: testIds.canton2,
    name: { en: 'Zurich City', fr: 'Ville de Zurich', de: 'Stadt Zürich', it: 'Città di Zurigo' },
    postal_codes: ['8001', '8002'],
    is_active: true,
  },
];

const testCategories = [
  {
    _id: testIds.category1,
    section: 'residential',
    slug: 'apartment',
    name: { en: 'Apartment', fr: 'Appartement', de: 'Wohnung', it: 'Appartamento' },
    icon: 'apartment',
    sort_order: 1,
    is_active: true,
  },
  {
    _id: testIds.category2,
    section: 'residential',
    slug: 'house',
    name: { en: 'House', fr: 'Maison', de: 'Haus', it: 'Casa' },
    icon: 'house',
    sort_order: 2,
    is_active: true,
  },
];

const testAgency = {
  _id: testIds.agency1,
  name: 'Test Agency',
  slug: 'test-agency',
  email: 'agency@example.com',
  phone: '+41221234567',
  address: '123 Test Street',
  city_id: testIds.city1,
  canton_id: testIds.canton1,
  is_active: true,
};

const testAmenities = [
  {
    _id: testIds.amenity1,
    code: 'parking',
    name: { en: 'Parking', fr: 'Parking', de: 'Parkplatz', it: 'Parcheggio' },
    icon: 'parking',
    is_active: true,
  },
  {
    _id: testIds.amenity2,
    code: 'balcony',
    name: { en: 'Balcony', fr: 'Balcon', de: 'Balkon', it: 'Balcone' },
    icon: 'balcony',
    is_active: true,
  },
];

const testProperties = [
  {
    _id: testIds.property1,
    external_id: 'PROP-001',
    source_language: 'en',
    category_id: testIds.category1,
    agency_id: testIds.agency1,
    transaction_type: 'rent',
    price: 2500,
    currency: 'CHF',
    rooms: 3,
    surface: 85,
    address: '10 Rue de la Gare',
    city_id: testIds.city1,
    canton_id: testIds.canton1,
    postal_code: '1201',
    amenities: [testIds.amenity1, testIds.amenity2],
    status: 'PUBLISHED',
    published_at: new Date('2024-01-15'),
  },
  {
    _id: testIds.property2,
    external_id: 'PROP-002',
    source_language: 'fr',
    category_id: testIds.category2,
    agency_id: testIds.agency1,
    transaction_type: 'buy',
    price: 950000,
    currency: 'CHF',
    rooms: 5,
    surface: 180,
    address: '25 Avenue des Alpes',
    city_id: testIds.city2,
    canton_id: testIds.canton1,
    postal_code: '1227',
    amenities: [testIds.amenity1],
    status: 'PUBLISHED',
    published_at: new Date('2024-01-20'),
  },
  {
    _id: testIds.property3,
    external_id: 'PROP-003',
    source_language: 'de',
    category_id: testIds.category1,
    transaction_type: 'rent',
    price: 3200,
    currency: 'CHF',
    rooms: 4,
    surface: 110,
    address: '5 Bahnhofstrasse',
    city_id: testIds.city3,
    canton_id: testIds.canton2,
    postal_code: '8001',
    amenities: [],
    status: 'PUBLISHED',
    published_at: new Date('2024-01-25'),
  },
  {
    _id: testIds.property4,
    external_id: 'PROP-004',
    source_language: 'en',
    category_id: testIds.category1,
    transaction_type: 'rent',
    price: 1800,
    currency: 'CHF',
    rooms: 2,
    surface: 55,
    address: '15 Place du Marché',
    city_id: testIds.city1,
    canton_id: testIds.canton1,
    postal_code: '1202',
    amenities: [testIds.amenity2],
    status: 'PENDING_APPROVAL', // Not published - should not appear in search
    published_at: null,
  },
];

const testTranslations = [
  // Property 1 translations - English (original) and French (approved)
  {
    property_id: testIds.property1,
    language: 'en',
    title: 'Beautiful 3-room apartment in Geneva',
    description: 'Spacious apartment near the train station with modern finishes.',
    source: 'original',
    approval_status: 'APPROVED',
    approved_at: new Date(),
  },
  {
    property_id: testIds.property1,
    language: 'fr',
    title: 'Bel appartement de 3 pièces à Genève',
    description: 'Spacieux appartement proche de la gare avec finitions modernes.',
    source: 'deepl',
    quality_score: 0.92,
    approval_status: 'APPROVED',
    approved_at: new Date(),
  },
  {
    property_id: testIds.property1,
    language: 'de',
    title: 'Schöne 3-Zimmer-Wohnung in Genf',
    description: 'Geräumige Wohnung in Bahnhofsnähe mit moderner Ausstattung.',
    source: 'deepl',
    quality_score: 0.88,
    approval_status: 'PENDING', // Not approved - should not appear in search
  },
  // Property 2 translations - French (original) and English (approved)
  {
    property_id: testIds.property2,
    language: 'fr',
    title: 'Magnifique villa avec jardin',
    description: 'Grande maison familiale avec jardin paysager et piscine.',
    source: 'original',
    approval_status: 'APPROVED',
    approved_at: new Date(),
  },
  {
    property_id: testIds.property2,
    language: 'en',
    title: 'Magnificent villa with garden',
    description: 'Large family house with landscaped garden and swimming pool.',
    source: 'deepl',
    quality_score: 0.95,
    approval_status: 'APPROVED',
    approved_at: new Date(),
  },
  // Property 3 translations - German (original) and French (approved)
  {
    property_id: testIds.property3,
    language: 'de',
    title: 'Moderne 4-Zimmer-Wohnung in Zürich',
    description: 'Zentral gelegene Wohnung mit Blick auf die Stadt.',
    source: 'original',
    approval_status: 'APPROVED',
    approved_at: new Date(),
  },
  {
    property_id: testIds.property3,
    language: 'fr',
    title: 'Moderne appartement 4 pièces à Zurich',
    description: 'Appartement central avec vue sur la ville.',
    source: 'deepl',
    quality_score: 0.9,
    approval_status: 'APPROVED',
    approved_at: new Date(),
  },
  // Property 4 translation (PENDING_APPROVAL property - should not appear)
  {
    property_id: testIds.property4,
    language: 'en',
    title: 'Cozy 2-room apartment',
    description: 'Small but comfortable apartment in the city center.',
    source: 'original',
    approval_status: 'APPROVED',
    approved_at: new Date(),
  },
];

const testImages = [
  {
    property_id: testIds.property1,
    url: 'https://example.com/images/prop1-1.jpg',
    thumbnail_url: 'https://example.com/images/prop1-1-thumb.jpg',
    is_primary: true,
    sort_order: 1,
  },
  {
    property_id: testIds.property1,
    url: 'https://example.com/images/prop1-2.jpg',
    thumbnail_url: 'https://example.com/images/prop1-2-thumb.jpg',
    is_primary: false,
    sort_order: 2,
  },
  {
    property_id: testIds.property2,
    url: 'https://example.com/images/prop2-1.jpg',
    thumbnail_url: 'https://example.com/images/prop2-1-thumb.jpg',
    is_primary: true,
    sort_order: 1,
  },
];

const adminUser = {
  _id: testIds.adminUser,
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  first_name: 'Admin',
  last_name: 'User',
  phone: '+41799876543',
  preferred_language: 'en',
};

const regularUser = {
  _id: testIds.regularUser,
  email: 'user@example.com',
  password: 'UserPassword123!',
  first_name: 'Regular',
  last_name: 'User',
  phone: '+41789876543',
  preferred_language: 'en',
};

let app: Application;
let adminToken: string;
let userToken: string;

describe('Search Module', () => {
  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({}),
      Permission.deleteMany({}),
      UserRole.deleteMany({}),
      Property.deleteMany({}),
      PropertyTranslation.deleteMany({}),
      PropertyImage.deleteMany({}),
      Canton.deleteMany({}),
      City.deleteMany({}),
      Category.deleteMany({}),
      Agency.deleteMany({}),
      Amenity.deleteMany({}),
    ]);

    // Create test data
    await Canton.insertMany(testCantons);
    await City.insertMany(testCities);
    await Category.insertMany(testCategories);
    await Agency.create(testAgency);
    await Amenity.insertMany(testAmenities);
    await Property.insertMany(testProperties);
    await PropertyTranslation.insertMany(testTranslations);
    await PropertyImage.insertMany(testImages);

    // Create permissions
    const permissions = await Permission.insertMany([
      {
        name: 'Manage Admin',
        code: 'admin:manage',
        description: 'Full admin access',
        module: 'admin',
        action: 'manage',
      },
      {
        name: 'Read Properties',
        code: 'properties:read',
        description: 'Read properties',
        module: 'properties',
        action: 'read',
      },
    ]);

    // Create admin role
    const adminRole = await Role.create({
      name: 'Platform Admin',
      code: 'platform_admin',
      description: 'Platform admin role',
      permissions: permissions.map((p) => p._id),
      is_active: true,
    });

    // Create regular user role
    const userRole = await Role.create({
      name: 'End User',
      code: 'end_user',
      description: 'Regular user role',
      permissions: [permissions.find((p) => p.code === 'properties:read')?._id],
      is_active: true,
    });

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash(adminUser.password, 12);
    const admin = await User.create({
      _id: adminUser._id,
      email: adminUser.email,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      phone: adminUser.phone,
      preferred_language: adminUser.preferred_language,
      password_hash: hashedAdminPassword,
      user_type: 'platform_admin',
      is_active: true,
    });

    // Create regular user
    const hashedUserPassword = await bcrypt.hash(regularUser.password, 12);
    const user = await User.create({
      _id: regularUser._id,
      email: regularUser.email,
      first_name: regularUser.first_name,
      last_name: regularUser.last_name,
      phone: regularUser.phone,
      preferred_language: regularUser.preferred_language,
      password_hash: hashedUserPassword,
      user_type: 'end_user',
      is_active: true,
    });

    // Assign roles
    await UserRole.create({ user_id: admin._id, role_id: adminRole._id });
    await UserRole.create({ user_id: user._id, role_id: userRole._id });

    // Generate tokens
    adminToken = jwt.sign({ sub: admin._id.toString(), type: 'access' }, config.jwt.accessSecret, {
      expiresIn: '1h',
    });
    userToken = jwt.sign({ sub: user._id.toString(), type: 'access' }, config.jwt.accessSecret, {
      expiresIn: '1h',
    });
  });

  // ============================================================
  // INTEGRATION TESTS - Property Search
  // ============================================================
  describe('GET /api/v1/public/search/properties', () => {
    it('should return published properties with approved translations', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toBeDefined();
      // Should return 2 properties (property1 and property2 have approved EN translations)
      // property3 only has DE/FR, property4 is not PUBLISHED
      expect(response.body.data.properties.length).toBe(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by canton_id', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', canton_id: testIds.canton1.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only property1 and property2 are in canton1 (Geneva)
      expect(response.body.data.properties.length).toBe(2);
      response.body.data.properties.forEach((prop: { canton: { code: string } }) => {
        expect(prop.canton.code).toBe('GE');
      });
    });

    it('should filter by city_id', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', city_id: testIds.city1.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only property1 is in city1 with approved EN translation
      expect(response.body.data.properties.length).toBe(1);
    });

    it('should filter by transaction_type', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', transaction_type: 'buy' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only property2 is for sale with approved EN translation
      expect(response.body.data.properties.length).toBe(1);
      expect(response.body.data.properties[0].transaction_type).toBe('buy');
    });

    it('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', price_min: 2000, price_max: 3000 })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only property1 (2500 CHF) fits in this range
      expect(response.body.data.properties.length).toBe(1);
      expect(response.body.data.properties[0].price).toBe(2500);
    });

    it('should filter by rooms', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', rooms_min: 4 })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only property2 has 5 rooms with approved EN translation
      expect(response.body.data.properties.length).toBe(1);
      expect(response.body.data.properties[0].rooms).toBe(5);
    });

    it('should filter by category_id', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', category_id: testIds.category1.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only property1 is an apartment with approved EN translation
      expect(response.body.data.properties.length).toBe(1);
    });

    it('should support text search', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', q: 'train station' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Property1 description mentions train station
      expect(response.body.data.properties.length).toBeGreaterThanOrEqual(1);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', page: 1, limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties.length).toBe(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
      expect(response.body.data.pagination.total_pages).toBeGreaterThanOrEqual(1);
    });

    it('should sort by price ascending', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', sort: 'price_asc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const prices = response.body.data.properties.map((p: { price: number }) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => a - b));
    });

    it('should sort by price descending', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', sort: 'price_desc' })
        .expect(200);

      expect(response.body.success).toBe(true);
      const prices = response.body.data.properties.map((p: { price: number }) => p.price);
      expect(prices).toEqual([...prices].sort((a, b) => b - a));
    });

    it('should return 400 for invalid language', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should default to English if no language specified', async () => {
      const response = await request(app).get('/api/v1/public/search/properties').expect(200);

      expect(response.body.success).toBe(true);
      // Should return properties with approved EN translations
    });
  });

  // ============================================================
  // INTEGRATION TESTS - Cursor-based Pagination
  // ============================================================
  describe('GET /api/v1/public/search/properties/cursor', () => {
    it('should return properties with cursor pagination', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties/cursor')
        .query({ lang: 'en', limit: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties.length).toBe(1);
      expect(response.body.data.pagination.has_more).toBeDefined();
    });

    it('should support next cursor pagination', async () => {
      // Get first page
      const firstResponse = await request(app)
        .get('/api/v1/public/search/properties/cursor')
        .query({ lang: 'en', limit: 1 })
        .expect(200);

      expect(firstResponse.body.success).toBe(true);
      const nextCursor = firstResponse.body.data.pagination.next_cursor;

      if (nextCursor) {
        // Get second page
        const secondResponse = await request(app)
          .get('/api/v1/public/search/properties/cursor')
          .query({ lang: 'en', limit: 1, cursor: nextCursor })
          .expect(200);

        expect(secondResponse.body.success).toBe(true);
        // Should return different property
        expect(secondResponse.body.data.properties[0].id).not.toBe(
          firstResponse.body.data.properties[0].id
        );
      }
    });
  });

  // ============================================================
  // INTEGRATION TESTS - Location Search
  // ============================================================
  describe('GET /api/v1/public/search/locations', () => {
    it('should search locations by query', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/locations')
        .query({ q: 'Geneva', lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toBeDefined();
      expect(response.body.data.locations.length).toBeGreaterThan(0);
    });

    it('should search locations in specified language', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/locations')
        .query({ q: 'Genève', lang: 'fr' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations.length).toBeGreaterThan(0);
    });

    it('should return empty array for non-matching query', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/locations')
        .query({ q: 'NonExistent123', lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.locations.length).toBe(0);
    });

    it('should require query parameter', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/locations')
        .query({ lang: 'en' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // INTEGRATION TESTS - Unified Search
  // ============================================================
  describe('GET /api/v1/public/search', () => {
    it('should return unified search results', async () => {
      const response = await request(app)
        .get('/api/v1/public/search')
        .query({ q: 'Geneva', lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toBeDefined();
      expect(response.body.data.locations).toBeDefined();
    });

    it('should return both properties and locations matching query', async () => {
      const response = await request(app)
        .get('/api/v1/public/search')
        .query({ q: 'Geneva', lang: 'en', limit: 5 })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return Geneva-related properties and locations
    });
  });

  // ============================================================
  // INTEGRATION TESTS - Search Suggestions
  // ============================================================
  describe('GET /api/v1/public/search/suggestions', () => {
    it('should return autocomplete suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/suggestions')
        .query({ q: 'Gen', lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
      expect(Array.isArray(response.body.data.suggestions)).toBe(true);
    });

    it('should require minimum 2 character query', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/suggestions')
        .query({ q: 'G', lang: 'en' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should limit suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/suggestions')
        .query({ q: 'Gen', lang: 'en', limit: 3 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================
  // INTEGRATION TESTS - Search Facets
  // ============================================================
  describe('GET /api/v1/public/search/facets', () => {
    it('should return faceted search counts', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/facets')
        .query({ lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.facets).toBeDefined();
    });

    it('should return category counts', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/facets')
        .query({ lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.facets.categories) {
        expect(Array.isArray(response.body.data.facets.categories)).toBe(true);
      }
    });

    it('should return location counts', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/facets')
        .query({ lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data.facets.cantons) {
        expect(Array.isArray(response.body.data.facets.cantons)).toBe(true);
      }
    });

    it('should filter facets by existing filters', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/facets')
        .query({ lang: 'en', transaction_type: 'rent' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================
  // i18n TESTS - Language Support
  // ============================================================
  describe('i18n - Language Support', () => {
    it('should return French translations when lang=fr', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'fr' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should return properties with approved FR translations
      // Property 1, 2, 3 all have approved FR translations
    });

    it('should return German translations when lang=de', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'de' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Only property3 has approved DE translation (original)
      // Property1 has DE translation but it's PENDING
    });

    it('should return Italian translations when lang=it', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'it' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // No properties have approved IT translations
      expect(response.body.data.properties.length).toBe(0);
    });

    it('should not mix languages in results', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'fr' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // All returned properties should have FR content only
      response.body.data.properties.forEach((prop: { translation_language: string }) => {
        expect(prop.translation_language).toBe('fr');
      });
    });

    it('should use Accept-Language header as fallback', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .set('Accept-Language', 'fr')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ============================================================
  // RBAC TESTS - Admin Cache Invalidation
  // ============================================================
  describe('POST /api/v1/admin/search/cache/invalidate', () => {
    it('should allow admin to invalidate search cache', async () => {
      const response = await request(app)
        .post('/api/v1/admin/search/cache/invalidate')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('invalidated');
    });

    it('should invalidate cache with specific pattern', async () => {
      const response = await request(app)
        .post('/api/v1/admin/search/cache/invalidate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ pattern: 'search:properties:*' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny unauthenticated requests', async () => {
      const response = await request(app).post('/api/v1/admin/search/cache/invalidate').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should deny regular user access', async () => {
      const response = await request(app)
        .post('/api/v1/admin/search/cache/invalidate')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // UNIT TESTS - Validation
  // ============================================================
  describe('Validation', () => {
    it('should reject invalid page number', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', page: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid limit', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', limit: 1000 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid price_min', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', price_min: -100 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid rooms_min', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', rooms_min: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject invalid sort option', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', sort: 'invalid_sort' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should accept valid ObjectId for canton_id', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', canton_id: testIds.canton1.toString() })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject invalid ObjectId for canton_id', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', canton_id: 'invalid-id' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================
  // EDGE CASES
  // ============================================================
  describe('Edge Cases', () => {
    it('should handle empty results gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en', price_min: 999999999 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.properties).toEqual([]);
      expect(response.body.data.pagination.total).toBe(0);
    });

    it('should handle multiple canton_ids filter', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({
          lang: 'en',
          canton_ids: [testIds.canton1.toString(), testIds.canton2.toString()].join(','),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle multiple city_ids filter', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({
          lang: 'en',
          city_ids: [testIds.city1.toString(), testIds.city2.toString()].join(','),
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle combined filters', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({
          lang: 'en',
          transaction_type: 'rent',
          canton_id: testIds.canton1.toString(),
          price_max: 3000,
          rooms_min: 2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not return unpublished properties', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'en' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Property4 is PENDING_APPROVAL and should not appear
      const propertyIds = response.body.data.properties.map((p: { id: string }) => p.id);
      expect(propertyIds).not.toContain(testIds.property4.toString());
    });

    it('should not return properties with pending translations', async () => {
      const response = await request(app)
        .get('/api/v1/public/search/properties')
        .query({ lang: 'de' })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Property1 has DE translation but it's PENDING - should not appear
      // Only Property3 has approved DE translation
      const propertyIds = response.body.data.properties.map((p: { id: string }) => p.id);
      expect(propertyIds).not.toContain(testIds.property1.toString());
    });
  });
});
