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
  body('target')
    .trim()
    .notEmpty()
    .withMessage('Target is required (port number, URL, or hostname)')
    .custom((value) => {
      // Allow port numbers (1-65535)
      if (/^\d+$/.test(value)) {
        const port = parseInt(value);
        if (port >= 1 && port <= 65535) {
          return true;
        }
        throw new Error('Port must be between 1 and 65535');
      }
      // Allow URLs (http://..., https://...)
      if (value.startsWith('http://') || value.startsWith('https://')) {
        return true;
      }
      // Allow hostname:port format
      if (/^[a-zA-Z0-9.-]+:\d+$/.test(value)) {
        return true;
      }
      // Allow plain hostnames or IPs
      if (/^[a-zA-Z0-9.-]+$/.test(value) || /^(\d{1,3}\.){3}\d{1,3}$/.test(value)) {
        return true;
      }
      throw new Error('Invalid target format. Must be a port, URL, hostname, or IP address');
    }),

  body('subdomain')
    .trim()
    .notEmpty()
    .withMessage('Subdomain is required')
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
