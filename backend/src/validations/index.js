/**
 * Validation Rules
 * Using express-validator for request validation
 */

const { body, param, query, validationResult } = require('express-validator');
const { formatValidationErrors } = require('../middleware/errorHandler');

/**
 * Validation middleware to handle errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: formatValidationErrors(errors),
    });
  }

  next();
};

/**
 * Auth Validation Rules
 */
const registerValidation = [
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('mobileNumber')
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be 10 digits'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),

  body('referralCode')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Invalid referral code'),

  handleValidationErrors,
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  handleValidationErrors,
];

const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),

  handleValidationErrors,
];

/**
 * Investment Validation Rules
 */
const createInvestmentValidation = [
  body('investmentAmount')
    .isFloat({ min: 100, max: 10000000 })
    .withMessage('Investment amount must be between 100 and 10000000'),

  body('planName')
    .isIn(['basic', 'standard', 'premium', 'elite'])
    .withMessage('Invalid plan name'),

  handleValidationErrors,
];

const updateInvestmentValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid investment ID'),

  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters'),

  handleValidationErrors,
];

const investmentIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid investment ID'),

  handleValidationErrors,
];

/**
 * Pagination Validation
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  handleValidationErrors,
];

/**
 * User ID Validation
 */
const userIdValidation = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID'),

  handleValidationErrors,
];

/**
 * Date Range Validation
 */
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),

  handleValidationErrors,
];

/**
 * Withdrawal Validation
 */
const withdrawalValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),

  body('bankAccount')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Invalid bank account'),

  body('upiId')
    .optional()
    .matches(/^[a-zA-Z0-9.\-_]{3,60}@[a-zA-Z]{3,}$/)
    .withMessage('Invalid UPI ID format'),

  handleValidationErrors,
];

/**
 * Referral Validation
 */
const referralCodeValidation = [
  query('code')
    .trim()
    .notEmpty()
    .withMessage('Referral code is required'),

  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  createInvestmentValidation,
  updateInvestmentValidation,
  investmentIdValidation,
  paginationValidation,
  userIdValidation,
  dateRangeValidation,
  withdrawalValidation,
  referralCodeValidation,
  handleValidationErrors,
};
