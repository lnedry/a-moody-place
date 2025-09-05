#!/usr/bin/env node

/**
 * Database Migration Script for A Moody Place
 * 
 * This script creates all necessary database tables and indexes
 * Run with: node database/migrate.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const mariadb = require('mariadb');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'a-moody-place_db',
  multipleStatements: true,
  charset: 'utf8mb4',
  timezone: 'UTC'
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting database migration...');
    console.log(`📊 Database: ${dbConfig.database}`);
    console.log(`🖥️  Host: ${dbConfig.host}`);
    
    // Connect to database
    connection = await mariadb.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    console.log('🔧 Creating database schema...');
    await connection.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    console.log('\n📋 Created tables:');
    console.log('   • songs');
    console.log('   • blog_posts');
    console.log('   • shows');
    console.log('   • photos');
    console.log('   • contact_inquiries');
    console.log('   • newsletter_subscribers');
    console.log('   • site_analytics');
    console.log('   • admin_users');
    console.log('   • tags');
    console.log('   • taggables');
    console.log('   • sessions');
    
    // Verify tables were created
    const tables = await connection.query('SHOW TABLES');
    console.log(`\n✅ Total tables created: ${tables.length}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Check your database credentials in the .env file');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Database does not exist. Please create it first:');
      console.error(`   CREATE DATABASE ${dbConfig.database};`);
    } else {
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Check if required environment variables are set
function checkEnvironment() {
  const required = ['DB_PASSWORD'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   • ${env}`));
    console.error('\n💡 Please copy .env.example to .env and fill in the values');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  checkEnvironment();
  runMigration().catch(console.error);
}

module.exports = { runMigration };