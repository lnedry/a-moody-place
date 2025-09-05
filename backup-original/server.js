#!/usr/bin/env node

/**
 * Server Entry Point for A Moody Place
 * 
 * This file starts the Express server and handles database connections,
 * environment validation, and graceful shutdown procedures.
 */

const app = require('./app');
const { testConnection, close: closeDatabaseConnections } = require('./database/config');
require('dotenv').config();

// Server configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'DB_PASSWORD',
    'JWT_SECRET',
    'SESSION_SECRET'
  ];

  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   • ${env}`));
    console.error('\n💡 Please copy .env.example to .env and fill in the values');
    process.exit(1);
  }

  // Validate JWT and Session secrets are sufficiently long
  if (process.env.JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  if (process.env.SESSION_SECRET.length < 32) {
    console.error('❌ SESSION_SECRET must be at least 32 characters long');
    process.exit(1);
  }

  console.log('✅ Environment variables validated');
}

/**
 * Test database connection before starting server
 */
async function validateDatabase() {
  console.log('🔄 Testing database connection...');
  
  const isConnected = await testConnection();
  
  if (!isConnected) {
    console.error('❌ Database connection failed');
    console.error('💡 Please check your database configuration in .env');
    process.exit(1);
  }
  
  console.log('✅ Database connection successful');
}

/**
 * Start the HTTP server
 */
function startServer() {
  const server = app.listen(PORT, HOST, () => {
    console.log('\n🚀 A Moody Place Server Started');
    console.log('=====================================');
    console.log(`🌐 Server URL: http://${HOST}:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`📊 Process ID: ${process.pid}`);
    console.log('=====================================\n');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development endpoints:');
      console.log(`   Health Check: http://${HOST}:${PORT}/health`);
      console.log(`   Detailed Health: http://${HOST}:${PORT}/health/detailed`);
      console.log('');
    }
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
      console.error(`💡 Try using a different port: PORT=3001 npm start`);
    } else if (error.code === 'EACCES') {
      console.error(`❌ Permission denied for port ${PORT}`);
      console.error(`💡 Try using a port above 1024 or run with elevated privileges`);
    } else {
      console.error('❌ Server error:', error.message);
    }
    process.exit(1);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal) => {
    console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
    
    server.close(async (err) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err.message);
        process.exit(1);
      }
      
      console.log('🔐 HTTP server closed');
      
      // Close database connections
      try {
        await closeDatabaseConnections();
        console.log('🔐 Database connections closed');
      } catch (dbError) {
        console.error('❌ Error closing database connections:', dbError.message);
      }
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('❌ Forced shutdown after 30 seconds');
      process.exit(1);
    }, 30000);
  };

  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  return server;
}

/**
 * Initialize and start the application
 */
async function initialize() {
  try {
    console.log('🔄 Initializing A Moody Place server...\n');
    
    // Validate environment
    validateEnvironment();
    
    // Test database connection
    await validateDatabase();
    
    // Start server
    startServer();
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the application if this file is run directly
if (require.main === module) {
  initialize();
}

module.exports = { initialize };