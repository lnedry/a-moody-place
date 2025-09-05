/**
 * API Response Utilities for A Moody Place
 * 
 * Provides standardized response format for all API endpoints
 * Ensures consistent structure across the application
 */

class ApiResponse {
  /**
   * Create a successful response
   * @param {any} data - Response data
   * @param {string} message - Optional success message
   * @param {Object} meta - Additional metadata
   * @returns {Object} Formatted success response
   */
  static success(data = null, message = null, meta = {}) {
    return {
      success: true,
      data: data,
      message: message,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
  }

  /**
   * Create an error response
   * @param {string} message - Error message
   * @param {string} code - Error code identifier
   * @param {number} statusCode - HTTP status code
   * @param {any} details - Additional error details
   * @returns {Object} Formatted error response
   */
  static error(message, code = 'ERROR', statusCode = 500, details = null) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details,
        statusCode: statusCode
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a paginated response
   * @param {Array} data - Response data array
   * @param {number} page - Current page number
   * @param {number} limit - Items per page
   * @param {number} total - Total number of items
   * @param {string} message - Optional message
   * @returns {Object} Formatted paginated response
   */
  static paginated(data, page, limit, total, message = null) {
    const totalPages = Math.ceil(total / limit);
    const currentPage = parseInt(page);
    
    return {
      success: true,
      data: data,
      message: message,
      meta: {
        pagination: {
          current_page: currentPage,
          per_page: parseInt(limit),
          total_items: parseInt(total),
          total_pages: totalPages,
          has_next: currentPage < totalPages,
          has_prev: currentPage > 1,
          next_page: currentPage < totalPages ? currentPage + 1 : null,
          prev_page: currentPage > 1 ? currentPage - 1 : null
        },
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a validation error response
   * @param {Array} validationErrors - Array of validation error objects
   * @param {string} message - General validation message
   * @returns {Object} Formatted validation error response
   */
  static validationError(validationErrors, message = 'Validation failed') {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: message,
        details: validationErrors,
        statusCode: 400
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create an authentication error response
   * @param {string} message - Auth error message
   * @param {string} code - Specific auth error code
   * @returns {Object} Formatted auth error response
   */
  static authError(message = 'Authentication required', code = 'AUTH_REQUIRED') {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        statusCode: 401
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create an authorization error response
   * @param {string} message - Authorization error message
   * @returns {Object} Formatted authorization error response
   */
  static forbiddenError(message = 'Access forbidden') {
    return {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: message,
        statusCode: 403
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a not found error response
   * @param {string} resource - Resource that was not found
   * @returns {Object} Formatted not found error response
   */
  static notFoundError(resource = 'Resource') {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `${resource} not found`,
        statusCode: 404
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Create a rate limit error response
   * @param {string} message - Rate limit message
   * @param {number} retryAfter - Seconds until retry allowed
   * @returns {Object} Formatted rate limit error response
   */
  static rateLimitError(message = 'Too many requests', retryAfter = null) {
    const error = {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: message,
        statusCode: 429
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    if (retryAfter) {
      error.meta.retryAfter = retryAfter;
    }

    return error;
  }

  /**
   * Create a server error response
   * @param {string} message - Error message
   * @param {any} details - Error details (only in development)
   * @returns {Object} Formatted server error response
   */
  static serverError(message = 'Internal server error', details = null) {
    const error = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: message,
        statusCode: 500
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    // Only include error details in development
    if (process.env.NODE_ENV === 'development' && details) {
      error.error.details = details;
    }

    return error;
  }

  /**
   * Create a maintenance mode response
   * @param {string} message - Maintenance message
   * @param {Date} estimatedEnd - Estimated maintenance end time
   * @returns {Object} Formatted maintenance response
   */
  static maintenanceError(message = 'Service temporarily unavailable', estimatedEnd = null) {
    const error = {
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: message,
        statusCode: 503
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };

    if (estimatedEnd) {
      error.meta.estimatedRestoration = estimatedEnd.toISOString();
    }

    return error;
  }
}

module.exports = ApiResponse;