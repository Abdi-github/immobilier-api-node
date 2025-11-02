import { Router } from 'express';
import { LeadController } from './lead.controller.js';
import { validate } from '../../shared/middlewares/validation.middleware.js';
import { authenticate, requirePermission } from '../auth/auth.middleware.js';
import {
  getLeadByIdValidator,
  getLeadsQueryValidator,
  getLeadsByPropertyValidator,
  updateLeadValidator,
  updateLeadStatusValidator,
  assignLeadValidator,
  addNoteValidator,
  deleteLeadValidator,
  getStatisticsValidator,
  getFollowUpValidator,
} from './lead.validator.js';

const router = Router();

// All admin routes require authentication
router.use(authenticate);

/**
 * Admin Lead Routes
 * Base path: /api/v1/admin/leads
 */

/**
 * @route   GET /api/v1/admin/leads/statistics
 * @desc    Get lead statistics (admin overview)
 * @access  Private (leads:read permission)
 */
router.get(
  '/statistics',
  requirePermission('leads:read'),
  validate(getStatisticsValidator),
  LeadController.getStatistics
);

/**
 * @route   GET /api/v1/admin/leads/follow-up
 * @desc    Get leads requiring follow-up
 * @access  Private (leads:read permission)
 */
router.get(
  '/follow-up',
  requirePermission('leads:read'),
  validate(getFollowUpValidator),
  LeadController.getFollowUpRequired
);

/**
 * @route   GET /api/v1/admin/leads
 * @desc    Get all leads with filters (admin view)
 * @access  Private (leads:read permission)
 */
router.get(
  '/',
  requirePermission('leads:read'),
  validate(getLeadsQueryValidator),
  LeadController.getAll
);

/**
 * @route   GET /api/v1/admin/leads/property/:propertyId
 * @desc    Get leads by property
 * @access  Private (leads:read permission)
 */
router.get(
  '/property/:propertyId',
  requirePermission('leads:read'),
  validate(getLeadsByPropertyValidator),
  LeadController.getByProperty
);

/**
 * @route   GET /api/v1/admin/leads/:id
 * @desc    Get lead by ID
 * @access  Private (leads:read permission)
 */
router.get(
  '/:id',
  requirePermission('leads:read'),
  validate(getLeadByIdValidator),
  LeadController.getById
);

/**
 * @route   PATCH /api/v1/admin/leads/:id
 * @desc    Update lead
 * @access  Private (leads:update permission)
 */
router.patch(
  '/:id',
  requirePermission('leads:update'),
  validate(updateLeadValidator),
  LeadController.update
);

/**
 * @route   PATCH /api/v1/admin/leads/:id/status
 * @desc    Update lead status
 * @access  Private (leads:update permission)
 */
router.patch(
  '/:id/status',
  requirePermission('leads:update'),
  validate(updateLeadStatusValidator),
  LeadController.updateStatus
);

/**
 * @route   PATCH /api/v1/admin/leads/:id/assign
 * @desc    Assign lead to user
 * @access  Private (leads:update permission)
 */
router.patch(
  '/:id/assign',
  requirePermission('leads:update'),
  validate(assignLeadValidator),
  LeadController.assignLead
);

/**
 * @route   POST /api/v1/admin/leads/:id/notes
 * @desc    Add note to lead
 * @access  Private (leads:update permission)
 */
router.post(
  '/:id/notes',
  requirePermission('leads:update'),
  validate(addNoteValidator),
  LeadController.addNote
);

/**
 * @route   DELETE /api/v1/admin/leads/:id
 * @desc    Delete lead
 * @access  Private (leads:delete permission)
 */
router.delete(
  '/:id',
  requirePermission('leads:delete'),
  validate(deleteLeadValidator),
  LeadController.delete
);

export default router;
