import { Router } from 'express';

import { searchController } from './search.controller.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';

const router = Router();

/**
 * @route   POST /api/v1/admin/search/cache/invalidate
 * @desc    Invalidate search cache
 * @access  Admin (requires admin:manage permission)
 */
router.post(
  '/cache/invalidate',
  authenticate,
  requirePermission('admin:manage'),
  searchController.invalidateCache
);

export default router;
