/**
 * Authentication Middleware for A Moody Place
 * 
 * Provides middleware functions for JWT authentication, role-based access control,
 * and request validation for admin routes.
 */

const authSystem = require('../security/auth');
const { queryOne } = require('../database/config');
const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware to authenticate JWT tokens
 * Validates the token and attaches user information to the request
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        ApiResponse.authError('Access token required', 'AUTH_TOKEN_MISSING')
      );
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json(
        ApiResponse.authError('Invalid authorization header format', 'AUTH_INVALID_FORMAT')
      );
    }

    // Verify the token
    let decoded;
    try {
      decoded = authSystem.verifyToken(token);
    } catch (error) {
      if (error.message === 'Token expired') {
        return res.status(401).json(
          ApiResponse.authError('Token has expired', 'AUTH_TOKEN_EXPIRED')
        );
      }
      return res.status(401).json(
        ApiResponse.authError('Invalid token', 'AUTH_INVALID_TOKEN')
      );
    }

    // Fetch current user data from database
    const user = await queryOne(
      'SELECT id, username, email, full_name, role, is_active, last_login_at FROM admin_users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json(
        ApiResponse.authError('User not found or inactive', 'AUTH_USER_NOT_FOUND')
      );
    }

    // Attach user information to request
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      lastLogin: user.last_login_at
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json(
      ApiResponse.serverError('Authentication error')
    );
  }
};

/**
 * Middleware to check if user has required role
 * @param {Array<string>} allowedRoles - Array of roles that can access the route
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        ApiResponse.authError('Authentication required', 'AUTH_REQUIRED')
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(
        ApiResponse.forbiddenError(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
      );
    }

    next();
  };
};

/**
 * Middleware to check if user is super admin
 */
const requireSuperAdmin = requireRole(['super_admin']);

/**
 * Middleware to check if user is admin or super admin
 */
const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Middleware to check if user is editor, admin, or super admin
 */
const requireEditor = requireRole(['editor', 'admin', 'super_admin']);

/**
 * Optional authentication middleware
 * Authenticates user if token is present but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // No authentication provided, continue without user
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = authSystem.verifyToken(token);
    
    const user = await queryOne(
      'SELECT id, username, email, full_name, role, is_active FROM admin_users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (user) {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role
      };
    }
  } catch (error) {
    // Silently ignore authentication errors in optional auth
    console.log('Optional auth failed:', error.message);
  }

  next();
};

/**
 * Middleware to check if the authenticated user can access their own resources
 * or if they have admin privileges to access other users' resources
 */
const requireOwnershipOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json(
      ApiResponse.authError('Authentication required', 'AUTH_REQUIRED')
    );
  }

  const targetUserId = parseInt(req.params.userId || req.params.id);
  const currentUserId = req.user.id;
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

  // Allow if user is accessing their own resources or if they're an admin
  if (targetUserId === currentUserId || isAdmin) {
    return next();
  }

  return res.status(403).json(
    ApiResponse.forbiddenError('You can only access your own resources')
  );
};

/**
 * Middleware to validate request source and security headers
 */
const validateSecurityHeaders = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /<[^>]*>/g // Basic HTML tag detection
  ];

  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';

  // Block requests with suspicious user agents
  if (userAgent.length === 0 || userAgent.length > 500) {
    return res.status(400).json(
      ApiResponse.error('Invalid user agent', 'INVALID_USER_AGENT', 400)
    );
  }

  // Check for XSS attempts in common headers
  const headersToCheck = ['user-agent', 'referer', 'origin'];
  
  for (const headerName of headersToCheck) {
    const headerValue = req.get(headerName) || '';
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(headerValue)) {
        return res.status(400).json(
          ApiResponse.error('Suspicious request detected', 'SECURITY_VIOLATION', 400)
        );
      }
    }
  }

  next();
};

/**
 * Middleware to log authentication events
 */
const logAuthEvent = (eventType) => {
  return (req, res, next) => {
    // Store event info for later logging
    req.authEvent = {
      type: eventType,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || null
    };

    // Log the event after response
    res.on('finish', () => {
      if (req.authEvent) {
        authSystem.logAuthEvent(
          req.authEvent.type,
          req.authEvent.userId,
          req.authEvent.ip,
          req.authEvent.userAgent,
          `${req.method} ${req.path} - ${res.statusCode}`
        ).catch(error => console.error('Failed to log auth event:', error));
      }
    });

    next();
  };
};

/**
 * Middleware to refresh JWT token automatically if close to expiration
 */
const refreshTokenIfNeeded = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    const token = authHeader.split(' ')[1];
    const decoded = authSystem.verifyToken(token);
    
    // Check if token expires within the next 30 minutes
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const thirtyMinutesFromNow = Date.now() + (30 * 60 * 1000);
    
    if (expirationTime < thirtyMinutesFromNow) {
      // Add header to suggest token refresh
      res.set('X-Token-Refresh-Suggested', 'true');
      res.set('X-Token-Expires-At', new Date(expirationTime).toISOString());
    }
  } catch (error) {
    // Don't fail the request if refresh check fails
    console.error('Token refresh check failed:', error.message);
  }

  next();
};

module.exports = {
  authenticateAdmin,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  requireEditor,
  optionalAuth,
  requireOwnershipOrAdmin,
  validateSecurityHeaders,
  logAuthEvent,
  refreshTokenIfNeeded
};