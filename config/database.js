const mysql = require('mysql2');
require('dotenv').config();

// Database configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',
    timezone: 'Z',
    acquireTimeout: 60000,
    timeout: 60000,
    multipleStatements: true
};

// Create the connection pool
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    reconnect: true,
    idleTimeout: 300000,
    acquireTimeout: 60000
});

// Promisify for async/await usage
const promisePool = pool.promise();

// Export the pool for use in other modules
module.exports = pool;

// Also export the promise version
module.exports.promise = promisePool;

// Health check function
module.exports.healthCheck = async () => {
    try {
        const [rows] = await promisePool.execute('SELECT 1 as health');
        return { 
            status: 'healthy', 
            connected: true,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { 
            status: 'unhealthy', 
            connected: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
};