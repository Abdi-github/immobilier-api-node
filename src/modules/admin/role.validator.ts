import { body, param, query } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Helper for multilingual text validation
 */
const multilingualTextValidation = (field: string, required = true) => {
  const validators = [
    body(`${field}.en`)
      .if(body(field).exists())
      .trim()
      .notEmpty()
      .withMessage(`${field}.en is required`)
      .isLength({ max: 500 })
      .withMessage(`${field}.en must be at most 500 characters`),
    body(`${field}.fr`)
      .if(body(field).exists())
      .trim()
      .notEmpty()
      .withMessage(`${field}.fr is required`)
      .isLength({ max: 500 })
      .withMessage(`${field}.fr must be at most 500 characters`),
    body(`${field}.de`)
      .if(body(field).exists())
      .trim()
      .notEmpty()
      .withMessage(`${field}.de is required`)
      .isLength({ max: 500 })
      .withMessage(`${field}.de must be at most 500 characters`),
    body(`${field}.it`)
      .if(body(field).exists())
      .trim()
      .notEmpty()
      .withMessage(`${field}.it is required`)
      .isLength({ max: 500 })
      .withMessage(`${field}.it must be at most 500 characters`),
  ];

  if (required) {
    validators.unshift(
      body(field)
        .exists()
        .withMessage(`${field} is required`)
        .isObject()
        .withMessage(`${field} must be an object`)
    );
  } else {
    validators.unshift(body(field).optional().isObject().withMessage(`${field} must be an object`));
  }

  return validators;
};

/**
 * Role validators
 */
export const roleValidators = {
  /**
   * Get all roles validation
   */
  getAll: [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sort')
      .optional()
      .isIn(['name', 'created_at', 'updated_at'])
      .withMessage('Sort must be one of: name, created_at, updated_at'),
    query('order').optional().isIn(['asc', 'desc']).withMessage('Order must be either asc or desc'),
    query('search')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Search must be at most 100 characters'),
    query('is_system')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_system must be true or false'),
    query('is_active')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('is_active must be true or false'),
    query('include_permissions')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('include_permissions must be true or false'),
  ],

  /**
   * Get role by ID validation
   */
  getById: [
    param('id')
      .notEmpty()
      .withMessage('Role ID is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid role ID format'),
    query('include_permissions')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('include_permissions must be true or false'),
  ],

  /**
   * Get role by name validation
   */
  getByName: [
    param('name')
      .notEmpty()
      .withMessage('Role name is required')
      .isString()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Role name must be between 2 and 50 characters'),
    query('include_permissions')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('include_permissions must be true or false'),
  ],

  /**
   * Create role validation
   */
  create: [
    body('name')
      .notEmpty()
      .withMessage('Role name is required')
      .isString()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Role name must be between 2 and 50 characters')
      .matches(/^[a-z][a-z0-9_]*$/)
      .withMessage(
        'Role name must start with a letter and contain only lowercase letters, numbers, and underscores'
      ),
    ...multilingualTextValidation('display_name', true),
    ...multilingualTextValidation('description', true),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('permissions.*')
      .optional()
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid permission ID format'),
    body('is_system').optional().isBoolean().withMessage('is_system must be a boolean'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Update role validation
   */
  update: [
    param('id')
      .notEmpty()
      .withMessage('Role ID is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid role ID format'),
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Role name must be between 2 and 50 characters')
      .matches(/^[a-z][a-z0-9_]*$/)
      .withMessage(
        'Role name must start with a letter and contain only lowercase letters, numbers, and underscores'
      ),
    ...multilingualTextValidation('display_name', false),
    ...multilingualTextValidation('description', false),
    body('permissions').optional().isArray().withMessage('Permissions must be an array'),
    body('permissions.*')
      .optional()
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid permission ID format'),
    body('is_system').optional().isBoolean().withMessage('is_system must be a boolean'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],

  /**
   * Delete role validation
   */
  delete: [
    param('id')
      .notEmpty()
      .withMessage('Role ID is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid role ID format'),
  ],

  /**
   * Assign/revoke permissions validation
   */
  assignPermissions: [
    param('id')
      .notEmpty()
      .withMessage('Role ID is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid role ID format'),
    body('permissions').isArray({ min: 1 }).withMessage('Permissions must be a non-empty array'),
    body('permissions.*')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid permission ID format'),
  ],

  /**
   * Set permissions validation (replace all)
   */
  setPermissions: [
    param('id')
      .notEmpty()
      .withMessage('Role ID is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid role ID format'),
    body('permissions').isArray().withMessage('Permissions must be an array'),
    body('permissions.*')
      .optional()
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid permission ID format'),
  ],
};
