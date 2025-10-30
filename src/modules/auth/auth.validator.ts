import { body, ValidationChain } from 'express-validator';

/**
 * Login validation rules
 */
export const loginValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Register validation rules
 */
export const registerValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  body('first_name')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid phone number'),

  body('user_type')
    .optional()
    .isIn(['end_user', 'owner', 'agent', 'agency_admin'])
    .withMessage('User type must be end_user, owner, agent, or agency_admin'),

  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Language must be one of: en, fr, de, it'),

  // Professional registration fields
  body('agency_name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Agency name cannot exceed 200 characters'),

  body('agency_phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid agency phone number'),

  body('agency_email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid agency email address'),

  body('agency_address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Agency address cannot exceed 500 characters'),
];

/**
 * Refresh token validation rules
 */
export const refreshTokenValidator: ValidationChain[] = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token is required')
    .isString()
    .withMessage('Refresh token must be a string'),
];

/**
 * Password change validation rules
 */
export const changePasswordValidator: ValidationChain[] = [
  body('current_password').notEmpty().withMessage('Current password is required'),

  body('new_password')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
    .custom((value, { req }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (value === req.body.current_password) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
];

/**
 * Profile update validation rules
 */
export const updateProfileValidator: ValidationChain[] = [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[0-9\s\-().]+$/)
    .withMessage('Please provide a valid phone number'),

  body('preferred_language')
    .optional()
    .isIn(['en', 'fr', 'de', 'it'])
    .withMessage('Language must be one of: en, fr, de, it'),
];

/**
 * Email verification validation rules
 */
export const verifyEmailValidator: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
    .isString()
    .withMessage('Verification token must be a string')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid verification token format'),
];

/**
 * Resend verification email validation rules
 */
export const resendVerificationValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Forgot password validation rules
 */
export const forgotPasswordValidator: ValidationChain[] = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

/**
 * Reset password validation rules
 */
export const resetPasswordValidator: ValidationChain[] = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .withMessage('Reset token must be a string')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token format'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];
