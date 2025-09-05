# A Moody Place - Artist Website

A comprehensive artist website and music platform built with Node.js, Express, MariaDB, and Alpine.js. This project provides a complete infrastructure for an independent musician to showcase their work, manage content, and engage with fans.

## 🎵 Features

### Public Website
- **Music Catalog**: Display songs with streaming links, descriptions, and play tracking
- **Blog System**: Rich content management for artist updates and stories  
- **Show Listings**: Concert calendar with venue information and ticket links
- **Photo Gallery**: Organized media with categories (performance, studio, press, etc.)
- **Contact System**: Professional inquiry management with categorization
- **Newsletter**: Subscriber management with confirmation and preferences

### Admin Dashboard
- **Content Management**: Full CRUD operations for songs, blog posts, shows, and photos
- **File Upload**: Secure image and audio file handling with automatic optimization
- **Analytics**: Track plays, views, and visitor behavior
- **User Management**: Role-based access control (Super Admin, Admin, Editor)
- **Security**: JWT authentication, rate limiting, and audit logging

### Technical Features
- **Security**: Comprehensive protection against XSS, CSRF, and injection attacks
- **Performance**: Caching layers, image optimization, and CDN-ready
- **Monitoring**: Health checks, logging, and automated recovery
- **Deployment**: Production-ready with Nginx, SSL, and systemd integration

## 🛠 Technology Stack

- **Backend**: Node.js 22+, Express.js
- **Database**: MariaDB 10.11+ with connection pooling
- **Frontend**: Alpine.js for progressive enhancement
- **Security**: JWT, bcrypt, helmet, rate limiting
- **Infrastructure**: Nginx reverse proxy, SSL/HTTPS, systemd service
- **Monitoring**: Structured logging, health checks, automated backups

## 🚀 Quick Start

### Prerequisites
- Node.js 22.0.0 or higher
- MariaDB 10.11 or higher
- Nginx (for production)
- SSL certificate (Let's Encrypt recommended)

### Development Setup

1. **Clone and install**
   ```bash
   git clone <repository-url> a-moody-place
   cd a-moody-place
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Set up database**
   ```bash
   # Create database and user in MariaDB
   sudo mysql -u root -p
   CREATE DATABASE a-moody-place_db CHARACTER SET utf8mb4;
   CREATE USER 'a-moody-place_user'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON a-moody-place_db.* TO 'a-moody-place_user'@'localhost';
   
   # Run migrations and seed data
   npm run db:migrate
   npm run db:seed
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to see the application.

### Production Deployment

For production deployment on Debian 12:

```bash
# Use the automated deployment script
sudo ./scripts/deploy.sh production
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 📁 Project Structure

```
a-moody-place/
├── server.js                 # Application entry point
├── app.js                    # Express configuration
├── package.json              # Dependencies
├── .env.example              # Environment template
│
├── config/                   # Server configurations
│   ├── nginx-a-moody-place.conf
│   ├── a-moody-place.service
│   └── logrotate-a-moody-place
│
├── database/                 # Database management
│   ├── config.js            # Connection and utilities
│   ├── schema.sql           # Complete database schema
│   ├── migrate.js           # Migration script
│   └── seed.js              # Sample data seeding
│
├── routes/                   # API route definitions
│   └── api.js               # Main API routes
│
├── controllers/              # Business logic (to be implemented)
├── middleware/               # Custom middleware
│   ├── auth.js              # Authentication & authorization
│   └── validation.js        # Input validation & sanitization
│
├── models/                   # Data models (to be implemented)
├── services/                 # External services (to be implemented)
├── security/                 # Security implementations
│   └── auth.js              # JWT & password management
│
├── utils/                    # Utility modules
│   ├── apiResponse.js       # Standardized API responses
│   └── logger.js            # Comprehensive logging
│
├── public/                   # Static frontend files
├── uploads/                  # User-uploaded content
├── logs/                     # Application logs
└── scripts/                  # Deployment & maintenance
    ├── deploy.sh            # Production deployment
    └── health-check.sh      # System monitoring
```

## 🔧 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build production assets
- `npm test` - Run test suite
- `npm run lint` - Run code linting
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:reset` - Reset database (migrate + seed)

### Database Operations

```bash
# Create new migration
node database/migrate.js

# Seed development data
node database/seed.js

# Backup database
mysqldump -u a-moody-place_user -p a-moody-place_db > backup.sql

# Restore database
mysql -u a-moody-place_user -p a-moody-place_db < backup.sql
```

### API Endpoints

#### Public Endpoints
- `GET /api/songs` - Get published songs
- `GET /api/songs/featured` - Get featured songs
- `GET /api/songs/:slug` - Get song by slug
- `GET /api/blog` - Get published blog posts
- `GET /api/blog/:slug` - Get blog post by slug
- `GET /api/shows` - Get shows
- `GET /api/shows/upcoming` - Get upcoming shows
- `GET /api/photos` - Get photos
- `POST /api/contact` - Submit contact form
- `POST /api/newsletter/subscribe` - Subscribe to newsletter

#### Admin Endpoints (JWT Protected)
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/dashboard` - Dashboard statistics
- `POST /api/admin/songs` - Create song
- `PUT /api/admin/songs/:id` - Update song
- `DELETE /api/admin/songs/:id` - Delete song
- Similar CRUD operations for blog, shows, photos, etc.

### Authentication

The system uses JWT (JSON Web Tokens) for authentication:

1. **Login**: POST to `/api/admin/login` with username/email and password
2. **Token**: Include JWT in Authorization header: `Bearer <token>`
3. **Refresh**: Use `/api/admin/refresh` to get new tokens
4. **Roles**: Super Admin, Admin, Editor with different permissions

### Security Features

- **Input Validation**: Comprehensive validation and sanitization
- **Rate Limiting**: Configurable limits per endpoint type
- **Authentication**: JWT with refresh tokens and session management
- **Authorization**: Role-based access control
- **Security Headers**: Helmet.js with strict CSP
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization and CSP
- **HTTPS Enforcement**: SSL/TLS encryption

## 📊 Monitoring & Maintenance

### Health Checks

```bash
# Manual health check
./scripts/health-check.sh --verbose

# Auto-fix issues
./scripts/health-check.sh --fix

# Silent mode (cron-friendly)
./scripts/health-check.sh --silent
```

### Logs

```bash
# Application logs
tail -f logs/app.log
tail -f logs/error.log
tail -f logs/security.log

# System logs
journalctl -u a-moody-place -f

# Nginx logs
tail -f /var/log/nginx/a-moody-place-access.log
```

### Performance Monitoring

The application includes built-in performance monitoring:

- Request/response time tracking
- Database query performance
- Memory and CPU usage alerts
- Disk space monitoring
- SSL certificate expiration warnings

## 🔒 Security

### Security Measures Implemented

1. **Authentication & Authorization**
   - JWT with secure token generation
   - Password hashing with bcrypt (12 rounds)
   - Account lockout after failed attempts
   - Role-based permissions

2. **Input Protection**
   - Comprehensive input validation
   - SQL injection prevention
   - XSS protection with content sanitization
   - File upload security with type validation

3. **Network Security**
   - Rate limiting per endpoint
   - HTTPS enforcement
   - Security headers (HSTS, CSP, etc.)
   - IP-based restrictions

4. **Data Protection**
   - Sensitive data encryption
   - Secure session management
   - GDPR-compliant data handling
   - Regular security logging

### Security Best Practices

- Keep dependencies updated
- Regular security audits
- Monitor logs for suspicious activity
- Use strong passwords and secrets
- Enable two-factor authentication (planned)
- Regular backups with encryption

## 🚀 Performance

### Optimization Features

- **Caching**: Multi-layer caching strategy
- **Image Optimization**: WebP conversion with fallbacks
- **Database**: Optimized queries and indexing
- **Compression**: Gzip/Brotli compression
- **CDN Ready**: Static asset optimization
- **Lazy Loading**: Progressive image loading

### Performance Monitoring

- Core Web Vitals tracking
- Database query performance
- API response time monitoring
- Resource usage alerts

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- ESLint configuration for consistent code style
- JSDoc comments for functions
- Comprehensive error handling
- Security-first development practices

## 📝 License

This project is proprietary and confidential. All rights reserved.

## 📞 Support

For deployment issues or questions:

1. Check the [DEPLOYMENT.md](DEPLOYMENT.md) guide
2. Review application logs
3. Run health checks
4. Check server resources and configurations

## 🔄 Planned Features

### Phase 2 Enhancements
- **E-commerce**: Merchandise and digital downloads
- **Fan Engagement**: Comments, ratings, and user profiles  
- **Social Integration**: Automated social media posting
- **Advanced Analytics**: Detailed visitor and engagement tracking
- **Email Marketing**: Advanced newsletter campaigns
- **Mobile App**: Companion iOS/Android application

### Technical Improvements  
- **GraphQL API**: Alternative to REST endpoints
- **Real-time Features**: WebSocket integration for live updates
- **Search**: Full-text search across all content
- **Internationalization**: Multi-language support
- **Progressive Web App**: Offline functionality and app-like experience

---

**A Moody Place** - Professional artist website platform built with modern web technologies and security best practices.