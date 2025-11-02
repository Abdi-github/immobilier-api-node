import { Router } from 'express';
import { LeadController } from './lead.controller.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, optionalAuth } from '../auth/auth.middleware.js';
import {
  createPublicLeadValidator,
  createAuthenticatedLeadValidator,
  getUserLeadsValidator,
} from './lead.validator.js';

const router = Router();

/**
 * Public Lead Routes
 * Base path: /api/v1/leads
 */

/**
 * @route   POST /api/v1/leads
 * @desc    Create lead from public contact form (unauthenticated)
 * @access  Public
 */
router.post('/', validate(createPublicLeadValidator), LeadController.createPublicLead);

/**
 * @route   POST /api/v1/leads/authenticated
 * @desc    Create lead from authenticated user
 * @access  Private (any authenticated user)
 */
router.post(
  '/authenticated',
  authenticate,
  validate(createAuthenticatedLeadValidator),
  LeadController.createAuthenticatedLead
);

/**
 * @route   GET /api/v1/leads/my-inquiries
 * @desc    Get user's own leads (customer view)
 * @access  Private (any authenticated user)
 */
router.get(
  '/my-inquiries',
  authenticate,
  validate(getUserLeadsValidator),
  LeadController.getUserLeads
);

export default router;
