// Location tests — cantons + cities CRUD

import bcrypt from 'bcryptjs';
import { Application } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import { createApp } from '../../app.js';
import { config } from '../../config/index.js';
import { Permission } from '../admin/permission.model.js';
import { Role } from '../admin/role.model.js';
import { UserRole } from '../admin/user-role.model.js';
import { User } from '../user/user.model.js';
import { Canton, ICanton } from './canton.model.js';
import { City, ICity } from './city.model.js';

// Test data
const testCantons = [
  {
    code: 'VD',
    name: { en: 'Vaud', fr: 'Vaud', de: 'Waadt', it: 'Vaud' },
    is_active: true,
  },
  {
    code: 'GE',
    name: { en: 'Geneva', fr: 'Genève', de: 'Genf', it: 'Ginevra' },
    is_active: true,
  },
  {
    code: 'BE',
    name: { en: 'Bern', fr: 'Berne', de: 'Bern', it: 'Berna' },
    is_active: false, // Inactive for testing filter
  },
];

const adminUser = {
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  first_name: 'Admin',
  last_name: 'User',
  phone: '+41799876543',
  preferred_language: 'en',
};

let app: Application;
let adminToken: string;
let adminRoleId: string;
let vdCantonId: string;
let geCantonId: string;
let beCantonId: string;
let lausanneCityId: string;

describe('Location Module', () => {
  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await UserRole.deleteMany({});
    await Canton.deleteMany({});
    await City.deleteMany({});

    // Create test permissions
    const permissions = await Permission.insertMany([
      {
        name: 'Read Locations',
        code: 'locations:read',
        description: 'Read locations',
        module: 'locations',
        action: 'read',
      },
      {
        name: 'Create Locations',
        code: 'locations:create',
        description: 'Create locations',
        module: 'locations',
        action: 'create',
      },
      {
        name: 'Update Locations',
        code: 'locations:update',
        description: 'Update locations',
        module: 'locations',
        action: 'update',
      },
      {
        name: 'Delete Locations',
        code: 'locations:delete',
        description: 'Delete locations',
        module: 'locations',
        action: 'delete',
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
    adminRoleId = adminRole._id.toString();

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminUser.password, 12);
    const admin = await User.create({
      ...adminUser,
      password: hashedPassword,
      user_type: 'platform_admin',
      is_active: true,
      is_email_verified: true,
    });

    // Assign admin role
    await UserRole.create({
      user_id: admin._id,
      role_id: adminRole._id,
      assigned_by: admin._id,
    });

    // Generate admin token
    adminToken = jwt.sign(
      {
        sub: admin._id.toString(),
        email: admin.email,
        user_type: admin.user_type,
        roles: ['platform_admin'],
        permissions: permissions.map((p) => p.code),
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    // Create test cantons
    const createdCantons = await Canton.insertMany(testCantons);
    vdCantonId = createdCantons[0]._id.toString();
    geCantonId = createdCantons[1]._id.toString();
    beCantonId = createdCantons[2]._id.toString();

    // Create test cities
    const testCities = [
      {
        canton_id: createdCantons[0]._id,
        name: { en: 'Lausanne', fr: 'Lausanne', de: 'Lausanne', it: 'Losanna' },
        postal_code: '1000',
        is_active: true,
      },
      {
        canton_id: createdCantons[0]._id,
        name: { en: 'Lausanne', fr: 'Lausanne', de: 'Lausanne', it: 'Losanna' },
        postal_code: '1003',
        is_active: true,
      },
      {
        canton_id: createdCantons[0]._id,
        name: { en: 'Pully', fr: 'Pully', de: 'Pully', it: 'Pully' },
        postal_code: '1009',
        is_active: true,
      },
      {
        canton_id: createdCantons[1]._id,
        name: { en: 'Geneva', fr: 'Genève', de: 'Genf', it: 'Ginevra' },
        postal_code: '1200',
        is_active: true,
      },
      {
        canton_id: createdCantons[0]._id,
        name: { en: 'Nyon', fr: 'Nyon', de: 'Nyon', it: 'Nyon' },
        postal_code: '1260',
        is_active: false, // Inactive for testing
      },
    ];
    const createdCities = await City.insertMany(testCities);
    lausanneCityId = createdCities[0]._id.toString();
  });

  // ==================== CANTON PUBLIC ENDPOINT TESTS ====================
  describe('Canton Public Endpoints', () => {
    describe('GET /api/v1/public/locations/cantons', () => {
      it('should return all active cantons', async () => {
        const response = await request(app).get('/api/v1/public/locations/cantons').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Cantons retrieved successfully');
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(2); // Only active cantons
        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.total).toBe(2);
      });

      it('should include inactive cantons when is_active filter is false', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons?is_active=false')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].code).toBe('BE');
      });

      it('should filter by canton code', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons?code=VD')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].code).toBe('VD');
      });

      it('should search cantons by name', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons?search=Geneva')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].code).toBe('GE');
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons?page=1&limit=1')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(1);
        expect(response.body.meta.totalPages).toBe(2);
        expect(response.body.meta.hasNextPage).toBe(true);
        expect(response.body.meta.hasPrevPage).toBe(false);
      });

      it('should sort results by code ascending', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons?sort=code')
          .expect(200);

        expect(response.body.data[0].code).toBe('GE');
        expect(response.body.data[1].code).toBe('VD');
      });

      it('should sort results by code descending', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons?sort=-code')
          .expect(200);

        expect(response.body.data[0].code).toBe('VD');
        expect(response.body.data[1].code).toBe('GE');
      });
    });

    describe('GET /api/v1/public/locations/cantons/:id', () => {
      it('should return canton by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${vdCantonId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(vdCantonId);
        expect(response.body.data.code).toBe('VD');
        expect(response.body.data.name).toBeDefined();
      });

      it('should return 404 for non-existent canton', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons/000000000000000000000000')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Canton not found');
      });

      it('should return 400 for invalid ID format', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons/invalid-id')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/public/locations/cantons/code/:code', () => {
      it('should return canton by code', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons/code/VD')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.code).toBe('VD');
        expect(response.body.data.name.en).toBe('Vaud');
      });

      it('should be case-insensitive', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons/code/vd')
          .expect(200);

        expect(response.body.data.code).toBe('VD');
      });

      it('should return 404 for non-existent code', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons/code/XX')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Canton not found');
      });
    });

    describe('GET /api/v1/public/locations/cantons/:id/cities', () => {
      it('should return cities for a canton', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${vdCantonId}/cities`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(3); // 3 active cities in VD
        expect(response.body.meta.total).toBe(3);
      });

      it('should paginate cities', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${vdCantonId}/cities?limit=2`)
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.totalPages).toBe(2);
      });
    });
  });

  // ==================== CITY PUBLIC ENDPOINT TESTS ====================
  describe('City Public Endpoints', () => {
    describe('GET /api/v1/public/locations/cities', () => {
      it('should return all active cities with populated canton', async () => {
        const response = await request(app).get('/api/v1/public/locations/cities').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(4); // Only active cities
        expect(response.body.data[0].canton).toBeDefined();
        expect(response.body.data[0].canton.code).toBeDefined();
      });

      it('should filter by canton_id', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cities?canton_id=${geCantonId}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Geneva');
      });

      it('should filter by postal_code', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cities?postal_code=1000')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].postal_code).toBe('1000');
      });

      it('should search cities by name', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cities?search=pully')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Pully');
      });
    });

    describe('GET /api/v1/public/locations/cities/:id', () => {
      it('should return city by ID with populated canton', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cities/${lausanneCityId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(lausanneCityId);
        expect(response.body.data.name.en).toBe('Lausanne');
        expect(response.body.data.canton).toBeDefined();
        expect(response.body.data.canton.code).toBe('VD');
      });

      it('should return 404 for non-existent city', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cities/000000000000000000000000')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/public/locations/cities/postal/:postalCode', () => {
      it('should return cities by postal code', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cities/postal/1000')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].postal_code).toBe('1000');
      });

      it('should return empty array for non-existent postal code', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cities/postal/9999')
          .expect(200);

        expect(response.body.data).toEqual([]);
      });
    });

    describe('GET /api/v1/public/locations/cities/search', () => {
      it('should search cities by query', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cities/search?q=Lausanne')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        expect(
          response.body.data.some((city: { name: { en: string } }) =>
            city.name.en.includes('Lausanne')
          )
        ).toBe(true);
      });

      it('should return cities with populated canton', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cities/search?q=Geneva')
          .expect(200);

        expect(response.body.data[0].canton).toBeDefined();
        expect(response.body.data[0].canton.code).toBe('GE');
      });
    });
  });

  // ==================== i18n TESTS ====================
  describe('Internationalization (i18n)', () => {
    describe('Canton name localization', () => {
      it('should return full name object without lang parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${geCantonId}`)
          .expect(200);

        expect(response.body.data.name).toEqual({
          en: 'Geneva',
          fr: 'Genève',
          de: 'Genf',
          it: 'Ginevra',
        });
      });

      it('should return French name with lang=fr', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${geCantonId}?lang=fr`)
          .expect(200);

        expect(response.body.data.name).toBe('Genève');
      });

      it('should return German name with lang=de', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${geCantonId}?lang=de`)
          .expect(200);

        expect(response.body.data.name).toBe('Genf');
      });

      it('should return Italian name with lang=it', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${geCantonId}?lang=it`)
          .expect(200);

        expect(response.body.data.name).toBe('Ginevra');
      });

      it('should return English name with lang=en', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cantons/${geCantonId}?lang=en`)
          .expect(200);

        expect(response.body.data.name).toBe('Geneva');
      });
    });

    describe('City name localization', () => {
      it('should return localized city name with lang parameter', async () => {
        const response = await request(app)
          .get(`/api/v1/public/locations/cities/${lausanneCityId}?lang=it`)
          .expect(200);

        expect(response.body.data.name).toBe('Losanna');
      });
    });

    describe('Canton list localization', () => {
      it('should return localized names in list with lang parameter', async () => {
        const response = await request(app)
          .get('/api/v1/public/locations/cantons?lang=fr')
          .expect(200);

        // All names should be strings, not objects
        response.body.data.forEach((canton: { name: string }) => {
          expect(typeof canton.name).toBe('string');
        });
      });
    });
  });

  // ==================== ADMIN ENDPOINT TESTS ====================
  describe('Canton Admin Endpoints', () => {
    describe('POST /api/v1/admin/locations/cantons', () => {
      it('should create canton with valid data and auth', async () => {
        const newCanton = {
          code: 'ZH',
          name: { en: 'Zurich', fr: 'Zurich', de: 'Zürich', it: 'Zurigo' },
          is_active: true,
        };

        const response = await request(app)
          .post('/api/v1/admin/locations/cantons')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newCanton)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Canton created successfully');
        expect(response.body.data.code).toBe('ZH');
        expect(response.body.data.name.de).toBe('Zürich');
      });

      it('should return 401 without auth token', async () => {
        const newCanton = {
          code: 'ZH',
          name: { en: 'Zurich', fr: 'Zurich', de: 'Zürich', it: 'Zurigo' },
        };

        const response = await request(app)
          .post('/api/v1/admin/locations/cantons')
          .send(newCanton)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should return 409 for duplicate canton code', async () => {
        const response = await request(app)
          .post('/api/v1/admin/locations/cantons')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            code: 'VD',
            name: { en: 'Duplicate', fr: 'Duplicate', de: 'Duplicate', it: 'Duplicate' },
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Canton code already exists');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/admin/locations/cantons')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ code: 'XX' }) // Missing name
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/v1/admin/locations/cantons/:id', () => {
      it('should update canton with valid data', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/locations/cantons/${vdCantonId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: { en: 'Vaud Updated', fr: 'Vaud Mis à jour', de: 'Waadt', it: 'Vaud' } })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.name.en).toBe('Vaud Updated');
      });

      it('should return 404 for non-existent canton', async () => {
        const response = await request(app)
          .patch('/api/v1/admin/locations/cantons/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' } })
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should return 409 when updating to existing code', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/locations/cantons/${vdCantonId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ code: 'GE' }) // GE already exists
          .expect(409);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/admin/locations/cantons/:id', () => {
      it('should delete canton without cities', async () => {
        // Create a canton without cities
        const tempCanton = await Canton.create({
          code: 'TM',
          name: { en: 'Temp', fr: 'Temp', de: 'Temp', it: 'Temp' },
          is_active: true,
        });

        const response = await request(app)
          .delete(`/api/v1/admin/locations/cantons/${tempCanton._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Canton deleted successfully');

        // Verify deletion
        const deleted = await Canton.findById(tempCanton._id);
        expect(deleted).toBeNull();
      });

      it('should return 400 when canton has cities', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/locations/cantons/${vdCantonId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('cities');
      });

      it('should return 404 for non-existent canton', async () => {
        const response = await request(app)
          .delete('/api/v1/admin/locations/cantons/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('City Admin Endpoints', () => {
    describe('POST /api/v1/admin/locations/cities', () => {
      it('should create city with valid data', async () => {
        const newCity = {
          canton_id: vdCantonId,
          name: { en: 'Morges', fr: 'Morges', de: 'Morges', it: 'Morges' },
          postal_code: '1110',
          is_active: true,
        };

        const response = await request(app)
          .post('/api/v1/admin/locations/cities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newCity)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.postal_code).toBe('1110');
      });

      it('should return 404 for non-existent canton', async () => {
        const response = await request(app)
          .post('/api/v1/admin/locations/cities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            canton_id: '000000000000000000000000',
            name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
            postal_code: '0000',
          })
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should allow creating city with string name', async () => {
        const response = await request(app)
          .post('/api/v1/admin/locations/cities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            canton_id: vdCantonId,
            name: 'Simple City Name',
            postal_code: '1234',
          })
          .expect(201);

        expect(response.body.success).toBe(true);
      });
    });

    describe('PATCH /api/v1/admin/locations/cities/:id', () => {
      it('should update city', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/locations/cities/${lausanneCityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ postal_code: '1001' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.postal_code).toBe('1001');
      });

      it('should update city canton', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/locations/cities/${lausanneCityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ canton_id: geCantonId })
          .expect(200);

        expect(response.body.data.canton_id).toBe(geCantonId);
      });

      it('should return 404 for non-existent city', async () => {
        const response = await request(app)
          .patch('/api/v1/admin/locations/cities/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ postal_code: '1234' })
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/admin/locations/cities/:id', () => {
      it('should delete city', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/locations/cities/${lausanneCityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify deletion
        const deleted = await City.findById(lausanneCityId);
        expect(deleted).toBeNull();
      });

      it('should return 404 for non-existent city', async () => {
        const response = await request(app)
          .delete('/api/v1/admin/locations/cities/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== RBAC TESTS ====================
  describe('RBAC Permission Tests', () => {
    let userWithNoPermissions: string;

    beforeEach(async () => {
      // Create user with no location permissions
      const noPermRole = await Role.create({
        name: 'No Perm Role',
        code: 'no_perm',
        description: 'No permissions',
        permissions: [],
        is_active: true,
      });

      const hashedPassword = await bcrypt.hash('TestPass123!', 12);
      const user = await User.create({
        email: 'noperm@example.com',
        password: hashedPassword,
        first_name: 'No',
        last_name: 'Perm',
        user_type: 'end_user',
        is_active: true,
        is_email_verified: true,
      });

      await UserRole.create({
        user_id: user._id,
        role_id: noPermRole._id,
        assigned_by: user._id,
      });

      userWithNoPermissions = jwt.sign(
        {
          sub: user._id.toString(),
          email: user.email,
          user_type: user.user_type,
          roles: ['no_perm'],
          permissions: [],
        },
        config.jwt.secret,
        { expiresIn: '1h' }
      );
    });

    it('should deny access to create canton without locations:create permission', async () => {
      const response = await request(app)
        .post('/api/v1/admin/locations/cantons')
        .set('Authorization', `Bearer ${userWithNoPermissions}`)
        .send({
          code: 'ZH',
          name: { en: 'Zurich', fr: 'Zurich', de: 'Zürich', it: 'Zurigo' },
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should deny access to update canton without locations:update permission', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/locations/cantons/${vdCantonId}`)
        .set('Authorization', `Bearer ${userWithNoPermissions}`)
        .send({ code: 'VX' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should deny access to delete canton without locations:delete permission', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/locations/cantons/${vdCantonId}`)
        .set('Authorization', `Bearer ${userWithNoPermissions}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow access to public endpoints without authentication', async () => {
      const response = await request(app).get('/api/v1/public/locations/cantons').expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== SERVICE UNIT TESTS ====================
  describe('LocationService Unit Tests', () => {
    describe('searchLocations', () => {
      it('should search both cantons and cities', async () => {
        const { locationService } = await import('./location.service.js');

        const result = await locationService.searchLocations('Lausanne');

        expect(result.cantons).toBeInstanceOf(Array);
        expect(result.cities).toBeInstanceOf(Array);
        expect(result.cities.length).toBeGreaterThan(0);
      });
    });
  });
});
