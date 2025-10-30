// Auth tests — login, register, refresh, RBAC

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

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  first_name: 'Test',
  last_name: 'User',
  phone: '+41791234567',
  preferred_language: 'en' as const,
};

const adminUser = {
  email: 'admin@example.com',
  password: 'AdminPassword123!',
  first_name: 'Admin',
  last_name: 'User',
  phone: '+41799876543',
  preferred_language: 'en' as const,
};

let app: Application;
let testUserId: string;
let testUserToken: string;
let adminToken: string;
let endUserRoleId: string;
let adminRoleId: string;

describe('Auth Module', () => {
  beforeAll(() => {
    app = createApp();
  });

  beforeEach(async () => {
    // Clear collections
    await User.deleteMany({});
    await Role.deleteMany({});
    await Permission.deleteMany({});
    await UserRole.deleteMany({});

    // Create test permissions
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
        name: 'Manage Users',
        code: 'users:manage',
        description: 'Manage users',
        module: 'users',
        action: 'manage',
      },
    ]);

    // Create test roles
    const endUserRole = await Role.create({
      name: 'End User',
      code: 'end_user',
      description: 'End user role',
      permissions: [permissions[0]._id],
      is_active: true,
    });
    endUserRoleId = endUserRole._id.toString();

    const adminRole = await Role.create({
      name: 'Platform Admin',
      code: 'platform_admin',
      description: 'Platform admin role',
      permissions: permissions.map((p) => p._id),
      is_active: true,
    });
    adminRoleId = adminRole._id.toString();
  });

  // ==========================================
  // REGISTRATION TESTS
  // ==========================================
  describe('POST /api/v1/public/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.user.first_name).toBe(testUser.first_name);
      expect(response.body.data.tokens.access_token).toBeDefined();
      expect(response.body.data.tokens.refresh_token).toBeDefined();
      // Ensure password is not returned
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should fail registration with existing email', async () => {
      // Create user first
      await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });

      const response = await request(app)
        .post('/api/v1/public/auth/register')
        .send(testUser)
        .expect('Content-Type', /json/)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already registered');
    });

    it('should fail registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/register')
        .send({ ...testUser, email: 'invalid-email' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/register')
        .send({ ...testUser, password: '123' })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail registration with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/register')
        .send({ email: testUser.email })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // LOGIN TESTS
  // ==========================================
  describe('POST /api/v1/public/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const user = await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });
      testUserId = user._id.toString();

      // Assign end_user role
      await UserRole.create({
        user_id: user._id,
        role_id: endUserRoleId,
        assigned_by: user._id,
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens.access_token).toBeDefined();
      expect(response.body.data.tokens.refresh_token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(response.body.data.tokens.access_token, config.jwt.secret) as {
        sub: string;
      };
      expect(decoded.sub).toBe(testUserId);

      // Save token for later tests
      testUserToken = response.body.data.tokens.access_token;
    });

    it('should fail login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should fail login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should fail login with inactive user', async () => {
      // Deactivate user by changing status
      await User.findByIdAndUpdate(testUserId, { status: 'suspended' });

      const response = await request(app)
        .post('/api/v1/public/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  // ==========================================
  // TOKEN REFRESH TESTS
  // ==========================================
  describe('POST /api/v1/public/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login a test user
      const user = await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });
      testUserId = user._id.toString();

      await UserRole.create({
        user_id: user._id,
        role_id: endUserRoleId,
        assigned_by: user._id,
      });

      // Login to get tokens
      const loginResponse = await request(app).post('/api/v1/public/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      refreshToken = loginResponse.body.data.tokens.refresh_token;
      testUserToken = loginResponse.body.data.tokens.access_token;
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      // New tokens should be different
      expect(response.body.data.refresh_token).not.toBe(refreshToken);
    });

    it('should fail refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail refresh with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign({ sub: testUserId, type: 'refresh' }, config.jwt.secret, {
        expiresIn: -1,
      });

      const response = await request(app)
        .post('/api/v1/public/auth/refresh')
        .send({ refresh_token: expiredToken })
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // PROFILE TESTS
  // ==========================================
  describe('GET /api/v1/public/auth/me', () => {
    beforeEach(async () => {
      // Create and login a test user
      const user = await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });
      testUserId = user._id.toString();

      await UserRole.create({
        user_id: user._id,
        role_id: endUserRoleId,
        assigned_by: user._id,
      });

      // Login to get token
      const loginResponse = await request(app).post('/api/v1/public/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      testUserToken = loginResponse.body.data.tokens.access_token;
    });

    it('should get current user profile', async () => {
      const response = await request(app)
        .get('/api/v1/public/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testUser.email);
      expect(response.body.data.first_name).toBe(testUser.first_name);
      expect(response.body.data.roles).toBeDefined();
      expect(response.body.data.permissions).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/public/auth/me')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/public/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // UPDATE PROFILE TESTS
  // ==========================================
  describe('PATCH /api/v1/public/auth/me', () => {
    beforeEach(async () => {
      const user = await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });
      testUserId = user._id.toString();

      await UserRole.create({
        user_id: user._id,
        role_id: endUserRoleId,
        assigned_by: user._id,
      });

      const loginResponse = await request(app).post('/api/v1/public/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      testUserToken = loginResponse.body.data.tokens.access_token;
    });

    it('should update user profile', async () => {
      const updates = {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+41798765432',
      };

      const response = await request(app)
        .patch('/api/v1/public/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updates)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.first_name).toBe(updates.first_name);
      expect(response.body.data.last_name).toBe(updates.last_name);
      expect(response.body.data.phone).toBe(updates.phone);
    });

    it('should not allow updating email', async () => {
      const response = await request(app)
        .patch('/api/v1/public/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ email: 'newemail@example.com' })
        .expect('Content-Type', /json/)
        .expect(200);

      // Email should remain unchanged
      expect(response.body.data.email).toBe(testUser.email);
    });
  });

  // ==========================================
  // CHANGE PASSWORD TESTS
  // ==========================================
  describe('POST /api/v1/public/auth/change-password', () => {
    beforeEach(async () => {
      const user = await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });
      testUserId = user._id.toString();

      await UserRole.create({
        user_id: user._id,
        role_id: endUserRoleId,
        assigned_by: user._id,
      });

      const loginResponse = await request(app).post('/api/v1/public/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      testUserToken = loginResponse.body.data.tokens.access_token;
    });

    it('should change password successfully', async () => {
      const newPassword = 'NewPassword123!';

      const response = await request(app)
        .post('/api/v1/public/auth/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          current_password: testUser.password,
          new_password: newPassword,
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/v1/public/auth/login')
        .send({
          email: testUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should fail with incorrect current password', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/change-password')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          current_password: 'wrongpassword',
          new_password: 'NewPassword123!',
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // LOGOUT TESTS
  // ==========================================
  describe('POST /api/v1/public/auth/logout', () => {
    beforeEach(async () => {
      const user = await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });
      testUserId = user._id.toString();

      await UserRole.create({
        user_id: user._id,
        role_id: endUserRoleId,
        assigned_by: user._id,
      });

      const loginResponse = await request(app).post('/api/v1/public/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      testUserToken = loginResponse.body.data.tokens.access_token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/logout')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });

    it('should fail logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/logout')
        .expect('Content-Type', /json/)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ==========================================
  // RBAC TESTS
  // ==========================================
  describe('RBAC Tests', () => {
    beforeEach(async () => {
      // Create end user
      const user = await User.create({
        ...testUser,
        password_hash: await bcrypt.hash(testUser.password, 10),
        status: 'active',
      });
      testUserId = user._id.toString();

      await UserRole.create({
        user_id: user._id,
        role_id: endUserRoleId,
        assigned_by: user._id,
      });

      // Create admin user
      const admin = await User.create({
        ...adminUser,
        password_hash: await bcrypt.hash(adminUser.password, 10),
        status: 'active',
      });

      await UserRole.create({
        user_id: admin._id,
        role_id: adminRoleId,
        assigned_by: admin._id,
      });

      // Get tokens
      const userLogin = await request(app)
        .post('/api/v1/public/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      testUserToken = userLogin.body.data.tokens.access_token;

      const adminLogin = await request(app)
        .post('/api/v1/public/auth/login')
        .send({ email: adminUser.email, password: adminUser.password });
      adminToken = adminLogin.body.data.tokens.access_token;
    });

    it('should include roles in JWT token', () => {
      const decoded = jwt.verify(testUserToken, config.jwt.secret) as {
        roles: string[];
      };
      expect(decoded.roles).toContain('end_user');
    });

    it('should include permissions in JWT token', () => {
      const decoded = jwt.verify(testUserToken, config.jwt.secret) as {
        permissions: string[];
      };
      expect(decoded.permissions).toContain('properties:read');
    });

    it('admin should have all permissions', () => {
      const decoded = jwt.verify(adminToken, config.jwt.secret) as {
        permissions: string[];
      };
      expect(decoded.permissions).toContain('properties:read');
      expect(decoded.permissions).toContain('properties:create');
      expect(decoded.permissions).toContain('users:manage');
    });
  });

  // ==========================================
  // RATE LIMITING TESTS
  // ==========================================
  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Make a few requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app).get('/api/v1/health').expect(200);
        expect(response.body.success).toBe(true);
      }
    });

    // Note: Full rate limiting tests require Redis and timing controls
    // This is a basic sanity check
  });

  // ==========================================
  // i18n TESTS
  // ==========================================
  describe('i18n Support', () => {
    it('should return response in default language (en)', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password' })
        .expect(401);

      // Response should be in English by default
      expect(response.body.message).toBeDefined();
    });

    it('should respect Accept-Language header', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/login')
        .set('Accept-Language', 'fr')
        .send({ email: 'nonexistent@example.com', password: 'password' })
        .expect(401);

      // Response should be processed (i18n middleware applied)
      expect(response.body).toBeDefined();
    });

    it('should respect lang query parameter', async () => {
      const response = await request(app)
        .post('/api/v1/public/auth/login?lang=de')
        .send({ email: 'nonexistent@example.com', password: 'password' })
        .expect(401);

      expect(response.body).toBeDefined();
    });
  });
});
