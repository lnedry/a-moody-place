/**
 * Authentication System for A Moody Place
 * 
 * Provides JWT-based authentication, password hashing, login attempts tracking,
 * and comprehensive security features for admin users.
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query, queryOne } = require('../database/config');

class AuthSystem {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    this.maxFailedAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    this.lockoutDuration = parseInt(process.env.LOCKOUT_DURATION) || 15 * 60 * 1000; // 15 minutes
    this.saltRounds = 12;
  }

  /**
   * Hash a password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify a password against its hash
   * @param {string} password - Plain text password
   * @param {string} hash - Stored password hash
   * @returns {Promise<boolean>} True if password matches
   */
  async verifyPassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate JWT access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} Token pair
   */
  generateTokens(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      iat: Math.floor(Date.now() / 1000)
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry,
      issuer: 'a-moody-place.com',
      audience: 'a-moody-place-admin'
    });

    const refreshToken = jwt.sign(
      { 
        userId: user.id, 
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000)
      },
      this.jwtSecret,
      { 
        expiresIn: this.refreshTokenExpiry,
        issuer: 'a-moody-place.com',
        audience: 'a-moody-place-admin'
      }
    );

    return { 
      accessToken, 
      refreshToken,
      expiresIn: this.jwtExpiry,
      tokenType: 'Bearer'
    };
  }

  /**
   * Authenticate user with username/email and password
   * @param {string} usernameOrEmail - Username or email address
   * @param {string} password - Plain text password
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Promise<Object>} Authentication result
   */
  async login(usernameOrEmail, password, ipAddress, userAgent) {
    try {
      // Find user by username or email
      const user = await queryOne(
        `SELECT id, username, email, password_hash, full_name, role, is_active, 
                failed_login_attempts, locked_until, last_login_at
         FROM admin_users 
         WHERE (username = ? OR email = ?) AND is_active = TRUE`,
        [usernameOrEmail, usernameOrEmail]
      );

      if (!user) {
        await this.logAuthEvent('login_failed', null, ipAddress, userAgent, 'User not found');
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        const lockTime = Math.ceil((new Date(user.locked_until) - new Date()) / 1000 / 60);
        await this.logAuthEvent('login_blocked', user.id, ipAddress, userAgent, `Account locked for ${lockTime} minutes`);
        throw new Error(`Account temporarily locked. Try again in ${lockTime} minutes.`);
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        await this.handleFailedLogin(user.id, ipAddress, userAgent);
        throw new Error('Invalid credentials');
      }

      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Update last login timestamp
      await query(
        'UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Log successful login
      await this.logAuthEvent('login_success', user.id, ipAddress, userAgent);

      // Return user data (excluding sensitive information)
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          lastLogin: user.last_login_at
        },
        tokens
      };

    } catch (error) {
      // Ensure failed login is logged
      if (error.message !== 'Invalid credentials') {
        await this.logAuthEvent('login_error', null, ipAddress, userAgent, error.message);
      }
      throw error;
    }
  }

  /**
   * Handle failed login attempt
   * @param {number} userId - User ID
   * @param {string} ipAddress - Client IP
   * @param {string} userAgent - Client user agent
   */
  async handleFailedLogin(userId, ipAddress, userAgent) {
    try {
      // Increment failed attempts
      await query(
        'UPDATE admin_users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?',
        [userId]
      );

      // Check if we need to lock the account
      const user = await queryOne(
        'SELECT failed_login_attempts FROM admin_users WHERE id = ?',
        [userId]
      );

      if (user && user.failed_login_attempts >= this.maxFailedAttempts) {
        const lockUntil = new Date(Date.now() + this.lockoutDuration);
        await query(
          'UPDATE admin_users SET locked_until = ? WHERE id = ?',
          [lockUntil, userId]
        );

        await this.logAuthEvent(
          'account_locked', 
          userId, 
          ipAddress, 
          userAgent, 
          `Account locked after ${this.maxFailedAttempts} failed attempts`
        );
      } else {
        await this.logAuthEvent('login_failed', userId, ipAddress, userAgent, 'Invalid password');
      }
    } catch (error) {
      console.error('Error handling failed login:', error);
    }
  }

  /**
   * Reset failed login attempts
   * @param {number} userId - User ID
   */
  async resetFailedAttempts(userId) {
    try {
      await query(
        'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
    }
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret, {
        issuer: 'a-moody-place.com',
        audience: 'a-moody-place-admin'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} New token pair
   */
  async refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Verify user still exists and is active
      const user = await queryOne(
        'SELECT id, username, email, full_name, role FROM admin_users WHERE id = ? AND is_active = TRUE',
        [decoded.userId]
      );

      if (!user) {
        throw new Error('User no longer exists or is inactive');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);
      
      return {
        success: true,
        tokens
      };

    } catch (error) {
      throw new Error('Invalid refresh token: ' + error.message);
    }
  }

  /**
   * Create a new admin user
   * @param {Object} userData - User data
   * @returns {Promise<number>} Created user ID
   */
  async createUser(userData) {
    const { username, email, password, fullName, role = 'admin' } = userData;
    
    try {
      // Check if username or email already exists
      const existingUser = await queryOne(
        'SELECT id FROM admin_users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existingUser) {
        throw new Error('Username or email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Create user
      const userId = await query(
        `INSERT INTO admin_users (username, email, password_hash, full_name, role, password_changed_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [username, email, passwordHash, fullName, role]
      );

      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {number} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      // Get current password hash
      const user = await queryOne(
        'SELECT password_hash FROM admin_users WHERE id = ? AND is_active = TRUE',
        [userId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentValid = await this.verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await this.hashPassword(newPassword);

      // Update password
      await query(
        'UPDATE admin_users SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newPasswordHash, userId]
      );

      return true;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Log authentication events for security monitoring
   * @param {string} event - Event type
   * @param {number} userId - User ID (null if not applicable)
   * @param {string} ipAddress - Client IP
   * @param {string} userAgent - Client user agent
   * @param {string} details - Additional details
   */
  async logAuthEvent(event, userId, ipAddress, userAgent, details = null) {
    try {
      await query(
        `INSERT INTO site_analytics 
         (event_type, event_data, user_ip, user_agent, device_type, created_at) 
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          event,
          JSON.stringify({ 
            userId, 
            details,
            timestamp: new Date().toISOString()
          }),
          ipAddress,
          userAgent,
          this.detectDeviceType(userAgent)
        ]
      );
    } catch (error) {
      console.error('Error logging auth event:', error);
    }
  }

  /**
   * Detect device type from user agent
   * @param {string} userAgent - User agent string
   * @returns {string} Device type
   */
  detectDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    const ua = userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Generate secure random token for password reset
   * @returns {string} Secure random token
   */
  generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Create singleton instance
const authSystem = new AuthSystem();

module.exports = authSystem;