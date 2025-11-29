import { Router } from 'express';
import { authenticate, requireAgencyMembership } from '../../../modules/auth/auth.middleware.js';
import leadAgencyRoutes from '../../../modules/lead/lead.agency.routes.js';
import { sendSuccessResponse } from '../../../shared/utils/response.helper.js';

const router = Router();

// All agency routes require authentication and agency membership
router.use(authenticate);
router.use(requireAgencyMembership);

/**
 * @route   GET /api/v1/agency
 * @desc    Agency API root
 * @access  Private (agency members only)
 */
router.get('/', (_req, res) => {
  sendSuccessResponse(res, 200, 'Welcome to Immobilier.ch Agency API', {
    version: 'v1',
    endpoints: {
      leads: '/leads',
    },
  });
});

// Lead agency routes (agency lead management)
router.use('/leads', leadAgencyRoutes);

export default router;
