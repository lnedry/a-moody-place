/**
 * Database Configuration for A Moody Place
 * 
 * This module provides database connection pool management and query utilities
 * Supports both development and production configurations with connection pooling
 */

const mariadb = require('mariadb');
require('dotenv').config();

class DatabaseManager {
  constructor() {
    this.pool = null;
    this.isConnected = false;
    this.init();
  }

  init() {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'a-moody-place_user',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'a-moody-place_db',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
      timeout: parseInt(process.env.DB_TIMEOUT) || 60000,
      charset: 'utf8mb4',
      timezone: 'UTC',
      // Connection pool settings
      idleTimeout: 1800000, // 30 minutes
      leakDetectionTimeout: 60000,
      // MariaDB specific settings
      insertIdAsNumber: true,
      bigNumberStrings: false,
      // SSL configuration for production
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true
      } : false,
      // Performance settings
      trace: process.env.NODE_ENV === 'development',
      debug: process.env.DEBUG === 'true'
    };

    // Validate required configuration
    if (!dbConfig.password) {
      throw new Error('DB_PASSWORD environment variable is required');
    }

    this.pool = mariadb.createPool(dbConfig);
    
    // Set up connection event handlers
    this.pool.on('connection', (conn) => {
      console.log(`📦 Database connection established (ID: ${conn.threadId})`);
      this.isConnected = true;
    });

    this.pool.on('error', (error) => {
      console.error('❌ Database pool error:', error);
      this.isConnected = false;
    });
  }

  /**
   * Execute a SQL query with parameters
   * @param {string} sql - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(sql, params = []) {
    let connection = null;
    
    try {
      connection = await this.pool.getConnection();
      const result = await connection.query(sql, params);
      
      // Log query in development mode
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG === 'true') {
        console.log('🔍 SQL Query:', sql);
        console.log('📝 Parameters:', params);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      console.error('🔍 SQL:', sql);
      console.error('📝 Params:', params);
      throw error;
    } finally {
      if (connection) {
        connection.end();
      }
    }
  }

  /**
   * Execute a transaction with multiple queries
   * @param {Function} callback - Function that receives connection and executes queries
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    let connection = null;
    
    try {
      connection = await this.pool.getConnection();
      await connection.beginTransaction();
      
      const result = await callback(connection);
      
      await connection.commit();
      return result;
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      console.error('❌ Transaction failed:', error.message);
      throw error;
    } finally {
      if (connection) {
        connection.end();
      }
    }
  }

  /**
   * Get a single row from the database
   * @param {string} sql - SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single row result or null
   */
  async queryOne(sql, params = []) {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute an INSERT query and return the inserted ID
   * @param {string} sql - INSERT SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<number>} Inserted row ID
   */
  async insert(sql, params = []) {
    const result = await this.query(sql, params);
    return result.insertId;
  }

  /**
   * Execute an UPDATE query and return affected rows count
   * @param {string} sql - UPDATE SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<number>} Number of affected rows
   */
  async update(sql, params = []) {
    const result = await this.query(sql, params);
    return result.affectedRows;
  }

  /**
   * Execute a DELETE query and return affected rows count
   * @param {string} sql - DELETE SQL query string
   * @param {Array} params - Query parameters
   * @returns {Promise<number>} Number of affected rows
   */
  async delete(sql, params = []) {
    const result = await this.query(sql, params);
    return result.affectedRows;
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection status
   */
  async testConnection() {
    try {
      await this.query('SELECT 1 as test');
      this.isConnected = true;
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Database connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get database connection statistics
   * @returns {Promise<Object>} Connection pool statistics
   */
  async getStats() {
    try {
      const stats = {
        totalConnections: this.pool.totalConnections(),
        activeConnections: this.pool.activeConnections(),
        idleConnections: this.pool.idleConnections(),
        taskQueueSize: this.pool.taskQueueSize()
      };
      
      return stats;
    } catch (error) {
      console.error('❌ Failed to get database stats:', error.message);
      return null;
    }
  }

  /**
   * Close all database connections
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('🔐 Database connection pool closed');
        this.isConnected = false;
      }
    } catch (error) {
      console.error('❌ Error closing database connections:', error.message);
    }
  }

  /**
   * Health check for monitoring
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        connected: this.isConnected,
        responseTime: responseTime,
        stats: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

// Export convenience methods
module.exports = {
  pool: dbManager.pool,
  query: dbManager.query.bind(dbManager),
  queryOne: dbManager.queryOne.bind(dbManager),
  insert: dbManager.insert.bind(dbManager),
  update: dbManager.update.bind(dbManager),
  delete: dbManager.delete.bind(dbManager),
  transaction: dbManager.transaction.bind(dbManager),
  testConnection: dbManager.testConnection.bind(dbManager),
  getStats: dbManager.getStats.bind(dbManager),
  healthCheck: dbManager.healthCheck.bind(dbManager),
  close: dbManager.close.bind(dbManager),
  
  // Direct access to the manager instance
  manager: dbManager
};