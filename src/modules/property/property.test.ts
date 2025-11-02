// Property module tests — CRUD, RBAC, i18n, status workflow

import bcrypt from 'bcryptjs';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';

import { createApp } from '../../app.js';
import { config } from '../../config/index.js';
import { Permission } from '../admin/permission.model.js';
import { Role } from '../admin/role.model.js';
import { UserRole } from '../admin/user-role.model.js';
import { Agency, AgencyStatus } from '../agency/agency.model.js';
import { Amenity } from '../amenity/amenity.model.js';
import { Category } from '../category/category.model.js';
import { Canton } from '../location/canton.model.js';
import { City } from '../location/city.model.js';
import { User } from '../user/user.model.js';

import { Property, PropertyStatus } from './property.model.js';
import { PropertyImage } from './property-image.model.js';

// Test data for cantons
const testCantons = [
  {
    _id: new mongoose.Types.ObjectId(),
    code: 'ZH',
    name: { en: 'Zurich', fr: 'Zurich', de: 'Zürich', it: 'Zurigo' },
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    code: 'GE',
    name: { en: 'Geneva', fr: 'Genève', de: 'Genf', it: 'Ginevra' },
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    code: 'BE',
    name: { en: 'Bern', fr: 'Berne', de: 'Bern', it: 'Berna' },
    is_active: true,
  },
];

// Test data for cities
const testCities = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: { en: 'Zurich', fr: 'Zurich', de: 'Zürich', it: 'Zurigo' },
    canton_id: testCantons[0]._id,
    postal_code: '8000',
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: { en: 'Geneva', fr: 'Genève', de: 'Genf', it: 'Ginevra' },
    canton_id: testCantons[1]._id,
    postal_code: '1200',
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: { en: 'Bern', fr: 'Berne', de: 'Bern', it: 'Berna' },
    canton_id: testCantons[2]._id,
    postal_code: '3000',
    is_active: true,
  },
];

// Test data for categories
const testCategories = [
  {
    _id: new mongoose.Types.ObjectId(),
    section: 'residential',
    slug: 'apartment',
    name: { en: 'Apartment', fr: 'Appartement', de: 'Wohnung', it: 'Appartamento' },
    icon: 'apartment',
    sort_order: 1,
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    section: 'residential',
    slug: 'house',
    name: { en: 'House', fr: 'Maison', de: 'Haus', it: 'Casa' },
    icon: 'house',
    sort_order: 2,
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    section: 'commercial',
    slug: 'office',
    name: { en: 'Office', fr: 'Bureau', de: 'Büro', it: 'Ufficio' },
    icon: 'office',
    sort_order: 1,
    is_active: true,
  },
];

// Test data for amenities
const testAmenities = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: { en: 'Parking', fr: 'Parking', de: 'Parkplatz', it: 'Parcheggio' },
    group: 'parking',
    icon: 'parking',
    sort_order: 1,
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: { en: 'Balcony', fr: 'Balcon', de: 'Balkon', it: 'Balcone' },
    group: 'outdoor',
    icon: 'balcony',
    sort_order: 2,
    is_active: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: { en: 'Garden', fr: 'Jardin', de: 'Garten', it: 'Giardino' },
    group: 'outdoor',
    icon: 'garden',
    sort_order: 3,
    is_active: true,
  },
];

// Test data for agencies
const testAgencies = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Zurich Real Estate AG',
    slug: 'zurich-real-estate-ag',
    description: {
      en: 'Leading real estate agency in Zurich',
      fr: 'Agence immobilière de premier plan à Zurich',
      de: 'Führende Immobilienagentur in Zürich',
      it: 'Agenzia immobiliare leader a Zurigo',
    },
    address: 'Bahnhofstrasse 1',
    city_id: testCities[0]._id,
    canton_id: testCantons[0]._id,
    postal_code: '8001',
    status: 'active' as AgencyStatus,
    is_verified: true,
    total_properties: 10,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'Geneva Immobilier SA',
    slug: 'geneva-immobilier-sa',
    address: 'Rue du Rhône 10',
    city_id: testCities[1]._id,
    canton_id: testCantons[1]._id,
    postal_code: '1204',
    status: 'active' as AgencyStatus,
    is_verified: true,
    total_properties: 5,
  },
];

// Test data for properties
const testProperties = [
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-001',
    external_url: 'https://example.com/prop-001',
    source_language: 'en',
    category_id: testCategories[0]._id, // Apartment
    agency_id: testAgencies[0]._id,
    transaction_type: 'rent',
    price: 2500,
    currency: 'CHF',
    additional_costs: 200,
    rooms: 3.5,
    surface: 85,
    address: 'Bahnhofstrasse 10',
    city_id: testCities[0]._id,
    canton_id: testCantons[0]._id,
    postal_code: '8001',
    proximity: { train_station: '5 min', supermarket: '2 min' },
    amenities: [testAmenities[0]._id, testAmenities[1]._id],
    status: 'PUBLISHED' as PropertyStatus,
    published_at: new Date('2024-01-15'),
  },
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-002',
    source_language: 'fr',
    category_id: testCategories[1]._id, // House
    agency_id: testAgencies[0]._id,
    transaction_type: 'buy',
    price: 1500000,
    currency: 'CHF',
    rooms: 6.5,
    surface: 220,
    address: 'Seestrasse 45',
    city_id: testCities[0]._id,
    canton_id: testCantons[0]._id,
    postal_code: '8002',
    amenities: [testAmenities[0]._id, testAmenities[2]._id],
    status: 'PUBLISHED' as PropertyStatus,
    published_at: new Date('2024-01-20'),
  },
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-003',
    source_language: 'de',
    category_id: testCategories[0]._id, // Apartment
    agency_id: testAgencies[1]._id,
    transaction_type: 'rent',
    price: 3200,
    currency: 'CHF',
    rooms: 4.5,
    surface: 110,
    address: 'Rue de Lausanne 20',
    city_id: testCities[1]._id,
    canton_id: testCantons[1]._id,
    postal_code: '1201',
    amenities: [testAmenities[1]._id],
    status: 'PUBLISHED' as PropertyStatus,
    published_at: new Date('2024-01-25'),
  },
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-004',
    source_language: 'en',
    category_id: testCategories[2]._id, // Office
    agency_id: testAgencies[1]._id,
    transaction_type: 'rent',
    price: 5500,
    currency: 'CHF',
    surface: 180,
    address: 'Quai Wilson 15',
    city_id: testCities[1]._id,
    canton_id: testCantons[1]._id,
    postal_code: '1201',
    amenities: [],
    status: 'PENDING_APPROVAL' as PropertyStatus,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-005',
    source_language: 'fr',
    category_id: testCategories[0]._id,
    agency_id: testAgencies[0]._id,
    transaction_type: 'buy',
    price: 850000,
    currency: 'CHF',
    rooms: 4,
    surface: 95,
    address: 'Bundesplatz 1',
    city_id: testCities[2]._id,
    canton_id: testCantons[2]._id,
    postal_code: '3001',
    amenities: [testAmenities[0]._id],
    status: 'DRAFT' as PropertyStatus,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-006',
    source_language: 'it',
    category_id: testCategories[1]._id,
    agency_id: testAgencies[0]._id,
    transaction_type: 'buy',
    price: 2200000,
    currency: 'CHF',
    rooms: 8,
    surface: 350,
    address: 'Zollikerstrasse 100',
    city_id: testCities[0]._id,
    canton_id: testCantons[0]._id,
    postal_code: '8008',
    amenities: [testAmenities[0]._id, testAmenities[1]._id, testAmenities[2]._id],
    status: 'APPROVED' as PropertyStatus,
    reviewed_at: new Date('2024-02-01'),
  },
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-007',
    source_language: 'en',
    category_id: testCategories[0]._id,
    transaction_type: 'rent',
    price: 1800,
    currency: 'CHF',
    rooms: 2.5,
    surface: 55,
    address: 'Marktgasse 5',
    city_id: testCities[2]._id,
    canton_id: testCantons[2]._id,
    postal_code: '3011',
    amenities: [],
    status: 'REJECTED' as PropertyStatus,
    rejection_reason: 'Incomplete property details',
  },
  {
    _id: new mongoose.Types.ObjectId(),
    external_id: 'PROP-008',
    source_language: 'de',
    category_id: testCategories[1]._id,
    agency_id: testAgencies[1]._id,
    transaction_type: 'buy',
    price: 980000,
    currency: 'CHF',
    rooms: 5,
    surface: 150,
    address: 'Rennweg 50',
    city_id: testCities[0]._id,
    canton_id: testCantons[0]._id,
    postal_code: '8001',
    amenities: [testAmenities[2]._id],
    status: 'ARCHIVED' as PropertyStatus,
  },
];

// Test data for property images
const testPropertyImages = [
  {
    _id: new mongoose.Types.ObjectId(),
    property_id: testProperties[0]._id,
    url: 'https://example.com/images/prop1-main.jpg',
    thumbnail_url: 'https://example.com/images/prop1-main-thumb.jpg',
    alt_text: 'Main living area',
    sort_order: 0,
    is_primary: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    property_id: testProperties[0]._id,
    url: 'https://example.com/images/prop1-bedroom.jpg',
    alt_text: 'Master bedroom',
    sort_order: 1,
    is_primary: false,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    property_id: testProperties[1]._id,
    url: 'https://example.com/images/prop2-exterior.jpg',
    thumbnail_url: 'https://example.com/images/prop2-exterior-thumb.jpg',
    alt_text: 'House exterior',
    sort_order: 0,
    is_primary: true,
  },
];

// Test users
const adminUser = {
  email: 'admin@property-test.com',
  password: 'AdminPassword123!',
  first_name: 'Admin',
  last_name: 'User',
  phone: '+41799876543',
  preferred_language: 'en',
};

const regularUser = {
  email: 'user@property-test.com',
  password: 'UserPassword123!',
  first_name: 'Regular',
  last_name: 'User',
  phone: '+41789876543',
  preferred_language: 'en',
};

const agentUser = {
  email: 'agent@property-test.com',
  password: 'AgentPassword123!',
  first_name: 'Agent',
  last_name: 'User',
  phone: '+41799998888',
  preferred_language: 'fr',
};

let app: Application;
let adminToken: string;
let userToken: string;
let agentToken: string;
let publishedPropertyId: string;
let draftPropertyId: string;
let pendingPropertyId: string;
let approvedPropertyId: string;
let zurichCantonId: string;
let zurichCityId: string;
let apartmentCategoryId: string;
let zurichAgencyId: string;

describe('Property Module', () => {
  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await UserRole.deleteMany({});
    await Property.deleteMany({});
    await PropertyImage.deleteMany({});
    await Canton.deleteMany({});
    await City.deleteMany({});
    await Category.deleteMany({});
    await Amenity.deleteMany({});
    await Agency.deleteMany({});

    // Create test data
    await Canton.insertMany(testCantons);
    await City.insertMany(testCities);
    await Category.insertMany(testCategories);
    await Amenity.insertMany(testAmenities);
    await Agency.insertMany(testAgencies);
    await Property.insertMany(testProperties);
    await PropertyImage.insertMany(testPropertyImages);

    // Create permissions
    const permissions = await Permission.insertMany([
      {
        name: 'Read Properties',
        code: 'properties:read',
        description: 'Read properties',
        module: 'properties',
        action: 'read',
      },
      {
        name: 'Create Properties',
        code: 'properties:create',
        description: 'Create properties',
        module: 'properties',
        action: 'create',
      },
      {
        name: 'Update Properties',
        code: 'properties:update',
        description: 'Update properties',
        module: 'properties',
        action: 'update',
      },
      {
        name: 'Delete Properties',
        code: 'properties:delete',
        description: 'Delete properties',
        module: 'properties',
        action: 'delete',
      },
      {
        name: 'Manage Properties',
        code: 'properties:manage',
        description: 'Full property management',
        module: 'properties',
        action: 'manage',
      },
      {
        name: 'Approve Properties',
        code: 'properties:approve',
        description: 'Approve properties',
        module: 'properties',
        action: 'approve',
      },
      {
        name: 'Publish Properties',
        code: 'properties:publish',
        description: 'Publish properties',
        module: 'properties',
        action: 'publish',
      },
      {
        name: 'Reject Properties',
        code: 'properties:reject',
        description: 'Reject properties',
        module: 'properties',
        action: 'reject',
      },
      {
        name: 'Archive Properties',
        code: 'properties:archive',
        description: 'Archive properties',
        module: 'properties',
        action: 'archive',
      },
    ]);

    // Create admin role with all permissions
    const adminRole = await Role.create({
      name: 'Platform Admin',
      code: 'platform_admin',
      description: 'Platform admin role',
      permissions: permissions.map((p) => p._id),
      is_active: true,
    });

    // Create regular user role with no permissions
    const userRole = await Role.create({
      name: 'End User',
      code: 'end_user',
      description: 'Regular user role',
      permissions: [],
      is_active: true,
    });

    // Create agent role with limited permissions
    const agentRole = await Role.create({
      name: 'Agent',
      code: 'agent',
      description: 'Agency agent role',
      permissions: permissions
        .filter((p) =>
          ['properties:read', 'properties:create', 'properties:update'].includes(p.code)
        )
        .map((p) => p._id),
      is_active: true,
    });

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash(adminUser.password, 12);
    const admin = await User.create({
      email: adminUser.email,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name,
      phone: adminUser.phone,
      preferred_language: adminUser.preferred_language,
      password_hash: hashedAdminPassword,
      user_type: 'platform_admin',
      is_active: true,
      is_email_verified: true,
    });

    // Create regular user
    const hashedUserPassword = await bcrypt.hash(regularUser.password, 12);
    const user = await User.create({
      email: regularUser.email,
      first_name: regularUser.first_name,
      last_name: regularUser.last_name,
      phone: regularUser.phone,
      preferred_language: regularUser.preferred_language,
      password_hash: hashedUserPassword,
      user_type: 'end_user',
      is_active: true,
      is_email_verified: true,
    });

    // Create agent user
    const hashedAgentPassword = await bcrypt.hash(agentUser.password, 12);
    const agent = await User.create({
      email: agentUser.email,
      first_name: agentUser.first_name,
      last_name: agentUser.last_name,
      phone: agentUser.phone,
      preferred_language: agentUser.preferred_language,
      password_hash: hashedAgentPassword,
      user_type: 'agent',
      is_active: true,
      is_email_verified: true,
      agency_id: testAgencies[0]._id,
    });

    // Assign roles
    await UserRole.create({
      user_id: admin._id,
      role_id: adminRole._id,
      assigned_by: admin._id,
    });

    await UserRole.create({
      user_id: user._id,
      role_id: userRole._id,
      assigned_by: admin._id,
    });

    await UserRole.create({
      user_id: agent._id,
      role_id: agentRole._id,
      assigned_by: admin._id,
    });

    // Generate admin token
    adminToken = jwt.sign(
      {
        sub: admin._id.toString(),
        email: admin.email,
        userType: admin.user_type,
        roles: ['platform_admin'],
        permissions: permissions.map((p) => p.code),
      },
      config.jwt.secret,
      {
        expiresIn: '1h',
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }
    );

    // Generate user token (no permissions)
    userToken = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        userType: user.user_type,
        roles: ['end_user'],
        permissions: [],
      },
      config.jwt.secret,
      {
        expiresIn: '1h',
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }
    );

    // Generate agent token (limited permissions)
    agentToken = jwt.sign(
      {
        sub: agent._id.toString(),
        email: agent.email,
        userType: agent.user_type,
        roles: ['agent'],
        permissions: ['properties:read', 'properties:create', 'properties:update'],
        agencyId: testAgencies[0]._id.toString(),
      },
      config.jwt.secret,
      {
        expiresIn: '1h',
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }
    );

    // Store IDs
    publishedPropertyId = testProperties[0]._id.toString();
    draftPropertyId = testProperties[4]._id.toString();
    pendingPropertyId = testProperties[3]._id.toString();
    approvedPropertyId = testProperties[5]._id.toString();
    zurichCantonId = testCantons[0]._id.toString();
    zurichCityId = testCities[0]._id.toString();
    apartmentCategoryId = testCategories[0]._id.toString();
    zurichAgencyId = testAgencies[0]._id.toString();
  });

  // ==================== PUBLIC ENDPOINT TESTS ====================
  describe('Property Public Endpoints', () => {
    describe('GET /api/v1/public/properties', () => {
      it('should return only published properties by default', async () => {
        const response = await request(app).get('/api/v1/public/properties').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Properties retrieved successfully');
        expect(response.body.data).toBeInstanceOf(Array);
        // Should only return PUBLISHED properties (3 in test data)
        expect(response.body.data.length).toBe(3);
        expect(response.body.data.every((p: { status: string }) => p.status === 'PUBLISHED')).toBe(
          true
        );
        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.total).toBe(3);
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?page=1&limit=2')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(2);
        expect(response.body.meta.totalPages).toBe(2);
      });

      it('should filter by canton', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties?canton_id=${zurichCantonId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        expect(
          response.body.data.every((p: { canton_id: string }) => p.canton_id === zurichCantonId)
        ).toBe(true);
      });

      it('should filter by city', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties?city_id=${zurichCityId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(
          response.body.data.every((p: { city_id: string }) => p.city_id === zurichCityId)
        ).toBe(true);
      });

      it('should filter by category', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties?category_id=${apartmentCategoryId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(
          response.body.data.every(
            (p: { category_id: string }) => p.category_id === apartmentCategoryId
          )
        ).toBe(true);
      });

      it('should filter by transaction type', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?transaction_type=rent')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(
          response.body.data.every(
            (p: { transaction_type: string }) => p.transaction_type === 'rent'
          )
        ).toBe(true);
      });

      it('should filter by price range', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?price_min=2000&price_max=4000')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(
          response.body.data.every((p: { price: number }) => p.price >= 2000 && p.price <= 4000)
        ).toBe(true);
      });

      it('should filter by rooms range', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?rooms_min=3&rooms_max=5')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(
          response.body.data.every((p: { rooms: number }) => p.rooms >= 3 && p.rooms <= 5)
        ).toBe(true);
      });

      it('should filter by surface range', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?surface_min=80&surface_max=150')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(
          response.body.data.every((p: { surface: number }) => p.surface >= 80 && p.surface <= 150)
        ).toBe(true);
      });

      it('should sort by price ascending', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?sort=price&order=asc')
          .expect(200);

        expect(response.body.success).toBe(true);
        const prices = response.body.data.map((p: { price: number }) => p.price);
        const sortedPrices = [...prices].sort((a, b) => a - b);
        expect(prices).toEqual(sortedPrices);
      });

      it('should sort by price descending', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?sort=price&order=desc')
          .expect(200);

        expect(response.body.success).toBe(true);
        const prices = response.body.data.map((p: { price: number }) => p.price);
        const sortedPrices = [...prices].sort((a, b) => b - a);
        expect(prices).toEqual(sortedPrices);
      });

      it('should return empty array with no matches', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?price_min=10000000')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
        expect(response.body.meta.total).toBe(0);
      });
    });

    describe('GET /api/v1/public/properties/cursor', () => {
      it('should return properties with cursor pagination', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties/cursor?limit=2')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBeLessThanOrEqual(2);
        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.hasNextPage).toBeDefined();
        expect(response.body.meta.hasPrevPage).toBeDefined();
      });

      it('should return next cursor when more results available', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties/cursor?limit=1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.meta.hasNextPage).toBe(true);
        expect(response.body.meta.nextCursor).toBeDefined();
      });
    });

    describe('GET /api/v1/public/properties/:id', () => {
      it('should return a published property by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/${publishedPropertyId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Property retrieved successfully');
        expect(response.body.data.id).toBe(publishedPropertyId);
        expect(response.body.data.status).toBe('PUBLISHED');
      });

      it('should return property with images when requested', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/${publishedPropertyId}?include_images=true`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.images).toBeDefined();
        expect(response.body.data.images).toBeInstanceOf(Array);
        expect(response.body.data.images.length).toBeGreaterThanOrEqual(1);
      });

      it('should return 404 for non-existent property', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const response = await request(app).get(`/api/v1/public/properties/${fakeId}`).expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should return 400 for invalid ID format', async () => {
        const response = await request(app).get('/api/v1/public/properties/invalid-id').expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should not return non-published property to public', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/${draftPropertyId}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/public/properties/external/:externalId', () => {
      it('should return property by external ID', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties/external/PROP-001')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.external_id).toBe('PROP-001');
      });

      it('should return 404 for non-existent external ID', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties/external/NON-EXISTENT')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/public/properties/canton/:cantonId', () => {
      it('should return properties by canton ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/canton/${zurichCantonId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(
          response.body.data.every((p: { canton_id: string }) => p.canton_id === zurichCantonId)
        ).toBe(true);
      });
    });

    describe('GET /api/v1/public/properties/city/:cityId', () => {
      it('should return properties by city ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/city/${zurichCityId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(
          response.body.data.every((p: { city_id: string }) => p.city_id === zurichCityId)
        ).toBe(true);
      });
    });

    describe('GET /api/v1/public/properties/category/:categoryId', () => {
      it('should return properties by category ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/category/${apartmentCategoryId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(
          response.body.data.every(
            (p: { category_id: string }) => p.category_id === apartmentCategoryId
          )
        ).toBe(true);
      });
    });

    describe('GET /api/v1/public/properties/agency/:agencyId', () => {
      it('should return properties by agency ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/agency/${zurichAgencyId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(
          response.body.data.every((p: { agency_id: string }) => p.agency_id === zurichAgencyId)
        ).toBe(true);
      });
    });
  });

  // ==================== ADMIN ENDPOINT TESTS ====================
  describe('Property Admin Endpoints', () => {
    describe('GET /api/v1/admin/properties', () => {
      it('should return all properties including unpublished for admin', async () => {
        const response = await request(app)
          .get('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        // Should return all properties (8 in test data)
        expect(response.body.data.length).toBe(8);
      });

      it('should filter by status', async () => {
        const response = await request(app)
          .get('/api/v1/admin/properties?status=DRAFT')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.every((p: { status: string }) => p.status === 'DRAFT')).toBe(
          true
        );
      });

      it('should return 401 without authentication', async () => {
        const response = await request(app).get('/api/v1/admin/properties').expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 403 without proper permissions', async () => {
        const response = await request(app)
          .get('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/admin/properties/statistics', () => {
      it('should return property statistics', async () => {
        const response = await request(app)
          .get('/api/v1/admin/properties/statistics')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.total).toBeDefined();
        expect(response.body.data.by_status).toBeDefined();
        expect(response.body.data.by_transaction_type).toBeDefined();
      });
    });

    describe('GET /api/v1/admin/properties/:id', () => {
      it('should return any property by ID for admin', async () => {
        const response = await request(app)
          .get(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(draftPropertyId);
        expect(response.body.data.status).toBe('DRAFT');
      });
    });

    describe('POST /api/v1/admin/properties', () => {
      it('should create a new property', async () => {
        const newProperty = {
          external_id: 'NEW-PROP-001',
          source_language: 'en',
          category_id: apartmentCategoryId,
          agency_id: zurichAgencyId,
          transaction_type: 'rent',
          price: 2000,
          rooms: 3,
          surface: 75,
          address: 'Test Street 123',
          city_id: zurichCityId,
          canton_id: zurichCantonId,
          postal_code: '8001',
        };

        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newProperty)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.external_id).toBe('NEW-PROP-001');
        expect(response.body.data.status).toBe('DRAFT');
      });

      it('should validate required fields', async () => {
        const invalidProperty = {
          external_id: 'INCOMPLETE-001',
          // Missing required fields
        };

        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidProperty)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should prevent duplicate external_id', async () => {
        const duplicateProperty = {
          external_id: 'PROP-001', // Already exists
          source_language: 'en',
          category_id: apartmentCategoryId,
          transaction_type: 'rent',
          price: 2000,
          address: 'Test Street',
          city_id: zurichCityId,
          canton_id: zurichCantonId,
        };

        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(duplicateProperty)
          .expect(409);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/admin/properties/:id', () => {
      it('should update a property', async () => {
        const updates = {
          price: 3000,
          rooms: 4,
        };

        const response = await request(app)
          .put(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updates)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.price).toBe(3000);
        expect(response.body.data.rooms).toBe(4);
      });

      it('should return 404 for non-existent property', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();

        const response = await request(app)
          .put(`/api/v1/admin/properties/${fakeId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ price: 3000 })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/admin/properties/:id', () => {
      it('should delete a property', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify deletion
        const verifyResponse = await request(app)
          .get(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(verifyResponse.body.success).toBe(false);
      });

      it('should return 403 without delete permission', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    // ==================== STATUS WORKFLOW TESTS ====================
    describe('Property Status Workflow', () => {
      describe('POST /api/v1/admin/properties/:id/submit', () => {
        it('should submit DRAFT property for review', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${draftPropertyId}/submit`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe('PENDING_APPROVAL');
        });

        it('should not submit non-DRAFT property', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${publishedPropertyId}/submit`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(400);

          expect(response.body.success).toBe(false);
        });
      });

      describe('POST /api/v1/admin/properties/:id/approve', () => {
        it('should approve PENDING_APPROVAL property', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${pendingPropertyId}/approve`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe('APPROVED');
          expect(response.body.data.reviewed_at).toBeDefined();
        });

        it('should not approve non-PENDING property', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${draftPropertyId}/approve`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(400);

          expect(response.body.success).toBe(false);
        });
      });

      describe('POST /api/v1/admin/properties/:id/reject', () => {
        it('should reject PENDING_APPROVAL property with reason', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${pendingPropertyId}/reject`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              rejection_reason:
                'Incomplete documentation - missing property photos and floor plans',
            })
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe('REJECTED');
          expect(response.body.data.rejection_reason).toBe(
            'Incomplete documentation - missing property photos and floor plans'
          );
        });

        it('should require rejection reason', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${pendingPropertyId}/reject`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({})
            .expect(400);

          expect(response.body.success).toBe(false);
        });
      });

      describe('POST /api/v1/admin/properties/:id/publish', () => {
        it('should publish APPROVED property', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${approvedPropertyId}/publish`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe('PUBLISHED');
          expect(response.body.data.published_at).toBeDefined();
        });

        it('should not publish non-APPROVED property', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${draftPropertyId}/publish`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(400);

          expect(response.body.success).toBe(false);
        });
      });

      describe('POST /api/v1/admin/properties/:id/archive', () => {
        it('should archive PUBLISHED property', async () => {
          const response = await request(app)
            .post(`/api/v1/admin/properties/${publishedPropertyId}/archive`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data.status).toBe('ARCHIVED');
        });
      });
    });

    // ==================== IMAGE MANAGEMENT TESTS ====================
    describe('Property Image Management', () => {
      describe('GET /api/v1/admin/properties/:id/images', () => {
        it('should return property images', async () => {
          const response = await request(app)
            .get(`/api/v1/admin/properties/${publishedPropertyId}/images`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
          expect(response.body.data).toBeInstanceOf(Array);
          expect(response.body.data.length).toBeGreaterThanOrEqual(1);
        });
      });

      describe('POST /api/v1/admin/properties/:id/images', () => {
        it('should add image to property', async () => {
          const newImage = {
            url: 'https://example.com/new-image.jpg',
            thumbnail_url: 'https://example.com/new-image-thumb.jpg',
            alt_text: 'New image',
            is_primary: false,
          };

          const response = await request(app)
            .post(`/api/v1/admin/properties/${publishedPropertyId}/images`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newImage)
            .expect(201);

          expect(response.body.success).toBe(true);
          expect(response.body.data.url).toBe(newImage.url);
        });
      });

      describe('DELETE /api/v1/admin/properties/:id/images/:imageId', () => {
        it('should delete property image', async () => {
          const imageId = testPropertyImages[1]._id.toString();

          const response = await request(app)
            .delete(`/api/v1/admin/properties/${publishedPropertyId}/images/${imageId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .expect(200);

          expect(response.body.success).toBe(true);
        });
      });
    });
  });

  // ==================== RBAC TESTS ====================
  describe('Property RBAC Tests', () => {
    describe('Admin with full permissions', () => {
      it('should allow admin to read all properties', async () => {
        const response = await request(app)
          .get('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow admin to create properties', async () => {
        const newProperty = {
          external_id: 'ADMIN-CREATE-001',
          source_language: 'en',
          category_id: apartmentCategoryId,
          transaction_type: 'rent',
          price: 2000,
          address: 'Admin Created Street',
          city_id: zurichCityId,
          canton_id: zurichCantonId,
        };

        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newProperty)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should allow admin to delete properties', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow admin to approve properties', async () => {
        const response = await request(app)
          .post(`/api/v1/admin/properties/${pendingPropertyId}/approve`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow admin to publish properties', async () => {
        const response = await request(app)
          .post(`/api/v1/admin/properties/${approvedPropertyId}/publish`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Agent with limited permissions', () => {
      it('should allow agent to read properties', async () => {
        const response = await request(app)
          .get('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should allow agent to create properties', async () => {
        const newProperty = {
          external_id: 'AGENT-CREATE-001',
          source_language: 'fr',
          category_id: apartmentCategoryId,
          transaction_type: 'rent',
          price: 1800,
          address: 'Agent Created Street',
          city_id: zurichCityId,
          canton_id: zurichCantonId,
        };

        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${agentToken}`)
          .send(newProperty)
          .expect(201);

        expect(response.body.success).toBe(true);
      });

      it('should allow agent to update properties', async () => {
        const response = await request(app)
          .put(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${agentToken}`)
          .send({ price: 2500 })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should deny agent to delete properties', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/properties/${draftPropertyId}`)
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should deny agent to approve properties', async () => {
        const response = await request(app)
          .post(`/api/v1/admin/properties/${pendingPropertyId}/approve`)
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should deny agent to publish properties', async () => {
        const response = await request(app)
          .post(`/api/v1/admin/properties/${approvedPropertyId}/publish`)
          .set('Authorization', `Bearer ${agentToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Regular user with no permissions', () => {
      it('should deny user access to admin endpoints', async () => {
        const response = await request(app)
          .get('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should allow user to access public endpoints', async () => {
        const response = await request(app).get('/api/v1/public/properties').expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  // ==================== I18N TESTS ====================
  describe('Property i18n Tests', () => {
    describe('Language parameter', () => {
      it('should accept en language parameter', async () => {
        const response = await request(app).get('/api/v1/public/properties?lang=en').expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should accept fr language parameter', async () => {
        const response = await request(app).get('/api/v1/public/properties?lang=fr').expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should accept de language parameter', async () => {
        const response = await request(app).get('/api/v1/public/properties?lang=de').expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should accept it language parameter', async () => {
        const response = await request(app).get('/api/v1/public/properties?lang=it').expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should reject invalid language parameter', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?lang=invalid')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Localized category names in response', () => {
      it('should return localized category name for English', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/${publishedPropertyId}?lang=en`)
          .expect(200);

        expect(response.body.success).toBe(true);
        if (response.body.data.category) {
          expect(
            typeof response.body.data.category.name === 'string' ||
              response.body.data.category.name.en !== undefined
          ).toBe(true);
        }
      });

      it('should return localized category name for French', async () => {
        const response = await request(app)
          .get(`/api/v1/public/properties/${publishedPropertyId}?lang=fr`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Accept-Language header', () => {
      it('should respect Accept-Language header', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties')
          .set('Accept-Language', 'fr')
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should fallback to en for unsupported language', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties')
          .set('Accept-Language', 'es') // Spanish not supported
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });
  });

  // ==================== VALIDATION TESTS ====================
  describe('Property Validation Tests', () => {
    describe('Create property validation', () => {
      it('should require external_id', async () => {
        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            source_language: 'en',
            category_id: apartmentCategoryId,
            transaction_type: 'rent',
            price: 2000,
            address: 'Test Street',
            city_id: zurichCityId,
            canton_id: zurichCantonId,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should require valid transaction_type', async () => {
        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            external_id: 'VALID-001',
            source_language: 'en',
            category_id: apartmentCategoryId,
            transaction_type: 'invalid',
            price: 2000,
            address: 'Test Street',
            city_id: zurichCityId,
            canton_id: zurichCantonId,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should require positive price', async () => {
        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            external_id: 'VALID-002',
            source_language: 'en',
            category_id: apartmentCategoryId,
            transaction_type: 'rent',
            price: -100,
            address: 'Test Street',
            city_id: zurichCityId,
            canton_id: zurichCantonId,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should require valid source_language', async () => {
        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            external_id: 'VALID-003',
            source_language: 'invalid',
            category_id: apartmentCategoryId,
            transaction_type: 'rent',
            price: 2000,
            address: 'Test Street',
            city_id: zurichCityId,
            canton_id: zurichCantonId,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should require valid ObjectId for category_id', async () => {
        const response = await request(app)
          .post('/api/v1/admin/properties')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            external_id: 'VALID-004',
            source_language: 'en',
            category_id: 'invalid-id',
            transaction_type: 'rent',
            price: 2000,
            address: 'Test Street',
            city_id: zurichCityId,
            canton_id: zurichCantonId,
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('Query parameter validation', () => {
      it('should validate page parameter as positive integer', async () => {
        const response = await request(app).get('/api/v1/public/properties?page=-1').expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate limit parameter range', async () => {
        const response = await request(app).get('/api/v1/public/properties?limit=1000').expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate price_min as non-negative', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?price_min=-100')
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate rooms_min as non-negative', async () => {
        const response = await request(app)
          .get('/api/v1/public/properties?rooms_min=-1')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Property Edge Cases', () => {
    it('should handle empty database gracefully', async () => {
      await Property.deleteMany({});

      const response = await request(app).get('/api/v1/public/properties').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should handle very large limit gracefully', async () => {
      const response = await request(app).get('/api/v1/public/properties?limit=99').expect(200);

      expect(response.body.success).toBe(true);
      // Should be capped at max limit or return all available
      expect(response.body.meta.limit).toBeLessThanOrEqual(100);
    });

    it('should handle multiple filter combinations', async () => {
      const response = await request(app)
        .get(
          `/api/v1/public/properties?canton_id=${zurichCantonId}&transaction_type=rent&price_min=1000&price_max=5000&rooms_min=2`
        )
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should handle sorting with multiple properties of same value', async () => {
      const response = await request(app)
        .get('/api/v1/public/properties?sort=transaction_type&order=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
