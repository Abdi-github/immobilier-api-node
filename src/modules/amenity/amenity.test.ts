// Amenity tests — CRUD + group management

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

import { Amenity } from './amenity.model.js';

// Test data
const testAmenities = [
  {
    name: { en: 'Parking', fr: 'Parking', de: 'Parkplatz', it: 'Parcheggio' },
    group: 'parking',
    icon: 'parking',
    sort_order: 1,
    is_active: true,
  },
  {
    name: { en: 'Garage', fr: 'Garage', de: 'Garage', it: 'Garage' },
    group: 'parking',
    icon: 'garage',
    sort_order: 2,
    is_active: true,
  },
  {
    name: { en: 'Balcony', fr: 'Balcon', de: 'Balkon', it: 'Balcone' },
    group: 'outdoor',
    icon: 'balcony',
    sort_order: 1,
    is_active: true,
  },
  {
    name: { en: 'Garden', fr: 'Jardin', de: 'Garten', it: 'Giardino' },
    group: 'outdoor',
    icon: 'garden',
    sort_order: 2,
    is_active: true,
  },
  {
    name: {
      en: 'Alarm System',
      fr: "Système d'alarme",
      de: 'Alarmsystem',
      it: "Sistema d'allarme",
    },
    group: 'security',
    icon: 'alarm',
    sort_order: 1,
    is_active: true,
  },
  {
    name: {
      en: 'Equipped Kitchen',
      fr: 'Cuisine équipée',
      de: 'Einbauküche',
      it: 'Cucina attrezzata',
    },
    group: 'kitchen',
    icon: 'kitchen',
    sort_order: 1,
    is_active: true,
  },
  {
    name: {
      en: 'Inactive Amenity',
      fr: 'Amenité Inactive',
      de: 'Inaktive Annehmlichkeit',
      it: 'Comodità Inattiva',
    },
    group: 'other',
    icon: 'test',
    sort_order: 99,
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

const regularUser = {
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
let parkingAmenityId: string;
let inactiveAmenityId: string;

describe('Amenity Module', () => {
  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await UserRole.deleteMany({});
    await Amenity.deleteMany({});

    // Create test permissions
    const permissions = await Permission.insertMany([
      {
        name: 'Read Amenities',
        code: 'amenities:read',
        description: 'Read amenities',
        module: 'amenities',
        action: 'read',
      },
      {
        name: 'Create Amenities',
        code: 'amenities:create',
        description: 'Create and update amenities',
        module: 'amenities',
        action: 'create',
      },
      {
        name: 'Delete Amenities',
        code: 'amenities:delete',
        description: 'Delete amenities',
        module: 'amenities',
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

    // Create regular user role with no permissions
    const userRole = await Role.create({
      name: 'End User',
      code: 'end_user',
      description: 'Regular user role',
      permissions: [],
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

    // Assign admin role
    await UserRole.create({
      user_id: admin._id,
      role_id: adminRole._id,
      assigned_by: admin._id,
    });

    // Assign user role
    await UserRole.create({
      user_id: user._id,
      role_id: userRole._id,
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

    // Create test amenities
    const createdAmenities = await Amenity.insertMany(testAmenities);
    parkingAmenityId = createdAmenities[0]._id.toString();
    inactiveAmenityId = createdAmenities[6]._id.toString();
  });

  // ==================== AMENITY PUBLIC ENDPOINT TESTS ====================
  describe('Amenity Public Endpoints', () => {
    describe('GET /api/v1/public/amenities', () => {
      it('should return all active amenities', async () => {
        const response = await request(app).get('/api/v1/public/amenities').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Amenities retrieved successfully');
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(6); // Only active amenities
        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.total).toBe(6);
      });

      it('should include inactive amenities when is_active filter is false', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?is_active=false')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Inactive Amenity');
      });

      it('should filter by group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?group=parking')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.data.every((a: { group: string }) => a.group === 'parking')).toBe(
          true
        );
      });

      it('should filter by outdoor group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?group=outdoor')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.data[0].name.en).toBe('Balcony');
      });

      it('should filter by security group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?group=security')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Alarm System');
      });

      it('should search amenities by name', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?search=Parking')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Parking');
      });

      it('should search amenities by French name', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?search=Jardin')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.fr).toBe('Jardin');
      });

      it('should search amenities by German name', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?search=Garten')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.de).toBe('Garten');
      });

      it('should search amenities with special characters', async () => {
        const response = await request(app)
          .get(`/api/v1/public/amenities?search=${encodeURIComponent('équipée')}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Equipped Kitchen');
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?page=1&limit=2')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(2);
        expect(response.body.meta.totalPages).toBe(3);
        expect(response.body.meta.hasNextPage).toBe(true);
        expect(response.body.meta.hasPrevPage).toBe(false);
      });

      it('should get second page of results', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?page=2&limit=2')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.page).toBe(2);
        expect(response.body.meta.hasNextPage).toBe(true);
        expect(response.body.meta.hasPrevPage).toBe(true);
      });

      it('should get third page of results', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?page=3&limit=2')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.page).toBe(3);
        expect(response.body.meta.hasNextPage).toBe(false);
        expect(response.body.meta.hasPrevPage).toBe(true);
      });

      it('should sort results by sort_order ascending (default)', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?sort=sort_order')
          .expect(200);

        expect(response.body.data[0].sort_order).toBeLessThanOrEqual(
          response.body.data[1].sort_order
        );
      });

      it('should sort results by sort_order descending', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?sort=-sort_order')
          .expect(200);

        expect(response.body.data[0].sort_order).toBeGreaterThanOrEqual(
          response.body.data[1].sort_order
        );
      });

      it('should sort results by name.en ascending', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities?sort=name.en')
          .expect(200);

        expect(response.body.data[0].name.en).toBe('Alarm System');
      });
    });

    describe('GET /api/v1/public/amenities/:id', () => {
      it('should return amenity by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/amenities/${parkingAmenityId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(parkingAmenityId);
        expect(response.body.data.name.en).toBe('Parking');
        expect(response.body.data.group).toBe('parking');
      });

      it('should return 404 for non-existent amenity', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities/000000000000000000000000')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Amenity not found');
      });

      it('should return 400 for invalid ID format', async () => {
        const response = await request(app).get('/api/v1/public/amenities/invalid-id').expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/public/amenities/group/:group', () => {
      it('should return amenities by parking group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities/group/parking')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(2);
        expect(response.body.data.every((a: { group: string }) => a.group === 'parking')).toBe(
          true
        );
      });

      it('should return amenities by outdoor group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities/group/outdoor')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(2);
      });

      it('should return amenities by security group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities/group/security')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Alarm System');
      });

      it('should return amenities by kitchen group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities/group/kitchen')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].name.en).toBe('Equipped Kitchen');
      });

      it('should return empty array for group with no active amenities', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities/group/accessibility')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(0);
      });

      it('should return 400 for invalid group', async () => {
        const response = await request(app)
          .get('/api/v1/public/amenities/group/invalid-group')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== AMENITY ADMIN ENDPOINT TESTS ====================
  describe('Amenity Admin Endpoints', () => {
    describe('GET /api/v1/admin/amenities', () => {
      it('should return all amenities for admin', async () => {
        const response = await request(app)
          .get('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.length).toBe(6); // Default shows only active
      });

      it('should return inactive amenities when filtered', async () => {
        const response = await request(app)
          .get('/api/v1/admin/amenities?is_active=false')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].is_active).toBe(false);
      });

      it('should require authentication', async () => {
        const response = await request(app).get('/api/v1/admin/amenities').expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should require amenities:read permission', async () => {
        const response = await request(app)
          .get('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/v1/admin/amenities', () => {
      const newAmenity = {
        name: {
          en: 'Swimming Pool',
          fr: 'Piscine',
          de: 'Schwimmbad',
          it: 'Piscina',
        },
        group: 'outdoor',
        icon: 'pool',
        sort_order: 10,
        is_active: true,
      };

      it('should create a new amenity', async () => {
        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newAmenity)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Amenity created successfully');
        expect(response.body.data.name.en).toBe('Swimming Pool');
        expect(response.body.data.group).toBe('outdoor');
        expect(response.body.data.icon).toBe('pool');
        expect(response.body.data.sort_order).toBe(10);
        expect(response.body.data.id).toBeDefined();
      });

      it('should create amenity with default values', async () => {
        const minimalAmenity = {
          name: {
            en: 'Test Amenity',
            fr: 'Test Amenité',
            de: 'Test Annehmlichkeit',
            it: 'Test Comodità',
          },
          group: 'general',
        };

        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(minimalAmenity)
          .expect(201);

        expect(response.body.data.sort_order).toBe(0);
        expect(response.body.data.is_active).toBe(true);
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .send(newAmenity)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should require amenities:create permission', async () => {
        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${userToken}`)
          .send(newAmenity)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should validate required name fields', async () => {
        const invalidAmenity = {
          name: { en: 'Only English' },
          group: 'general',
        };

        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAmenity)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate required group field', async () => {
        const invalidAmenity = {
          name: {
            en: 'Test',
            fr: 'Test',
            de: 'Test',
            it: 'Test',
          },
        };

        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAmenity)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate group enum values', async () => {
        const invalidAmenity = {
          name: {
            en: 'Test',
            fr: 'Test',
            de: 'Test',
            it: 'Test',
          },
          group: 'invalid-group',
        };

        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAmenity)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate sort_order is non-negative', async () => {
        const invalidAmenity = {
          name: {
            en: 'Test',
            fr: 'Test',
            de: 'Test',
            it: 'Test',
          },
          group: 'general',
          sort_order: -1,
        };

        const response = await request(app)
          .post('/api/v1/admin/amenities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidAmenity)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/v1/admin/amenities/:id', () => {
      it('should update an amenity', async () => {
        const updateData = {
          name: {
            en: 'Updated Parking',
            fr: 'Parking Mis à jour',
            de: 'Aktualisierter Parkplatz',
            it: 'Parcheggio Aggiornato',
          },
          sort_order: 100,
        };

        const response = await request(app)
          .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Amenity updated successfully');
        expect(response.body.data.name.en).toBe('Updated Parking');
        expect(response.body.data.sort_order).toBe(100);
      });

      it('should update amenity group', async () => {
        const updateData = {
          group: 'security',
        };

        const response = await request(app)
          .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.group).toBe('security');
      });

      it('should update amenity is_active status', async () => {
        const updateData = {
          is_active: false,
        };

        const response = await request(app)
          .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.is_active).toBe(false);
      });

      it('should update amenity icon', async () => {
        const updateData = {
          icon: 'new-parking-icon',
        };

        const response = await request(app)
          .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.icon).toBe('new-parking-icon');
      });

      it('should return 404 for non-existent amenity', async () => {
        const response = await request(app)
          .patch('/api/v1/admin/amenities/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ sort_order: 1 })
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Amenity not found');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .send({ sort_order: 1 })
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should require amenities:create permission', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ sort_order: 1 })
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should validate group enum on update', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ group: 'invalid-group' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/v1/admin/amenities/:id', () => {
      it('should delete an amenity', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/amenities/${inactiveAmenityId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Amenity deleted successfully');

        // Verify deletion
        const getResponse = await request(app)
          .get(`/api/v1/public/amenities/${inactiveAmenityId}`)
          .expect(404);

        expect(getResponse.body.success).toBe(false);
      });

      it('should return 404 for non-existent amenity', async () => {
        const response = await request(app)
          .delete('/api/v1/admin/amenities/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Amenity not found');
      });

      it('should require authentication', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should require amenities:delete permission', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/amenities/${parkingAmenityId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== RBAC TESTS ====================
  describe('RBAC Tests', () => {
    it('should allow public access to list amenities', async () => {
      const response = await request(app).get('/api/v1/public/amenities').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow public access to get amenity by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/public/amenities/${parkingAmenityId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow public access to get amenities by group', async () => {
      const response = await request(app).get('/api/v1/public/amenities/group/parking').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should deny admin list without authentication', async () => {
      const response = await request(app).get('/api/v1/admin/amenities').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should deny admin list without amenities:read permission', async () => {
      const response = await request(app)
        .get('/api/v1/admin/amenities')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should deny create without amenities:create permission', async () => {
      const response = await request(app)
        .post('/api/v1/admin/amenities')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
          group: 'general',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should deny update without amenities:create permission', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ sort_order: 999 })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should deny delete without amenities:delete permission', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/amenities/${parkingAmenityId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== I18N TESTS ====================
  describe('i18n Tests', () => {
    it('should return localized name in English', async () => {
      const response = await request(app)
        .get(`/api/v1/public/amenities/${parkingAmenityId}?lang=en`)
        .expect(200);

      expect(response.body.data.name).toBe('Parking');
    });

    it('should return localized name in French', async () => {
      const response = await request(app)
        .get(`/api/v1/public/amenities/${parkingAmenityId}?lang=fr`)
        .expect(200);

      expect(response.body.data.name).toBe('Parking');
    });

    it('should return localized name in German', async () => {
      const response = await request(app)
        .get(`/api/v1/public/amenities/${parkingAmenityId}?lang=de`)
        .expect(200);

      expect(response.body.data.name).toBe('Parkplatz');
    });

    it('should return localized name in Italian', async () => {
      const response = await request(app)
        .get(`/api/v1/public/amenities/${parkingAmenityId}?lang=it`)
        .expect(200);

      expect(response.body.data.name).toBe('Parcheggio');
    });

    it('should return all language names when no lang specified', async () => {
      const response = await request(app)
        .get(`/api/v1/public/amenities/${parkingAmenityId}`)
        .expect(200);

      expect(response.body.data.name.en).toBe('Parking');
      expect(response.body.data.name.fr).toBe('Parking');
      expect(response.body.data.name.de).toBe('Parkplatz');
      expect(response.body.data.name.it).toBe('Parcheggio');
    });

    it('should return localized names in list endpoint', async () => {
      const response = await request(app).get('/api/v1/public/amenities?lang=fr').expect(200);

      expect(typeof response.body.data[0].name).toBe('string');
    });

    it('should return localized names in group endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/public/amenities/group/parking?lang=de')
        .expect(200);

      expect(typeof response.body.data[0].name).toBe('string');
      expect(response.body.data[0].name).toBe('Parkplatz');
    });

    it('should reject invalid language parameter', async () => {
      const response = await request(app).get('/api/v1/public/amenities?lang=invalid').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== VALIDATION TESTS ====================
  describe('Validation Tests', () => {
    it('should validate page parameter is positive integer', async () => {
      const response = await request(app).get('/api/v1/public/amenities?page=0').expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate limit parameter maximum', async () => {
      const response = await request(app).get('/api/v1/public/amenities?limit=101').expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate sort field values', async () => {
      const response = await request(app)
        .get('/api/v1/public/amenities?sort=invalid_field')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate group parameter values', async () => {
      const response = await request(app).get('/api/v1/public/amenities?group=invalid').expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate ID parameter format', async () => {
      const response = await request(app)
        .get('/api/v1/public/amenities/not-a-valid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate name object structure on create', async () => {
      const response = await request(app)
        .post('/api/v1/admin/amenities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'not an object',
          group: 'general',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate name length constraints', async () => {
      const response = await request(app)
        .post('/api/v1/admin/amenities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: {
            en: 'A'.repeat(201), // Too long
            fr: 'Test',
            de: 'Test',
            it: 'Test',
          },
          group: 'general',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate icon length constraint', async () => {
      const response = await request(app)
        .post('/api/v1/admin/amenities')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
          group: 'general',
          icon: 'A'.repeat(101), // Too long
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== EDGE CASE TESTS ====================
  describe('Edge Case Tests', () => {
    it('should handle empty database gracefully', async () => {
      await Amenity.deleteMany({});

      const response = await request(app).get('/api/v1/public/amenities').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta.total).toBe(0);
    });

    it('should handle empty group results', async () => {
      const response = await request(app)
        .get('/api/v1/public/amenities/group/accessibility')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle large page numbers gracefully', async () => {
      const response = await request(app).get('/api/v1/public/amenities?page=999').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle search with no results', async () => {
      const response = await request(app)
        .get('/api/v1/public/amenities?search=nonexistentamenity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should handle combined filters', async () => {
      const response = await request(app)
        .get(
          '/api/v1/public/amenities?group=parking&search=Parking&sort=-sort_order&page=1&limit=10'
        )
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every((a: { group: string }) => a.group === 'parking')).toBe(true);
    });

    it('should handle partial update with empty body', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(200);

      // Should succeed but not change anything
      expect(response.body.success).toBe(true);
    });

    it('should preserve unchanged fields on partial update', async () => {
      // First get the original
      const originalResponse = await request(app)
        .get(`/api/v1/public/amenities/${parkingAmenityId}`)
        .expect(200);

      const originalName = originalResponse.body.data.name;

      // Update only sort_order
      const updateResponse = await request(app)
        .patch(`/api/v1/admin/amenities/${parkingAmenityId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sort_order: 999 })
        .expect(200);

      // Name should be unchanged
      expect(updateResponse.body.data.name).toEqual(originalName);
      expect(updateResponse.body.data.sort_order).toBe(999);
    });
  });
});
