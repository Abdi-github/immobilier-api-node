import { body, param, query } from 'express-validator';
import { PERMISSION_ACTIONS } from './permission.types.js';

/**
 * Multilingual text validation
 */
const multilingualTextValidation = (field: string, required = true) => {
  const validators = [
    body(`${field}.en`)
      .if(body(field).exists())
      .notEmpty()
      .withMessage(`${field}.en is required`)
      .isString()
      .withMessage(`${field}.en must be a string`)
      .trim(),
    body(`${field}.fr`)
      .if(body(field).exists())
      .notEmpty()
      .withMessage(`${field}.fr is required`)
      .isString()
      .withMessage(`${field}.fr must be a string`)
      .trim(),
    body(`${field}.de`)
      .if(body(field).exists())
      .notEmpty()
      .withMessage(`${field}.de is required`)
      .isString()
      .withMessage(`${field}.de must be a string`)
      .trim(),
    body(`${field}.it`)
      .if(body(field).exists())
      .notEmpty()
      .withMessage(`${field}.it is required`)
      .isString()
      .withMessage(`${field}.it must be a string`)
      .trim(),
  ];

  if (required) {
    validators.unshift(
      body(field)
        .exists()
        .withMessage(`${field} is required`)
        .isObject()
        .withMessage(`${field} must be an object`)
    );
  }

  return validators;
};

/**
 * Validators for permission operations
 */
export const permissionValidators = {
  /**
   * Validate permission query parameters
   */
  getAll: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('sort')
      .optional()
      .isIn(['name', 'resource', 'action', 'created_at', 'updated_at'])
      .withMessage('Invalid sort field'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
    query('search').optional().isString().withMessage('Search must be a string').trim(),
    query('resource')
      .optional()
      .isString()
      .withMessage('Resource must be a string')
      .trim()
      .toLowerCase(),
    query('action')
      .optional()
      .isIn(PERMISSION_ACTIONS)
      .withMessage(`Action must be one of: ${PERMISSION_ACTIONS.join(', ')}`),
    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ],

  /**
   * Validate permission ID parameter
   */
  getById: [
    param('id')
      .notEmpty()
      .withMessage('Permission ID is required')
      .isMongoId()
      .withMessage('Invalid permission ID format'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ],

  /**
   * Validate permission name parameter
   */
  getByName: [
    param('name')
      .notEmpty()
      .withMessage('Permission name is required')
      .isString()
      .withMessage('Permission name must be a string')
      .matches(/^[a-z_]+:[a-z_]+$/)
      .withMessage('Permission name must follow format: resource:action'),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ],

  /**
   * Validate resource parameter
   */
  getByResource: [
    param('resource')
      .notEmpty()
      .withMessage('Resource is required')
      .isString()
      .withMessage('Resource must be a string')
      .trim()
      .toLowerCase(),
    query('lang')
      .optional()
      .isIn(['en', 'fr', 'de', 'it'])
      .withMessage('Language must be one of: en, fr, de, it'),
  ],

  /**
   * Validate permission creation
   */
  create: [
    body('name')
      .notEmpty()
      .withMessage('Permission name is required')
      .isString()
      .withMessage('Permission name must be a string')
      .matches(/^[a-z_]+:[a-z_]+$/)
      .withMessage('Permission name must follow format: resource:action (lowercase)')
      .trim()
      .toLowerCase(),
    ...multilingualTextValidation('display_name'),
    ...multilingualTextValidation('description'),
    body('resource')
      .notEmpty()
      .withMessage('Resource is required')
      .isString()
      .withMessage('Resource must be a string')
      .isAlphanumeric('en-US', { ignore: '_' })
      .withMessage('Resource must contain only alphanumeric characters and underscores')
      .trim()
      .toLowerCase(),
    body('action')
      .notEmpty()
      .withMessage('Action is required')
      .isIn(PERMISSION_ACTIONS)
      .withMessage(`Action must be one of: ${PERMISSION_ACTIONS.join(', ')}`),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Validate permission update
   */
  update: [
    param('id')
      .notEmpty()
      .withMessage('Permission ID is required')
      .isMongoId()
      .withMessage('Invalid permission ID format'),
    body('name')
      .optional()
      .isString()
      .withMessage('Permission name must be a string')
      .matches(/^[a-z_]+:[a-z_]+$/)
      .withMessage('Permission name must follow format: resource:action (lowercase)')
      .trim()
      .toLowerCase(),
    ...multilingualTextValidation('display_name', false),
    ...multilingualTextValidation('description', false),
    body('resource')
      .optional()
      .isString()
      .withMessage('Resource must be a string')
      .isAlphanumeric('en-US', { ignore: '_' })
      .withMessage('Resource must contain only alphanumeric characters and underscores')
      .trim()
      .toLowerCase(),
    body('action')
      .optional()
      .isIn(PERMISSION_ACTIONS)
      .withMessage(`Action must be one of: ${PERMISSION_ACTIONS.join(', ')}`),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Validate permission deletion
   */
  delete: [
    param('id')
      .notEmpty()
      .withMessage('Permission ID is required')
      .isMongoId()
      .withMessage('Invalid permission ID format'),
  ],
};
