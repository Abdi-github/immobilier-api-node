/**
 * Test Helpers
 *
 * Common utilities and factory functions for testing
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { User, IUser } from '../modules/user/user.model.js';
import { Role, IRole } from '../modules/admin/role.model.js';
import { Permission, IPermission } from '../modules/admin/permission.model.js';
import { UserRole } from '../modules/admin/user-role.model.js';
import { config } from '../config/index.js';

/**
 * User factory for creating test users
 */
export const createTestUser = async (overrides: Partial<IUser> = {}): Promise<IUser> => {
  const defaultUser = {
    email: `test-${Date.now()}@example.com`,
    password_hash: await bcrypt.hash('TestPassword123!', 10),
    first_name: 'Test',
    last_name: 'User',
    phone: '+41791234567',
    preferred_language: 'en' as const,
    is_active: true,
    ...overrides,
  };

  return User.create(defaultUser);
};

/**
 * Create test user with a specific role
 */
export const createTestUserWithRole = async (
  roleName: string,
  userOverrides: Partial<IUser> = {}
): Promise<{ user: IUser; token: string }> => {
  const user = await createTestUser(userOverrides);

  // Find or create role
  let role = await Role.findOne({ name: roleName });
  if (!role) {
    role = await Role.create({
      name: roleName,
      description: `${roleName} role`,
      permissions: [],
      is_active: true,
    });
  }

  // Assign role
  await UserRole.create({
    user_id: user._id,
    role_id: role._id,
    assigned_by: user._id,
  });

  // Generate token
  const token = generateTestToken(user, [roleName], []);

  return { user, token };
};

/**
 * Generate a JWT token for testing
 */
export const generateTestToken = (
  user: IUser,
  roles: string[] = [],
  permissions: string[] = []
): string => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      roles,
      permissions,
      lang: user.preferred_language,
    },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

/**
 * Generate an expired token for testing
 */
export const generateExpiredToken = (userId: string): string => {
  return jwt.sign({ sub: userId, type: 'access' }, config.jwt.secret, { expiresIn: -1 });
};

/**
 * Create test permissions
 */
export const createTestPermissions = async (
  permissions: Array<{ name: string; action: string; resource: string }>
): Promise<IPermission[]> => {
  const docs = await Permission.insertMany(
    permissions.map((p) => ({
      name: p.name,
      display_name: {
        en: `${p.action} ${p.resource}`,
        fr: `${p.action} ${p.resource}`,
        de: `${p.action} ${p.resource}`,
        it: `${p.action} ${p.resource}`,
      },
      description: {
        en: `Permission for ${p.action} on ${p.resource}`,
        fr: `Permission pour ${p.action} sur ${p.resource}`,
        de: `Berechtigung für ${p.action} auf ${p.resource}`,
        it: `Permesso per ${p.action} su ${p.resource}`,
      },
      action: p.action,
      resource: p.resource,
    }))
  );
  return docs as unknown as IPermission[];
};

/**
 * Create test role with permissions
 */
export const createTestRole = async (
  name: string,
  permissionIds: mongoose.Types.ObjectId[]
): Promise<IRole> => {
  return Role.create({
    name,
    description: `${name} test role`,
    permissions: permissionIds,
    is_active: true,
  });
};

/**
 * Clean up all test data
 */
export const cleanupTestData = async (): Promise<void> => {
  await User.deleteMany({});
  await Role.deleteMany({});
  await Permission.deleteMany({});
  await UserRole.deleteMany({});
};

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Generate random email
 */
export const randomEmail = (): string => {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
};

/**
 * Assert response structure
 */
export const assertSuccessResponse = (body: unknown): void => {
  const response = body as { success: boolean; message?: string; data?: unknown };
  expect(response.success).toBe(true);
  expect(response.message).toBeDefined();
};

export const assertErrorResponse = (body: unknown, _statusCode?: number): void => {
  const response = body as { success: boolean; error: { message: string; code?: number } };
  expect(response.success).toBe(false);
  expect(response.error).toBeDefined();
  expect(response.error.message).toBeDefined();
};
