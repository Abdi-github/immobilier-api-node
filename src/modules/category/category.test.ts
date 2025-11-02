// Category tests — CRUD, permissions, translations

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
import { Category } from './category.model.js';

// Test data
const testCategories = [
  {
    section: 'residential',
    slug: 'apartment',
    name: { en: 'Apartment', fr: 'Appartement', de: 'Wohnung', it: 'Appartamento' },
    icon: 'apartment',
    sort_order: 1,
    is_active: true,
  },
  {
    section: 'residential',
    slug: 'house',
    name: { en: 'House', fr: 'Maison', de: 'Haus', it: 'Casa' },
    icon: 'house',
    sort_order: 2,
    is_active: true,
  },
  {
    section: 'commercial',
    slug: 'office',
    name: { en: 'Office', fr: 'Bureau', de: 'Büro', it: 'Ufficio' },
    icon: 'office',
    sort_order: 10,
    is_active: true,
  },
  {
    section: 'residential',
    slug: 'parking',
    name: { en: 'Parking', fr: 'Parking', de: 'Parkplatz', it: 'Parcheggio' },
    icon: 'parking',
    sort_order: 4,
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
let apartmentCategoryId: string;
let parkingCategoryId: string;

describe('Category Module', () => {
  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await UserRole.deleteMany({});
    await Category.deleteMany({});

    // Create test permissions
    const permissions = await Permission.insertMany([
      {
        name: 'Read Categories',
        code: 'categories:read',
        description: 'Read categories',
        module: 'categories',
        action: 'read',
      },
      {
        name: 'Create Categories',
        code: 'categories:create',
        description: 'Create and update categories',
        module: 'categories',
        action: 'create',
      },
      {
        name: 'Delete Categories',
        code: 'categories:delete',
        description: 'Delete categories',
        module: 'categories',
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

    // Create test categories
    const createdCategories = await Category.insertMany(testCategories);
    apartmentCategoryId = createdCategories[0]._id.toString();
    parkingCategoryId = createdCategories[3]._id.toString();
  });

  // ==================== CATEGORY PUBLIC ENDPOINT TESTS ====================
  describe('Category Public Endpoints', () => {
    describe('GET /api/v1/public/categories', () => {
      it('should return all active categories', async () => {
        const response = await request(app).get('/api/v1/public/categories').expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Categories retrieved successfully');
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(3); // Only active categories
        expect(response.body.meta).toBeDefined();
        expect(response.body.meta.total).toBe(3);
      });

      it('should include inactive categories when is_active filter is false', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?is_active=false')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].slug).toBe('parking');
      });

      it('should filter by section', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?section=residential')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(
          response.body.data.every((c: { section: string }) => c.section === 'residential')
        ).toBe(true);
      });

      it('should filter by commercial section', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?section=commercial')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].slug).toBe('office');
      });

      it('should search categories by name', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?search=Apartment')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].slug).toBe('apartment');
      });

      it('should search categories by French name', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?search=Maison')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].slug).toBe('house');
      });

      it('should paginate results', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?page=1&limit=2')
          .expect(200);

        expect(response.body.data.length).toBe(2);
        expect(response.body.meta.page).toBe(1);
        expect(response.body.meta.limit).toBe(2);
        expect(response.body.meta.totalPages).toBe(2);
        expect(response.body.meta.hasNextPage).toBe(true);
        expect(response.body.meta.hasPrevPage).toBe(false);
      });

      it('should get second page of results', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?page=2&limit=2')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.meta.page).toBe(2);
        expect(response.body.meta.hasNextPage).toBe(false);
        expect(response.body.meta.hasPrevPage).toBe(true);
      });

      it('should sort results by sort_order ascending (default)', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?sort=sort_order')
          .expect(200);

        expect(response.body.data[0].slug).toBe('apartment');
        expect(response.body.data[1].slug).toBe('house');
        expect(response.body.data[2].slug).toBe('office');
      });

      it('should sort results by sort_order descending', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories?sort=-sort_order')
          .expect(200);

        expect(response.body.data[0].slug).toBe('office');
        expect(response.body.data[1].slug).toBe('house');
        expect(response.body.data[2].slug).toBe('apartment');
      });

      it('should sort results by slug ascending', async () => {
        const response = await request(app).get('/api/v1/public/categories?sort=slug').expect(200);

        expect(response.body.data[0].slug).toBe('apartment');
        expect(response.body.data[1].slug).toBe('house');
        expect(response.body.data[2].slug).toBe('office');
      });
    });

    describe('GET /api/v1/public/categories/:id', () => {
      it('should return category by ID', async () => {
        const response = await request(app)
          .get(`/api/v1/public/categories/${apartmentCategoryId}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(apartmentCategoryId);
        expect(response.body.data.slug).toBe('apartment');
        expect(response.body.data.name).toBeDefined();
        expect(response.body.data.section).toBe('residential');
      });

      it('should return 404 for non-existent category', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/000000000000000000000000')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Category not found');
      });

      it('should return 400 for invalid ID format', async () => {
        const response = await request(app).get('/api/v1/public/categories/invalid-id').expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/public/categories/slug/:slug', () => {
      it('should return category by slug', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/slug/apartment')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.slug).toBe('apartment');
        expect(response.body.data.section).toBe('residential');
      });

      it('should return category by slug case-insensitive', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/slug/APARTMENT')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.slug).toBe('apartment');
      });

      it('should return 404 for non-existent slug', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/slug/nonexistent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Category not found');
      });
    });

    describe('GET /api/v1/public/categories/section/:section', () => {
      it('should return categories by section', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/section/residential')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(2);
        expect(
          response.body.data.every((c: { section: string }) => c.section === 'residential')
        ).toBe(true);
      });

      it('should return commercial categories', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/section/commercial')
          .expect(200);

        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].slug).toBe('office');
      });

      it('should return 400 for invalid section', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/section/invalid')
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should return empty array for section with no active categories', async () => {
        const response = await request(app)
          .get('/api/v1/public/categories/section/land')
          .expect(200);

        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data.length).toBe(0);
      });
    });
  });

  // ==================== I18N TESTS ====================
  describe('Category i18n Support', () => {
    it('should return localized name in English', async () => {
      const response = await request(app)
        .get(`/api/v1/public/categories/${apartmentCategoryId}?lang=en`)
        .expect(200);

      expect(response.body.data.name).toBe('Apartment');
    });

    it('should return localized name in French', async () => {
      const response = await request(app)
        .get(`/api/v1/public/categories/${apartmentCategoryId}?lang=fr`)
        .expect(200);

      expect(response.body.data.name).toBe('Appartement');
    });

    it('should return localized name in German', async () => {
      const response = await request(app)
        .get(`/api/v1/public/categories/${apartmentCategoryId}?lang=de`)
        .expect(200);

      expect(response.body.data.name).toBe('Wohnung');
    });

    it('should return localized name in Italian', async () => {
      const response = await request(app)
        .get(`/api/v1/public/categories/${apartmentCategoryId}?lang=it`)
        .expect(200);

      expect(response.body.data.name).toBe('Appartamento');
    });

    it('should return all language names when no lang is specified', async () => {
      const response = await request(app)
        .get(`/api/v1/public/categories/${apartmentCategoryId}`)
        .expect(200);

      expect(response.body.data.name).toEqual({
        en: 'Apartment',
        fr: 'Appartement',
        de: 'Wohnung',
        it: 'Appartamento',
      });
    });

    it('should return localized names in list endpoint', async () => {
      const response = await request(app).get('/api/v1/public/categories?lang=fr').expect(200);

      // Check that all names are French strings
      response.body.data.forEach((category: { name: string | object }) => {
        expect(typeof category.name).toBe('string');
      });
    });

    it('should return localized name by slug with language', async () => {
      const response = await request(app)
        .get('/api/v1/public/categories/slug/house?lang=de')
        .expect(200);

      expect(response.body.data.name).toBe('Haus');
    });

    it('should return localized names by section with language', async () => {
      const response = await request(app)
        .get('/api/v1/public/categories/section/commercial?lang=it')
        .expect(200);

      expect(response.body.data[0].name).toBe('Ufficio');
    });

    it('should return 400 for invalid language code on list endpoint', async () => {
      const response = await request(app).get('/api/v1/public/categories?lang=xx').expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==================== CATEGORY ADMIN ENDPOINT TESTS ====================
  describe('Category Admin Endpoints', () => {
    describe('POST /api/v1/admin/categories', () => {
      it('should create a new category with admin token', async () => {
        const newCategory = {
          section: 'residential',
          slug: 'studio',
          name: { en: 'Studio', fr: 'Studio', de: 'Studio', it: 'Studio' },
          icon: 'studio',
          sort_order: 5,
          is_active: true,
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(newCategory)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Category created successfully');
        expect(response.body.data.slug).toBe('studio');
        expect(response.body.data.section).toBe('residential');
        expect(response.body.data.id).toBeDefined();
      });

      it('should reject duplicate slug', async () => {
        const duplicateCategory = {
          section: 'residential',
          slug: 'apartment', // Already exists
          name: { en: 'Apartment 2', fr: 'Appartement 2', de: 'Wohnung 2', it: 'Appartamento 2' },
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(duplicateCategory)
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('slug already exists');
      });

      it('should reject creation without auth token', async () => {
        const newCategory = {
          section: 'residential',
          slug: 'studio',
          name: { en: 'Studio', fr: 'Studio', de: 'Studio', it: 'Studio' },
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .send(newCategory)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should reject creation without proper permission', async () => {
        const newCategory = {
          section: 'residential',
          slug: 'studio',
          name: { en: 'Studio', fr: 'Studio', de: 'Studio', it: 'Studio' },
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .set('Authorization', `Bearer ${userToken}`)
          .send(newCategory)
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should validate required fields', async () => {
        const invalidCategory = {
          // Missing section and name
          slug: 'invalid',
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCategory)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate section enum', async () => {
        const invalidCategory = {
          section: 'invalid_section',
          slug: 'test',
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCategory)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate slug format', async () => {
        const invalidCategory = {
          section: 'residential',
          slug: 'Invalid Slug With Spaces',
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCategory)
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should require all language names', async () => {
        const invalidCategory = {
          section: 'residential',
          slug: 'test',
          name: { en: 'Test', fr: 'Test' }, // Missing de and it
        };

        const response = await request(app)
          .post('/api/v1/admin/categories')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidCategory)
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PATCH /api/v1/admin/categories/:id', () => {
      it('should update category with admin token', async () => {
        const updateData = {
          name: {
            en: 'Updated Apartment',
            fr: 'Appartement mis à jour',
            de: 'Aktualisierte Wohnung',
            it: 'Appartamento aggiornato',
          },
          sort_order: 10,
        };

        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Category updated successfully');
        expect(response.body.data.name.en).toBe('Updated Apartment');
        expect(response.body.data.sort_order).toBe(10);
      });

      it('should update only specified fields', async () => {
        const updateData = {
          icon: 'new-icon',
        };

        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.data.icon).toBe('new-icon');
        expect(response.body.data.slug).toBe('apartment'); // Unchanged
        expect(response.body.data.section).toBe('residential'); // Unchanged
      });

      it('should reject update with duplicate slug', async () => {
        const updateData = {
          slug: 'house', // Already exists
        };

        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(409);

        expect(response.body.success).toBe(false);
      });

      it('should allow update with same slug (no change)', async () => {
        const updateData = {
          slug: 'apartment', // Same as current
          icon: 'updated-icon',
        };

        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should return 404 for non-existent category', async () => {
        const response = await request(app)
          .patch('/api/v1/admin/categories/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ icon: 'test' })
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should reject update without auth token', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .send({ icon: 'test' })
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should reject update without proper permission', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ icon: 'test' })
          .expect(403);

        expect(response.body.success).toBe(false);
      });

      it('should deactivate category', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ is_active: false })
          .expect(200);

        expect(response.body.data.is_active).toBe(false);
      });

      it('should change section', async () => {
        const response = await request(app)
          .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ section: 'commercial' })
          .expect(200);

        expect(response.body.data.section).toBe('commercial');
      });
    });

    describe('DELETE /api/v1/admin/categories/:id', () => {
      it('should delete category with admin token', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Category deleted successfully');

        // Verify deletion
        const verifyResponse = await request(app)
          .get(`/api/v1/public/categories/${apartmentCategoryId}`)
          .expect(404);

        expect(verifyResponse.body.success).toBe(false);
      });

      it('should return 404 for non-existent category', async () => {
        const response = await request(app)
          .delete('/api/v1/admin/categories/000000000000000000000000')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });

      it('should reject delete without auth token', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .expect(401);

        expect(response.body.success).toBe(false);
      });

      it('should reject delete without proper permission', async () => {
        const response = await request(app)
          .delete(`/api/v1/admin/categories/${apartmentCategoryId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.success).toBe(false);
      });
    });
  });

  // ==================== RBAC TESTS ====================
  describe('Category RBAC Tests', () => {
    it('should allow public read access without token', async () => {
      const response = await request(app).get('/api/v1/public/categories').expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow public read by ID without token', async () => {
      const response = await request(app)
        .get(`/api/v1/public/categories/${apartmentCategoryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow public read by slug without token', async () => {
      const response = await request(app)
        .get('/api/v1/public/categories/slug/apartment')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow public read by section without token', async () => {
      const response = await request(app)
        .get('/api/v1/public/categories/section/residential')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should require authentication for admin create', async () => {
      const response = await request(app)
        .post('/api/v1/admin/categories')
        .send({
          section: 'residential',
          slug: 'test',
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should require categories:create permission for create', async () => {
      const response = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          section: 'residential',
          slug: 'test',
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
        })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should require categories:create permission for update', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ icon: 'new' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should require categories:delete permission for delete', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/categories/${apartmentCategoryId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
    });

    it('should allow admin with categories:create to create', async () => {
      const response = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          section: 'residential',
          slug: 'test-create',
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin with categories:create to update', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ icon: 'updated' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow admin with categories:delete to delete', async () => {
      const response = await request(app)
        .delete(`/api/v1/admin/categories/${parkingCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  // ==================== EDGE CASES ====================
  describe('Category Edge Cases', () => {
    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/v1/public/categories?search=nonexistent')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
      expect(response.body.meta.total).toBe(0);
    });

    it('should handle page number exceeding total pages', async () => {
      const response = await request(app)
        .get('/api/v1/public/categories?page=100&limit=10')
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(0);
    });

    it('should reject uppercase letters in slug on create', async () => {
      const response = await request(app)
        .post('/api/v1/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          section: 'residential',
          slug: 'TEST-UPPERCASE',
          name: { en: 'Test', fr: 'Test', de: 'Test', it: 'Test' },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject uppercase letters in slug on update', async () => {
      const response = await request(app)
        .patch(`/api/v1/admin/categories/${apartmentCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ slug: 'NEW-UPPERCASE-SLUG' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle special characters in search', async () => {
      const response = await request(app)
        .get('/api/v1/public/categories')
        .query({ search: 'Büro' })
        .expect(200);

      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].slug).toBe('office');
    });

    it('should return default sort order when not specified', async () => {
      const response = await request(app).get('/api/v1/public/categories').expect(200);

      // Default sort is sort_order ascending
      expect(response.body.data[0].sort_order).toBeLessThanOrEqual(
        response.body.data[1].sort_order
      );
    });

    it('should validate maximum limit', async () => {
      const response = await request(app).get('/api/v1/public/categories?limit=200').expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate minimum page number', async () => {
      const response = await request(app).get('/api/v1/public/categories?page=0').expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
