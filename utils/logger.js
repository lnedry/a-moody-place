/**
 * Logging Utility for A Moody Place
 * 
 * Provides structured logging with different levels, file rotation,
 * and monitoring integration for the application.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logDirectory = process.env.LOG_DIRECTORY || path.join(__dirname, '..', 'logs');
    this.maxFileSize = parseInt(process.env.LOG_MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB
    this.maxFiles = parseInt(process.env.LOG_MAX_FILES) || 5;
    
    // Ensure log directory exists
    this.ensureLogDirectory();
    
    // Log levels (higher number = more important)
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    this.currentLogLevel = this.levels[this.logLevel] || this.levels.info;
  }

  ensureLogDirectory() {
    try {
      if (!fs.existsSync(this.logDirectory)) {
        fs.mkdirSync(this.logDirectory, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      pid,
      message,
      ...meta
    };
    
    return JSON.stringify(logEntry);
  }

  shouldLog(level) {
    return this.levels[level] >= this.currentLogLevel;
  }

  writeToFile(filename, content) {
    const filePath = path.join(this.logDirectory, filename);
    
    try {
      // Check if file needs rotation
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size >= this.maxFileSize) {
          this.rotateLogFile(filePath);
        }
      }
      
      // Append to log file
      fs.appendFileSync(filePath, content + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
      // Fallback to console
      console.log(content);
    }
  }

  rotateLogFile(filePath) {
    try {
      const fileExtension = path.extname(filePath);
      const baseName = path.basename(filePath, fileExtension);
      const directory = path.dirname(filePath);
      
      // Rotate existing files
      for (let i = this.maxFiles - 1; i >= 1; i--) {
        const oldFile = path.join(directory, `${baseName}.${i}${fileExtension}`);
        const newFile = path.join(directory, `${baseName}.${i + 1}${fileExtension}`);
        
        if (fs.existsSync(oldFile)) {
          if (i === this.maxFiles - 1) {
            fs.unlinkSync(oldFile); // Delete oldest file
          } else {
            fs.renameSync(oldFile, newFile);
          }
        }
      }
      
      // Move current file to .1
      const rotatedFile = path.join(directory, `${baseName}.1${fileExtension}`);
      fs.renameSync(filePath, rotatedFile);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      const colorMap = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m'  // Red
      };
      const resetColor = '\x1b[0m';
      const color = colorMap[level] || resetColor;
      
      console.log(`${color}[${level.toUpperCase()}]${resetColor} ${message}`, meta);
    }
    
    // Write to appropriate log file
    if (level === 'error') {
      this.writeToFile('error.log', formattedMessage);
    } else if (level === 'warn') {
      this.writeToFile('error.log', formattedMessage); // Warnings also go to error log
    }
    
    // All messages go to general log
    this.writeToFile('app.log', formattedMessage);
    
    // Access logs go to separate file
    if (meta.type === 'access') {
      this.writeToFile('access.log', formattedMessage);
    }
    
    // Security events get special logging
    if (meta.type === 'security') {
      this.writeToFile('security.log', formattedMessage);
    }
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  error(message, meta = {}) {
    this.log('error', message, meta);
  }

  // Specialized logging methods
  logRequest(req, res) {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      const meta = {
        type: 'access',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id || null,
        contentLength: res.get('Content-Length') || 0
      };
      
      if (res.statusCode >= 400) {
        this.warn(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, meta);
      } else {
        this.info(`HTTP ${res.statusCode} - ${req.method} ${req.originalUrl}`, meta);
      }
    });
  }

  logSecurity(event, details = {}) {
    this.warn(`Security event: ${event}`, {
      type: 'security',
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  logAuth(event, userId = null, details = {}) {
    this.info(`Auth event: ${event}`, {
      type: 'auth',
      event,
      userId,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  logDatabase(operation, details = {}) {
    this.debug(`Database operation: ${operation}`, {
      type: 'database',
      operation,
      ...details
    });
  }

  logPerformance(operation, duration, details = {}) {
    const level = duration > 1000 ? 'warn' : 'info'; // Warn if operation takes more than 1 second
    
    this[level](`Performance: ${operation} completed in ${duration}ms`, {
      type: 'performance',
      operation,
      duration,
      ...details
    });
  }

  // Express middleware factory
  middleware() {
    return (req, res, next) => {
      this.logRequest(req, res);
      next();
    };
  }

  // Error handling middleware
  errorHandler() {
    return (err, req, res, next) => {
      const meta = {
        type: 'error',
        error: err.name,
        stack: err.stack,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id || null
      };
      
      this.error(`Unhandled error: ${err.message}`, meta);
      next(err);
    };
  }

  // Graceful shutdown
  async close() {
    this.info('Logger shutting down...');
    
    // In a real implementation, you might want to flush any pending writes
    // or close file handles here
    
    return new Promise(resolve => {
      setTimeout(resolve, 100); // Give a moment for final writes
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Export both the instance and the class
module.exports = logger;
module.exports.Logger = Logger;