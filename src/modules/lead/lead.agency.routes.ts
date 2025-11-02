import { Router } from 'express';
import { LeadController } from './lead.controller.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requireAgencyMembership } from '../auth/auth.middleware.js';
import {
  getLeadByIdValidator,
  getLeadsQueryValidator,
  getLeadsByPropertyValidator,
  updateLeadValidator,
  updateLeadStatusValidator,
  assignLeadValidator,
  addNoteValidator,
  getStatisticsValidator,
  getFollowUpValidator,
} from './lead.validator.js';

const router = Router();

// All agency routes require authentication and agency membership
router.use(authenticate);
router.use(requireAgencyMembership);

/**
 * Agency Lead Routes
 * Base path: /api/v1/agency/leads
 */

/**
 * @route   GET /api/v1/agency/leads/statistics
 * @desc    Get agency lead statistics
 * @access  Private (agency members only)
 */
router.get('/statistics', validate(getStatisticsValidator), LeadController.getAgencyStatistics);

/**
 * @route   GET /api/v1/agency/leads/follow-up
 * @desc    Get agency leads requiring follow-up
 * @access  Private (agency members only)
 */
router.get('/follow-up', validate(getFollowUpValidator), LeadController.getAgentFollowUpRequired);

/**
 * @route   GET /api/v1/agency/leads
 * @desc    Get agency leads
 * @access  Private (agency members only)
 */
router.get('/', validate(getLeadsQueryValidator), LeadController.getByAgency);

/**
 * @route   GET /api/v1/agency/leads/property/:propertyId
 * @desc    Get leads by property (within agency)
 * @access  Private (agency members only)
 */
router.get(
  '/property/:propertyId',
  validate(getLeadsByPropertyValidator),
  LeadController.getByProperty
);

/**
 * @route   GET /api/v1/agency/leads/:id
 * @desc    Get lead by ID (within agency)
 * @access  Private (agency members only)
 */
router.get('/:id', validate(getLeadByIdValidator), LeadController.getById);

/**
 * @route   PATCH /api/v1/agency/leads/:id
 * @desc    Update lead (within agency)
 * @access  Private (agency members only)
 */
router.patch('/:id', validate(updateLeadValidator), LeadController.update);

/**
 * @route   PATCH /api/v1/agency/leads/:id/status
 * @desc    Update lead status (within agency)
 * @access  Private (agency members only)
 */
router.patch('/:id/status', validate(updateLeadStatusValidator), LeadController.updateStatus);

/**
 * @route   PATCH /api/v1/agency/leads/:id/assign
 * @desc    Assign lead to agent (within agency)
 * @access  Private (agency admin only)
 */
router.patch('/:id/assign', validate(assignLeadValidator), LeadController.assignLead);

/**
 * @route   POST /api/v1/agency/leads/:id/notes
 * @desc    Add note to lead (within agency)
 * @access  Private (agency members only)
 */
router.post('/:id/notes', validate(addNoteValidator), LeadController.addNote);

export default router;
