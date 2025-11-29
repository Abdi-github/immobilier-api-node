import { Router } from 'express';
import { authenticate } from '../../../modules/auth/auth.middleware.js';
import leadAgentRoutes from '../../../modules/lead/lead.agent.routes.js';
import propertyAgentRoutes from '../../../modules/property/property.agent.routes.js';
import { sendSuccessResponse } from '../../../shared/utils/response.helper.js';

const router = Router();

// All agent routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/agent
 * @desc    Agent API root
 * @access  Private (agents only)
 */
router.get('/', (_req, res) => {
  sendSuccessResponse(res, 200, 'Welcome to Immobilier.ch Agent API', {
    version: 'v1',
    endpoints: {
      properties: '/properties',
      leads: '/leads',
    },
  });
});

// Property agent routes (CRUD + images for own properties)
router.use('/properties', propertyAgentRoutes);

// Lead agent routes (agent's assigned leads)
router.use('/leads', leadAgentRoutes);

export default router;
