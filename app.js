/**
 * Main Express Application for A Moody Place
 * 
 * This file configures the Express.js application with all necessary middleware,
 * security measures, and route handlers for the artist website.
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Internal imports
const ApiResponse = require('./utils/apiResponse');
const { healthCheck } = require('./database/config');

// Create Express application
const app = express();

// ========================================
// TRUST PROXY CONFIGURATION
// ========================================
// Important for proper IP detection behind reverse proxy
app.set('trust proxy', 1);

// ========================================
// SECURITY MIDDLEWARE
// ========================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://fonts.googleapis.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:", 
        "blob:"
      ],
      scriptSrc: [
        "'self'",
        // Add specific script sources as needed
      ],
      mediaSrc: [
        "'self'", 
        "blob:"
      ],
      connectSrc: [
        "'self'"
      ],
      frameSrc: [
        "https://www.youtube.com", 
        "https://open.spotify.com",
        "https://w.soundcloud.com"
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false
}));

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs: windowMs,
  max: max,
  message: ApiResponse.rateLimitError(message),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(ApiResponse.rateLimitError(message));
  }
});

// Global rate limiter - more permissive for general browsing
const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window per IP
  'Too many requests from this IP, please try again later'
);

// Stricter rate limiter for API endpoints
const apiLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  50, // 50 API requests per window per IP
  'Too many API requests from this IP, please try again later'
);

// Very strict rate limiter for authentication endpoints
const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 auth attempts per window per IP
  'Too many authentication attempts, please try again later'
);

// Apply general rate limiting
app.use(generalLimiter);

// ========================================
// LOGGING MIDDLEWARE
// ========================================

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Access logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' })
  }));
} else {
  app.use(morgan('dev'));
}

// ========================================
// BASIC MIDDLEWARE CONFIGURATION
// ========================================

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1000,
  filter: (req, res) => {
    // Don't compress responses if the request includes a cache-busting query string
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          'https://a-moody-place.com',
          'https://www.a-moody-place.com',
          'https://a-moody-place.com',
          'https://www.a-moody-place.com'
        ]
      : [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          'http://localhost:8080'
        ];
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// ========================================
// SESSION CONFIGURATION
// ========================================

// Session store configuration
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'localhost',
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  createDatabaseTable: true,
  clearExpired: true,
  checkExpirationInterval: 900000, // 15 minutes
  expiration: 24 * 60 * 60 * 1000, // 24 hours
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
});

// Session configuration
app.use(session({
  key: 'a-moody-place_session',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on each request
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'sessionId' // Don't use default session name
}));

// ========================================
// STATIC FILE SERVING
// ========================================

// Static files with proper caching
const staticOptions = {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '1d',
  etag: true,
  lastModified: true,
  cacheControl: true,
  immutable: process.env.NODE_ENV === 'production',
  index: false // Disable directory indexing
};

app.use('/css', express.static(path.join(__dirname, 'public/css'), staticOptions));
app.use('/js', express.static(path.join(__dirname, 'public/js'), staticOptions));
app.use('/images', express.static(path.join(__dirname, 'public/images'), staticOptions));
app.use('/audio', express.static(path.join(__dirname, 'public/audio'), staticOptions));
app.use('/static', express.static(path.join(__dirname, 'public'), staticOptions));

// Serve uploaded files with different caching strategy
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '30d' : '1h',
  etag: true,
  lastModified: true
}));

// ========================================
// HEALTH CHECK ENDPOINTS
// ========================================

// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check with database status
app.get('/health/detailed', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ========================================
// API ROUTES
// ========================================

// Apply API-specific rate limiting
app.use('/api', apiLimiter);

// Authentication endpoints get extra protection
app.use('/api/admin/login', authLimiter);
app.use('/api/admin/register', authLimiter);

// Import route handlers
// Contact form routes
try {
  const contactRoutes = require('./routes/contact');
  app.use('/api/contact', contactRoutes);
} catch (error) {
  console.warn('Contact routes not loaded:', error.message);
}

// API routes
try {
  const apiRoutes = require('./routes/api');
  app.use('/api', apiRoutes);
} catch (error) {
  console.warn('API routes not loaded - controllers may need to be implemented');
}

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json(
    ApiResponse.notFoundError('API endpoint')
  );
});

// 404 handler for general routes
app.use('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json(ApiResponse.notFoundError('API endpoint'));
  } else {
    // For web pages, you might want to render a 404 page
    res.status(404).json({
      error: 'Page not found',
      message: 'The requested page could not be found.',
      statusCode: 404
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  // Log error details
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  // Log to file in production
  if (process.env.NODE_ENV === 'production') {
    fs.appendFileSync(
      path.join(logsDir, 'error.log'),
      JSON.stringify(errorLog) + '\n'
    );
  } else {
    console.error('❌ Error:', errorLog);
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json(
      ApiResponse.validationError(err.details || [], err.message)
    );
  }

  if (err.name === 'UnauthorizedError' || err.message.includes('jwt')) {
    return res.status(401).json(
      ApiResponse.authError('Invalid or expired token')
    );
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(
      ApiResponse.error('Invalid JSON in request body', 'INVALID_JSON', 400)
    );
  }

  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json(
      ApiResponse.forbiddenError('CORS policy violation')
    );
  }

  // Default to server error
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(statusCode).json(
    ApiResponse.serverError(message, process.env.NODE_ENV === 'development' ? err.stack : null)
  );
});

// ========================================
// GRACEFUL SHUTDOWN HANDLING
// ========================================

const gracefulShutdown = () => {
  console.log('🔄 Starting graceful shutdown...');
  
  // Close session store
  if (sessionStore) {
    sessionStore.close();
  }
  
  console.log('✅ Graceful shutdown completed');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;