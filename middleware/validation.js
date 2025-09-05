/**
 * Validation Middleware for A Moody Place
 * 
 * Provides comprehensive input validation, sanitization, and security checks
 * for all user inputs including forms, API requests, and file uploads.
 */

const { body, param, query, validationResult } = require('express-validator');
const validator = require('validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to handle validation results
 * Should be used after validation rules
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    return res.status(400).json(
      ApiResponse.validationError(formattedErrors)
    );
  }
  
  next();
};

/**
 * Custom validator to check password strength
 */
const isStrongPassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

/**
 * Custom validator for slug format
 */
const isValidSlug = (slug) => {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

/**
 * Custom validator for safe HTML content
 */
const isSafeHtml = (html) => {
  // Basic check for dangerous tags and attributes
  const dangerousTags = /<(script|iframe|object|embed|form|input|button|meta|link|style)[^>]*>/gi;
  const dangerousAttributes = /on[a-z]+\s*=/gi;
  const dangerousProtocols = /(javascript|data|vbscript):/gi;
  
  return !dangerousTags.test(html) && !dangerousAttributes.test(html) && !dangerousProtocols.test(html);
};

// ========================================
// AUTHENTICATION VALIDATION RULES
// ========================================

const loginValidation = [
  body('usernameOrEmail')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Username or email must be 2-255 characters'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Password cannot be empty'),
];

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
    .isLength({ max: 255 })
    .withMessage('Email address too long'),
    
  body('password')
    .custom((password) => {
      if (!isStrongPassword(password)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
      }
      return true;
    }),
    
  body('fullName')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be 2-255 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('Full name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('role')
    .optional()
    .isIn(['admin', 'editor'])
    .withMessage('Role must be admin or editor')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .custom((password) => {
      if (!isStrongPassword(password)) {
        throw new Error('New password must be at least 8 characters with uppercase, lowercase, number, and special character');
      }
      return true;
    }),
    
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    })
];

// ========================================
// CONTENT VALIDATION RULES
// ========================================

const songValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Song title must be 1-255 characters'),
    
  body('slug')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Slug must be 1-255 characters')
    .custom((slug) => {
      if (!isValidSlug(slug)) {
        throw new Error('Slug can only contain lowercase letters, numbers, and hyphens');
      }
      return true;
    }),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters'),
    
  body('release_date')
    .optional()
    .isDate()
    .withMessage('Release date must be a valid date'),
    
  body('duration')
    .optional()
    .isInt({ min: 1, max: 7200 })
    .withMessage('Duration must be between 1 and 7200 seconds'),
    
  body('spotify_url')
    .optional()
    .isURL({ protocols: ['https'] })
    .withMessage('Spotify URL must be a valid HTTPS URL'),
    
  body('apple_music_url')
    .optional()
    .isURL({ protocols: ['https'] })
    .withMessage('Apple Music URL must be a valid HTTPS URL'),
    
  body('youtube_url')
    .optional()
    .isURL({ protocols: ['https'] })
    .withMessage('YouTube URL must be a valid HTTPS URL'),
    
  body('soundcloud_url')
    .optional()
    .isURL({ protocols: ['https'] })
    .withMessage('SoundCloud URL must be a valid HTTPS URL'),
    
  body('featured')
    .optional()
    .isBoolean()
    .withMessage('Featured must be true or false'),
    
  body('is_published')
    .optional()
    .isBoolean()
    .withMessage('Published status must be true or false'),
    
  body('sort_order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer')
];

const blogPostValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Blog post title must be 1-255 characters'),
    
  body('slug')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Slug must be 1-255 characters')
    .custom((slug) => {
      if (!isValidSlug(slug)) {
        throw new Error('Slug can only contain lowercase letters, numbers, and hyphens');
      }
      return true;
    }),
    
  body('content')
    .trim()
    .isLength({ min: 10, max: 50000 })
    .withMessage('Content must be 10-50000 characters')
    .custom((content) => {
      if (!isSafeHtml(content)) {
        throw new Error('Content contains potentially dangerous HTML');
      }
      return true;
    }),
    
  body('excerpt')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters'),
    
  body('meta_title')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Meta title cannot exceed 60 characters'),
    
  body('meta_description')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters'),
    
  body('is_published')
    .optional()
    .isBoolean()
    .withMessage('Published status must be true or false'),
    
  body('published_at')
    .optional()
    .isISO8601()
    .withMessage('Published date must be a valid ISO 8601 date'),
    
  body('read_time_minutes')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Read time must be between 1 and 120 minutes')
];

const showValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Show title must be 1-255 characters'),
    
  body('venue')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Venue must be 1-255 characters'),
    
  body('city')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('City must be 1-100 characters'),
    
  body('state_province')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State/Province cannot exceed 50 characters'),
    
  body('country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be 2-50 characters'),
    
  body('event_date')
    .isISO8601()
    .withMessage('Event date must be a valid ISO 8601 date'),
    
  body('doors_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Doors time must be in HH:MM:SS format'),
    
  body('show_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
    .withMessage('Show time must be in HH:MM:SS format'),
    
  body('ticket_url')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('Ticket URL must be a valid URL'),
    
  body('ticket_price')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Ticket price cannot exceed 50 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
    
  body('age_restriction')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Age restriction cannot exceed 20 characters'),
    
  body('status')
    .optional()
    .isIn(['upcoming', 'completed', 'cancelled', 'postponed'])
    .withMessage('Status must be upcoming, completed, cancelled, or postponed')
];

const photoValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Title cannot exceed 255 characters'),
    
  body('caption')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Caption cannot exceed 1000 characters'),
    
  body('alt_text')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Alt text must be 1-255 characters'),
    
  body('category')
    .optional()
    .isIn(['professional', 'performance', 'studio', 'personal', 'press'])
    .withMessage('Category must be professional, performance, studio, personal, or press'),
    
  body('photographer')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Photographer name cannot exceed 255 characters'),
    
  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location cannot exceed 255 characters'),
    
  body('is_featured')
    .optional()
    .isBoolean()
    .withMessage('Featured status must be true or false'),
    
  body('is_press_approved')
    .optional()
    .isBoolean()
    .withMessage('Press approved status must be true or false')
];

// ========================================
// CONTACT FORM VALIDATION
// ========================================

const contactValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be 2-255 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
    .isLength({ max: 255 })
    .withMessage('Email address too long'),
    
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Valid phone number required if provided'),
    
  body('company_organization')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Company/Organization name cannot exceed 255 characters'),
    
  body('inquiry_type')
    .isIn(['collaboration', 'booking', 'press', 'licensing', 'fan', 'general'])
    .withMessage('Invalid inquiry type'),
    
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Subject cannot exceed 255 characters'),
    
  body('message')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be 10-5000 characters'),
    
  body('preferred_contact_method')
    .optional()
    .isIn(['email', 'phone'])
    .withMessage('Preferred contact method must be email or phone'),
    
  body('urgency')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Urgency must be low, medium, or high')
];

// ========================================
// NEWSLETTER VALIDATION
// ========================================

const newsletterSubscriptionValidation = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email address is required')
    .isLength({ max: 255 })
    .withMessage('Email address too long'),
    
  body('first_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('First name cannot exceed 100 characters')
    .matches(/^[a-zA-Z\s\-'.]*$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('last_name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Last name cannot exceed 100 characters')
    .matches(/^[a-zA-Z\s\-'.]*$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),
    
  body('subscriber_type')
    .optional()
    .isIn(['fan', 'industry', 'press'])
    .withMessage('Subscriber type must be fan, industry, or press'),
    
  body('interests')
    .optional()
    .isArray()
    .withMessage('Interests must be an array')
    .custom((interests) => {
      const validInterests = ['new-releases', 'shows', 'blog-posts', 'press'];
      const invalidInterests = interests.filter(interest => !validInterests.includes(interest));
      if (invalidInterests.length > 0) {
        throw new Error(`Invalid interests: ${invalidInterests.join(', ')}`);
      }
      return true;
    })
];

// ========================================
// PARAMETER VALIDATION
// ========================================

const idParamValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer')
];

const slugParamValidation = [
  param('slug')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Slug must be 1-255 characters')
    .custom((slug) => {
      if (!isValidSlug(slug)) {
        throw new Error('Invalid slug format');
      }
      return true;
    })
];

// ========================================
// QUERY PARAMETER VALIDATION
// ========================================

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

const searchValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Search query must be 1-255 characters')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/)
    .withMessage('Search query contains invalid characters')
];

module.exports = {
  handleValidationErrors,
  
  // Authentication validation
  loginValidation,
  registerValidation,
  changePasswordValidation,
  
  // Content validation
  songValidation,
  blogPostValidation,
  showValidation,
  photoValidation,
  
  // Form validation
  contactValidation,
  newsletterSubscriptionValidation,
  
  // Parameter validation
  idParamValidation,
  slugParamValidation,
  
  // Query validation
  paginationValidation,
  searchValidation,
  
  // Helper functions
  isStrongPassword,
  isValidSlug,
  isSafeHtml
};