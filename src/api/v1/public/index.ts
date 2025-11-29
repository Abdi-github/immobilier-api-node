import { Router } from 'express';

import authRoutes from '../../../modules/auth/auth.routes.js';
import cantonRoutes from '../../../modules/location/canton.routes.js';
import cityRoutes from '../../../modules/location/city.routes.js';
import categoryRoutes from '../../../modules/category/category.routes.js';
import amenityRoutes from '../../../modules/amenity/amenity.routes.js';
import { agencyRouter } from '../../../modules/agency/agency.routes.js';
import propertyRoutes from '../../../modules/property/property.routes.js';
import propertyTranslationRoutes from '../../../modules/property-translation/property-translation.routes.js';
import userRoutes from '../../../modules/user/user.routes.js';
import searchRoutes from '../../../modules/search/search.routes.js';
import leadRoutes from '../../../modules/lead/lead.routes.js';
import { sendSuccessResponse } from '../../../shared/utils/response.helper.js';

const router = Router();

/**
 * @route   GET /api/v1/public
 * @desc    Public API root
 * @access  Public
 */
router.get('/', (_req, res) => {
  sendSuccessResponse(res, 200, 'Welcome to Immobilier.ch Public API', {
    version: 'v1',
    endpoints: {
      auth: '/auth',
      locations: '/locations',
      categories: '/categories',
      amenities: '/amenities',
      properties: '/properties',
      agencies: '/agencies',
      users: '/users',
      search: '/search',
      leads: '/leads',
    },
  });
});

// Auth routes
router.use('/auth', authRoutes);

// Location routes (grouped under /locations)
router.use('/locations/cantons', cantonRoutes);
router.use('/locations/cities', cityRoutes);

// Category routes
router.use('/categories', categoryRoutes);

// Amenity routes
router.use('/amenities', amenityRoutes);

// Agency routes
router.use('/agencies', agencyRouter);

// Property routes
router.use('/properties', propertyRoutes);

// User routes (profile, favorites, alerts - requires authentication)
router.use('/users', userRoutes);

// Property translation routes (public - approved translations only)
router.use('/', propertyTranslationRoutes);

// Search routes (property search, location search, suggestions)
router.use('/search', searchRoutes);

// Lead routes (public contact form, authenticated inquiries)
router.use('/leads', leadRoutes);

export default router;
