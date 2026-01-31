import { body, param, validationResult } from 'express-validator';

// Validation result checker
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Auth profile validation rules
export const authProfileValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Name can only contain letters, numbers, hyphens, and underscores'),

  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  validate
];

// Tunnel creation validation rules
export const tunnelValidation = [
  body('port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be between 1 and 65535'),

  body('subdomain')
    .optional()
    .trim()
    .isLength({ min: 3, max: 63 })
    .withMessage('Subdomain must be between 3 and 63 characters')
    .matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/)
    .withMessage('Subdomain must contain only lowercase letters, numbers, and hyphens'),

  body('authProfileId')
    .optional()
    .isUUID()
    .withMessage('Invalid auth profile ID'),

  validate
];

// ID parameter validation
export const idValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid ID format'),

  validate
];
