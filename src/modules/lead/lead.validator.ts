import { body, param, query } from 'express-validator';
import { LEAD_STATUS, LEAD_SOURCE, LEAD_INQUIRY_TYPE, LEAD_PRIORITY } from './lead.types.js';

/**
 * Lead Validators
 * Validation rules for lead endpoints
 */

// Sort options
const SORT_OPTIONS = [
  'created_at_asc',
  'created_at_desc',
  'updated_at_asc',
  'updated_at_desc',
  'priority_asc',
  'priority_desc',
  'status_asc',
  'status_desc',
];

const CONTACT_METHODS = ['email', 'phone', 'both'];

/**
 * Create public lead validation
 */
export const createPublicLeadValidator = [
  body('property_id')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid property ID format'),

  body('contact_name')
    .notEmpty()
    .withMessage('Contact name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be between 2 and 100 characters')
    .trim(),

  body('contact_email')
    .notEmpty()
    .withMessage('Contact email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('contact_phone')
    .optional()
    .matches(/^[+]?[0-9\s-]{7,20}$/)
    .withMessage('Invalid phone number format'),

  body('message')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Message must be less than 2000 characters')
    .trim(),

  body('inquiry_type')
    .optional()
    .isIn(LEAD_INQUIRY_TYPE)
    .withMessage(`Inquiry type must be one of: ${LEAD_INQUIRY_TYPE.join(', ')}`),

  body('source')
    .optional()
    .isIn(LEAD_SOURCE)
    .withMessage(`Source must be one of: ${LEAD_SOURCE.join(', ')}`),

  body('preferred_contact_method')
    .optional()
    .isIn(CONTACT_METHODS)
    .withMessage(`Preferred contact method must be one of: ${CONTACT_METHODS.join(', ')}`),

  body('preferred_contact_time')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Preferred contact time must be less than 100 characters')
    .trim(),
];

/**
 * Create authenticated lead validation
 */
export const createAuthenticatedLeadValidator = [
  body('property_id')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid property ID format'),

  body('contact_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be between 2 and 100 characters')
    .trim(),

  body('contact_email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),

  body('contact_phone')
    .optional()
    .matches(/^[+]?[0-9\s-]{7,20}$/)
    .withMessage('Invalid phone number format'),

  body('message')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Message must be less than 2000 characters')
    .trim(),

  body('inquiry_type')
    .optional()
    .isIn(LEAD_INQUIRY_TYPE)
    .withMessage(`Inquiry type must be one of: ${LEAD_INQUIRY_TYPE.join(', ')}`),

  body('source')
    .optional()
    .isIn(LEAD_SOURCE)
    .withMessage(`Source must be one of: ${LEAD_SOURCE.join(', ')}`),

  body('preferred_contact_method')
    .optional()
    .isIn(CONTACT_METHODS)
    .withMessage(`Preferred contact method must be one of: ${CONTACT_METHODS.join(', ')}`),

  body('preferred_contact_time')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Preferred contact time must be less than 100 characters')
    .trim(),
];

/**
 * Get lead by ID validation
 */
export const getLeadByIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID format'),
];

/**
 * Get leads query validation
 */
export const getLeadsQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sort')
    .optional()
    .isIn(SORT_OPTIONS)
    .withMessage(`Sort must be one of: ${SORT_OPTIONS.join(', ')}`),

  query('property_id').optional().isMongoId().withMessage('Invalid property ID format'),

  query('agency_id').optional().isMongoId().withMessage('Invalid agency ID format'),

  query('assigned_to').optional().isMongoId().withMessage('Invalid assigned to user ID format'),

  query('status')
    .optional()
    .isIn(LEAD_STATUS)
    .withMessage(`Status must be one of: ${LEAD_STATUS.join(', ')}`),

  query('priority')
    .optional()
    .isIn(LEAD_PRIORITY)
    .withMessage(`Priority must be one of: ${LEAD_PRIORITY.join(', ')}`),

  query('inquiry_type')
    .optional()
    .isIn(LEAD_INQUIRY_TYPE)
    .withMessage(`Inquiry type must be one of: ${LEAD_INQUIRY_TYPE.join(', ')}`),

  query('source')
    .optional()
    .isIn(LEAD_SOURCE)
    .withMessage(`Source must be one of: ${LEAD_SOURCE.join(', ')}`),

  query('date_from').optional().isISO8601().withMessage('Date from must be a valid ISO 8601 date'),

  query('date_to').optional().isISO8601().withMessage('Date to must be a valid ISO 8601 date'),
];

/**
 * Get leads by property validation
 */
export const getLeadsByPropertyValidator = [
  param('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid property ID format'),

  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Update lead validation
 */
export const updateLeadValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID format'),

  body('status')
    .optional()
    .isIn(LEAD_STATUS)
    .withMessage(`Status must be one of: ${LEAD_STATUS.join(', ')}`),

  body('priority')
    .optional()
    .isIn(LEAD_PRIORITY)
    .withMessage(`Priority must be one of: ${LEAD_PRIORITY.join(', ')}`),

  body('assigned_to').optional().isMongoId().withMessage('Invalid assigned to user ID format'),

  body('follow_up_date')
    .optional()
    .isISO8601()
    .withMessage('Follow up date must be a valid ISO 8601 date'),

  body('contact_name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Contact name must be between 2 and 100 characters')
    .trim(),

  body('contact_phone')
    .optional()
    .matches(/^[+]?[0-9\s-]{7,20}$/)
    .withMessage('Invalid phone number format'),
];

/**
 * Update lead status validation
 */
export const updateLeadStatusValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID format'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(LEAD_STATUS)
    .withMessage(`Status must be one of: ${LEAD_STATUS.join(', ')}`),
];

/**
 * Assign lead validation
 */
export const assignLeadValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID format'),

  body('assigned_to')
    .notEmpty()
    .withMessage('Assigned to user ID is required')
    .isMongoId()
    .withMessage('Invalid user ID format'),
];

/**
 * Add note validation
 */
export const addNoteValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID format'),

  body('content')
    .notEmpty()
    .withMessage('Note content is required')
    .isLength({ min: 1, max: 2000 })
    .withMessage('Note content must be between 1 and 2000 characters')
    .trim(),

  body('is_internal').optional().isBoolean().withMessage('is_internal must be a boolean'),
];

/**
 * Delete lead validation
 */
export const deleteLeadValidator = [
  param('id')
    .notEmpty()
    .withMessage('Lead ID is required')
    .isMongoId()
    .withMessage('Invalid lead ID format'),
];

/**
 * Get statistics validation
 */
export const getStatisticsValidator = [
  query('agency_id').optional().isMongoId().withMessage('Invalid agency ID format'),

  query('date_from').optional().isISO8601().withMessage('Date from must be a valid ISO 8601 date'),

  query('date_to').optional().isISO8601().withMessage('Date to must be a valid ISO 8601 date'),
];

/**
 * Get follow-up required validation
 */
export const getFollowUpValidator = [
  query('agency_id').optional().isMongoId().withMessage('Invalid agency ID format'),

  query('assigned_to').optional().isMongoId().withMessage('Invalid assigned to user ID format'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

/**
 * Get user leads validation (pagination only)
 */
export const getUserLeadsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
];

export default {
  createPublicLeadValidator,
  createAuthenticatedLeadValidator,
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
  getUserLeadsValidator,
};
