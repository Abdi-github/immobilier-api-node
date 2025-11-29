import { Router } from 'express';

import locationAdminRoutes from '../../../modules/location/location.admin.routes.js';
import categoryAdminRoutes from '../../../modules/category/category.admin.routes.js';
import amenityAdminRoutes from '../../../modules/amenity/amenity.admin.routes.js';
import { agencyAdminRouter } from '../../../modules/agency/agency.admin.routes.js';
import propertyAdminRoutes from '../../../modules/property/property.admin.routes.js';
import userAdminRoutes from '../../../modules/user/user.admin.routes.js';
import translationAdminRoutes from '../../../modules/property-translation/property-translation.admin.routes.js';
import permissionAdminRoutes from '../../../modules/admin/permission.admin.routes.js';
import roleAdminRoutes from '../../../modules/admin/role.admin.routes.js';
import searchAdminRoutes from '../../../modules/search/search.admin.routes.js';
import leadAdminRoutes from '../../../modules/lead/lead.admin.routes.js';
import { sendSuccessResponse } from '../../../shared/utils/response.helper.js';
import { authenticate, requireAdmin } from '../../../modules/auth/auth.middleware.js';

const router = Router();

/**
 * Admin routes protection
 *
 * All routes under /api/v1/admin require:
 * 1. Authentication (valid JWT token)
 * 2. Admin user type (super_admin or platform_admin)
 *
 * Non-admin users (agents, owners, agency_admins, end_users) will receive
 * a 403 Forbidden error even if authenticated.
 */
router.use(authenticate);
router.use(requireAdmin);

/**
 * @route   GET /api/v1/admin
 * @desc    Admin API root
 * @access  Admin (requires authentication and admin user type)
 */
router.get('/', (_req, res) => {
  sendSuccessResponse(res, 200, 'Welcome to Immobilier.ch Admin API', {
    version: 'v1',
    endpoints: {
      locations: '/locations',
      categories: '/categories',
      users: '/users',
      roles: '/roles',
      permissions: '/permissions',
      properties: '/properties',
      translations: '/translations',
      agencies: '/agencies',
      amenities: '/amenities',
      search: '/search',
      leads: '/leads',
    },
  });
});

// Location admin routes (create, update, delete cantons/cities)
router.use('/locations', locationAdminRoutes);

// Category admin routes (create, update, delete categories)
router.use('/categories', categoryAdminRoutes);

// Amenity admin routes (create, update, delete amenities)
router.use('/amenities', amenityAdminRoutes);

// Agency admin routes (create, update, delete agencies)
router.use('/agencies', agencyAdminRouter);

// Property admin routes (create, update, delete, approve, reject, publish, archive)
router.use('/properties', propertyAdminRoutes);

// User admin routes (CRUD, status management)
router.use('/users', userAdminRoutes);

// Translation admin routes (CRUD, approve, reject, bulk translate)
router.use('/translations', translationAdminRoutes);

// Permission admin routes (CRUD permissions)
router.use('/permissions', permissionAdminRoutes);

// Role admin routes (CRUD roles, assign/revoke permissions)
router.use('/roles', roleAdminRoutes);

// Search admin routes (cache invalidation)
router.use('/search', searchAdminRoutes);

// Lead admin routes (CRUD, statistics, follow-up)
router.use('/leads', leadAdminRoutes);

export default router;
