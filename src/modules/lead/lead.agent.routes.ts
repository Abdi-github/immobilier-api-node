import { Router } from 'express';
import { LeadController } from './lead.controller.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate } from '../auth/auth.middleware.js';
import {
  getLeadByIdValidator,
  getLeadsQueryValidator,
  getFollowUpValidator,
} from './lead.validator.js';

const router = Router();

// All agent routes require authentication
router.use(authenticate);

/**
 * Agent Lead Routes
 * Base path: /api/v1/agent/leads
 */

/**
 * @route   GET /api/v1/agent/leads/follow-up
 * @desc    Get agent's leads requiring follow-up
 * @access  Private (authenticated agents)
 */
router.get('/follow-up', validate(getFollowUpValidator), LeadController.getAgentFollowUpRequired);

/**
 * @route   GET /api/v1/agent/leads
 * @desc    Get leads assigned to agent
 * @access  Private (authenticated agents)
 */
router.get('/', validate(getLeadsQueryValidator), LeadController.getAssignedLeads);

/**
 * @route   GET /api/v1/agent/leads/:id
 * @desc    Get lead by ID (if assigned)
 * @access  Private (authenticated agents)
 */
router.get('/:id', validate(getLeadByIdValidator), LeadController.getById);

export default router;
