# Technical Specification Document
# A Moody Place Website

**Document Version:** 1.0  
**Date:** September 2, 2025  
**Solutions Architect:** Technical Specification Lead  
**Status:** Ready for Development

---

## 1. Executive Technical Summary

### 1.1 Architecture Overview
"A Moody Place" will be built as a server-rendered web application with progressive enhancement using Alpine.js for client-side interactivity. The architecture prioritizes performance, maintainability, and scalability while supporting the artist's professional needs.

### 1.2 Technology Stack Summary
- **Backend:** Node.js + Express.js + MariaDB
- **Frontend:** Alpine.js + Modern CSS + Progressive Enhancement
- **Infrastructure:** Self-hosted Debian 12 + Nginx + Plesk
- **Security:** JWT authentication, HTTPS, input validation
- **Performance:** CDN integration, caching, image optimization

---

## 2. Database Schema Design

### 2.1 Core Tables

```sql
-- Songs table for music catalog
CREATE TABLE songs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    release_date DATE,
    duration INT, -- in seconds
    spotify_url VARCHAR(500),
    apple_music_url VARCHAR(500),
    youtube_url VARCHAR(500),
    soundcloud_url VARCHAR(500),
    audio_file_path VARCHAR(500), -- for 30-second previews
    cover_image_path VARCHAR(500),
    play_count INT DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_featured (featured),
    INDEX idx_published (is_published),
    INDEX idx_release_date (release_date),
    INDEX idx_sort_order (sort_order)
);

-- Blog posts table
CREATE TABLE blog_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content LONGTEXT NOT NULL,
    excerpt TEXT,
    featured_image_path VARCHAR(500),
    meta_title VARCHAR(60), -- SEO optimization
    meta_description VARCHAR(160), -- SEO optimization
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP NULL,
    read_time_minutes INT, -- calculated field
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_published (is_published, published_at),
    INDEX idx_featured (featured_image_path(10)),
    FULLTEXT idx_content (title, content, excerpt)
);

-- Shows/Events table
CREATE TABLE shows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state_province VARCHAR(50),
    country VARCHAR(50) NOT NULL DEFAULT 'US',
    event_date DATETIME NOT NULL,
    doors_time TIME,
    show_time TIME,
    ticket_url VARCHAR(500),
    ticket_price VARCHAR(50), -- e.g., "$15-25", "Free", "TBA"
    description TEXT,
    setlist TEXT,
    image_path VARCHAR(500),
    venue_address TEXT,
    age_restriction VARCHAR(20), -- "21+", "All Ages", etc.
    status ENUM('upcoming', 'completed', 'cancelled', 'postponed') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status_date (status, event_date),
    INDEX idx_event_date (event_date),
    INDEX idx_city (city)
);

-- Photo gallery table
CREATE TABLE photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    caption TEXT,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    medium_path VARCHAR(500), -- for grid display
    alt_text VARCHAR(255) NOT NULL, -- accessibility
    category ENUM('professional', 'performance', 'studio', 'personal', 'press') DEFAULT 'personal',
    photographer VARCHAR(255),
    photo_date DATE,
    location VARCHAR(255),
    is_featured BOOLEAN DEFAULT FALSE,
    is_press_approved BOOLEAN DEFAULT FALSE, -- can be used in press kit
    sort_order INT DEFAULT 0,
    file_size INT, -- in bytes
    dimensions VARCHAR(20), -- e.g., "1920x1080"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_featured (is_featured),
    INDEX idx_press_approved (is_press_approved),
    INDEX idx_sort_order (sort_order)
);

-- Contact inquiries table
CREATE TABLE contact_inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company_organization VARCHAR(255),
    inquiry_type ENUM('collaboration', 'booking', 'press', 'licensing', 'fan', 'general') NOT NULL,
    subject VARCHAR(255),
    message LONGTEXT NOT NULL,
    preferred_contact_method ENUM('email', 'phone') DEFAULT 'email',
    urgency ENUM('low', 'medium', 'high') DEFAULT 'medium',
    source VARCHAR(100), -- where they came from
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_responded BOOLEAN DEFAULT FALSE,
    responded_at TIMESTAMP NULL,
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_inquiry_type (inquiry_type),
    INDEX idx_responded (is_responded),
    INDEX idx_created_urgency (created_at, urgency)
);

-- Newsletter subscribers table
CREATE TABLE newsletter_subscribers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    source VARCHAR(100), -- where they signed up from
    subscriber_type ENUM('fan', 'industry', 'press') DEFAULT 'fan',
    interests JSON, -- array of interests like ["new-releases", "shows", "blog-posts"]
    is_active BOOLEAN DEFAULT TRUE,
    confirmed_at TIMESTAMP NULL,
    confirmation_token VARCHAR(100),
    unsubscribed_at TIMESTAMP NULL,
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_active (is_active),
    INDEX idx_type (subscriber_type),
    INDEX idx_confirmed (confirmed_at)
);

-- Site analytics table for custom tracking
CREATE TABLE site_analytics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100),
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    user_ip VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    event_type VARCHAR(50), -- 'pageview', 'music_play', 'download', 'form_submit'
    event_data JSON, -- flexible data for different event types
    page_load_time INT, -- milliseconds
    device_type ENUM('mobile', 'tablet', 'desktop') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session (session_id),
    INDEX idx_page_path (page_path(100)),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at),
    INDEX idx_device_type (device_type)
);

-- Admin users table
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('super_admin', 'admin', 'editor') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_active (is_active)
);
```

### 2.2 Database Relationships

```sql
-- Tags system for flexible categorization (optional future expansion)
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('blog', 'music', 'show', 'photo') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE taggables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_id INT NOT NULL,
    taggable_id INT NOT NULL,
    taggable_type ENUM('blog_post', 'song', 'show', 'photo') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tagging (tag_id, taggable_id, taggable_type),
    INDEX idx_taggable (taggable_type, taggable_id)
);
```

### 2.3 Database Configuration

```javascript
// database/config.js
const mariadb = require('mariadb');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'a-moody-place_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'a-moody-place_db',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  charset: 'utf8mb4',
  timezone: 'UTC'
};

const pool = mariadb.createPool(dbConfig);

module.exports = {
  pool,
  query: async (sql, params = []) => {
    let conn;
    try {
      conn = await pool.getConnection();
      return await conn.query(sql, params);
    } catch (err) {
      throw err;
    } finally {
      if (conn) conn.end();
    }
  }
};
```

---

## 3. API Architecture

### 3.1 RESTful API Endpoints

```javascript
// routes/api.js - Core API structure
const express = require('express');
const router = express.Router();

// ========================================
// PUBLIC API ENDPOINTS
// ========================================

// Music endpoints
GET    /api/songs              // Get all published songs with pagination
GET    /api/songs/featured     // Get featured songs
GET    /api/songs/:slug        // Get specific song details
POST   /api/songs/:id/play     // Track play event (analytics)

// Blog endpoints  
GET    /api/blog               // Get published blog posts with pagination
GET    /api/blog/featured      // Get featured blog posts
GET    /api/blog/:slug         // Get specific blog post
POST   /api/blog/:id/view      // Track view event (analytics)

// Shows endpoints
GET    /api/shows              // Get shows (upcoming by default)
GET    /api/shows/upcoming     // Get upcoming shows
GET    /api/shows/past         // Get past shows
GET    /api/shows/:id          // Get specific show details

// Gallery endpoints
GET    /api/photos             // Get photos with category filtering
GET    /api/photos/featured    // Get featured photos
GET    /api/photos/category/:category // Get photos by category

// Contact and newsletter endpoints
POST   /api/contact            // Submit contact form
POST   /api/newsletter/subscribe // Subscribe to newsletter
POST   /api/newsletter/unsubscribe // Unsubscribe from newsletter

// General endpoints
GET    /api/press-kit          // Get press kit information and download links
GET    /api/site-info          // Get general site information (social links, etc.)

// ========================================
// ADMIN API ENDPOINTS (JWT Protected)
// ========================================

// Authentication
POST   /api/admin/login        // Admin login
POST   /api/admin/logout       // Admin logout
POST   /api/admin/refresh      // Refresh JWT token

// Dashboard
GET    /api/admin/dashboard    // Get dashboard statistics and recent activity

// Song management
GET    /api/admin/songs        // Get all songs (including unpublished)
POST   /api/admin/songs        // Create new song
GET    /api/admin/songs/:id    // Get song for editing
PUT    /api/admin/songs/:id    // Update song
DELETE /api/admin/songs/:id    // Delete song
POST   /api/admin/songs/:id/toggle-featured // Toggle featured status

// Blog management
GET    /api/admin/blog         // Get all blog posts
POST   /api/admin/blog         // Create new blog post
GET    /api/admin/blog/:id     // Get blog post for editing
PUT    /api/admin/blog/:id     // Update blog post
DELETE /api/admin/blog/:id     // Delete blog post
POST   /api/admin/blog/:id/publish // Publish/unpublish blog post

// Show management
GET    /api/admin/shows        // Get all shows
POST   /api/admin/shows        // Create new show
PUT    /api/admin/shows/:id    // Update show
DELETE /api/admin/shows/:id    // Delete show

// Photo management
GET    /api/admin/photos       // Get all photos with management info
POST   /api/admin/photos       // Upload new photos
PUT    /api/admin/photos/:id   // Update photo metadata
DELETE /api/admin/photos/:id   // Delete photo
POST   /api/admin/photos/bulk-upload // Bulk photo upload

// Contact and subscriber management
GET    /api/admin/contacts     // Get contact inquiries
PUT    /api/admin/contacts/:id // Update contact inquiry (mark as responded)
DELETE /api/admin/contacts/:id // Delete contact inquiry
GET    /api/admin/subscribers  // Get newsletter subscribers
DELETE /api/admin/subscribers/:id // Remove subscriber

// Analytics
GET    /api/admin/analytics    // Get site analytics data
GET    /api/admin/analytics/summary // Get analytics summary for dashboard

module.exports = router;
```

### 3.2 Response Format Standards

```javascript
// utils/apiResponse.js
class ApiResponse {
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

  static error(message, code = 'ERROR', statusCode = 500, details = null) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  }

  static paginated(data, page, limit, total, message = null) {
    const totalPages = Math.ceil(total / limit);
    return {
      success: true,
      data: data,
      message: message,
      meta: {
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_items: parseInt(total),
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        },
        timestamp: new Date().toISOString()
      }
    };
  }
}

module.exports = ApiResponse;
```

### 3.3 API Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { query } = require('../database/config');
const ApiResponse = require('../utils/apiResponse');

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(
        ApiResponse.error('Access token required', 'AUTH_TOKEN_MISSING', 401)
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await query(
      'SELECT id, username, email, role, is_active FROM admin_users WHERE id = ? AND is_active = TRUE',
      [decoded.userId]
    );

    if (!user.length) {
      return res.status(401).json(
        ApiResponse.error('Invalid token', 'AUTH_INVALID_TOKEN', 401)
      );
    }

    req.user = user[0];
    next();
  } catch (error) {
    return res.status(401).json(
      ApiResponse.error('Invalid token', 'AUTH_INVALID_TOKEN', 401)
    );
  }
};

// middleware/validation.js
const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json(
      ApiResponse.error('Validation failed', 'VALIDATION_ERROR', 400, errors.array())
    );
  }
  next();
};

// Validation rules for contact form
const contactValidation = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Name must be 2-255 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('inquiry_type').isIn(['collaboration', 'booking', 'press', 'licensing', 'fan', 'general']).withMessage('Invalid inquiry type'),
  body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Message must be 10-5000 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required if provided')
];

module.exports = {
  authenticateAdmin,
  validateRequest,
  contactValidation
};
```

---

## 4. Frontend Architecture

### 4.1 Alpine.js Component Structure

```javascript
// js/components/musicPlayer.js
document.addEventListener('alpine:init', () => {
  Alpine.data('musicPlayer', () => ({
    currentTrack: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    isLoading: false,
    audioElement: null,

    init() {
      this.audioElement = new Audio();
      this.setupEventListeners();
    },

    setupEventListeners() {
      this.audioElement.addEventListener('loadstart', () => this.isLoading = true);
      this.audioElement.addEventListener('canplay', () => this.isLoading = false);
      this.audioElement.addEventListener('timeupdate', () => {
        this.currentTime = this.audioElement.currentTime;
        this.duration = this.audioElement.duration || 0;
      });
      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
        this.trackPlayEvent('complete');
      });
    },

    async playTrack(track) {
      if (this.currentTrack?.id === track.id && this.isPlaying) {
        this.pause();
        return;
      }

      this.currentTrack = track;
      this.audioElement.src = track.audio_file_path;
      await this.play();
      this.trackPlayEvent('start');
    },

    async play() {
      try {
        await this.audioElement.play();
        this.isPlaying = true;
      } catch (error) {
        console.error('Error playing audio:', error);
        this.isPlaying = false;
      }
    },

    pause() {
      this.audioElement.pause();
      this.isPlaying = false;
      this.trackPlayEvent('pause');
    },

    seekTo(percentage) {
      if (this.duration) {
        this.audioElement.currentTime = (percentage / 100) * this.duration;
      }
    },

    setVolume(volume) {
      this.volume = volume;
      this.audioElement.volume = volume;
    },

    async trackPlayEvent(action) {
      if (!this.currentTrack) return;
      
      try {
        await fetch('/api/songs/' + this.currentTrack.id + '/play', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: action,
            current_time: this.currentTime,
            session_id: this.getSessionId()
          })
        });
      } catch (error) {
        console.error('Error tracking play event:', error);
      }
    },

    getSessionId() {
      let sessionId = localStorage.getItem('session_id');
      if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('session_id', sessionId);
      }
      return sessionId;
    },

    formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }));
});

// js/components/photoGallery.js
document.addEventListener('alpine:init', () => {
  Alpine.data('photoGallery', () => ({
    photos: [],
    filteredPhotos: [],
    currentCategory: 'all',
    isLoading: false,
    lightboxPhoto: null,
    currentIndex: 0,

    async init() {
      await this.loadPhotos();
      this.setupKeyboardNavigation();
    },

    async loadPhotos() {
      this.isLoading = true;
      try {
        const response = await fetch('/api/photos');
        const data = await response.json();
        if (data.success) {
          this.photos = data.data;
          this.filterPhotos();
        }
      } catch (error) {
        console.error('Error loading photos:', error);
      } finally {
        this.isLoading = false;
      }
    },

    filterPhotos(category = 'all') {
      this.currentCategory = category;
      this.filteredPhotos = category === 'all' 
        ? this.photos 
        : this.photos.filter(photo => photo.category === category);
    },

    openLightbox(photo, index) {
      this.lightboxPhoto = photo;
      this.currentIndex = index;
      document.body.style.overflow = 'hidden';
    },

    closeLightbox() {
      this.lightboxPhoto = null;
      document.body.style.overflow = 'auto';
    },

    nextPhoto() {
      if (this.currentIndex < this.filteredPhotos.length - 1) {
        this.currentIndex++;
        this.lightboxPhoto = this.filteredPhotos[this.currentIndex];
      }
    },

    prevPhoto() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this.lightboxPhoto = this.filteredPhotos[this.currentIndex];
      }
    },

    setupKeyboardNavigation() {
      document.addEventListener('keydown', (e) => {
        if (!this.lightboxPhoto) return;
        
        switch (e.key) {
          case 'Escape':
            this.closeLightbox();
            break;
          case 'ArrowLeft':
            this.prevPhoto();
            break;
          case 'ArrowRight':
            this.nextPhoto();
            break;
        }
      });
    }
  }));
});

// js/components/contactForm.js
document.addEventListener('alpine:init', () => {
  Alpine.data('contactForm', () => ({
    formData: {
      name: '',
      email: '',
      phone: '',
      company_organization: '',
      inquiry_type: 'general',
      subject: '',
      message: '',
      preferred_contact_method: 'email'
    },
    isSubmitting: false,
    isSuccess: false,
    errorMessage: '',

    async submitForm() {
      if (this.isSubmitting) return;

      this.isSubmitting = true;
      this.errorMessage = '';
      
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.formData)
        });

        const data = await response.json();
        
        if (data.success) {
          this.isSuccess = true;
          this.resetForm();
        } else {
          this.errorMessage = data.error.message || 'An error occurred. Please try again.';
        }
      } catch (error) {
        this.errorMessage = 'Network error. Please check your connection and try again.';
        console.error('Contact form error:', error);
      } finally {
        this.isSubmitting = false;
      }
    },

    resetForm() {
      this.formData = {
        name: '',
        email: '',
        phone: '',
        company_organization: '',
        inquiry_type: 'general',
        subject: '',
        message: '',
        preferred_contact_method: 'email'
      };
    }
  }));
});
```

### 4.2 CSS Architecture

```css
/* css/base/variables.css */
:root {
  /* Colors */
  --color-primary: #2c3e50;
  --color-secondary: #34495e;
  --color-accent: #e74c3c;
  --color-text: #2c3e50;
  --color-text-light: #7f8c8d;
  --color-background: #ffffff;
  --color-background-light: #f8f9fa;
  --color-border: #dee2e6;
  --color-success: #27ae60;
  --color-warning: #f39c12;
  --color-error: #e74c3c;

  /* Typography */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-heading: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Font sizes */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;

  /* Layout */
  --container-max-width: 1200px;
  --container-padding: var(--space-4);
  --border-radius: 8px;
  --border-radius-sm: 4px;
  --border-radius-lg: 12px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-base: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  --transition-slow: 350ms ease;

  /* Z-index layers */
  --z-dropdown: 1000;
  --z-sticky: 1020;
  --z-fixed: 1030;
  --z-modal-backdrop: 1040;
  --z-modal: 1050;
  --z-popover: 1060;
  --z-tooltip: 1070;
}

/* css/base/reset.css */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: var(--font-primary);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--color-text);
  background-color: var(--color-background);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* css/components/music-player.css */
.music-player {
  background: var(--color-background-light);
  border-radius: var(--border-radius);
  padding: var(--space-4);
  box-shadow: var(--shadow-base);
}

.music-player__track-info {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.music-player__artwork {
  width: 60px;
  height: 60px;
  border-radius: var(--border-radius-sm);
  object-fit: cover;
}

.music-player__title {
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.music-player__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.music-player__button {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.music-player__button:hover {
  background: var(--color-secondary);
}

.music-player__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.music-player__progress {
  flex: 1;
  height: 6px;
  background: var(--color-border);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
}

.music-player__progress-fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: 3px;
  transition: width var(--transition-fast);
}

.music-player__time {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: var(--color-text-light);
}

/* Responsive design */
@media (max-width: 768px) {
  .music-player {
    padding: var(--space-3);
  }

  .music-player__artwork {
    width: 50px;
    height: 50px;
  }

  .music-player__button {
    width: 40px;
    height: 40px;
  }
}
```

### 4.3 Progressive Enhancement Strategy

```javascript
// js/core/progressiveEnhancement.js
class ProgressiveEnhancement {
  constructor() {
    this.features = {
      js: false,
      fetch: false,
      intersectionObserver: false,
      webAudio: false,
      localStorage: false
    };
    
    this.checkFeatures();
    this.applyEnhancements();
  }

  checkFeatures() {
    // JavaScript is available (this code is running)
    this.features.js = true;
    
    // Fetch API support
    this.features.fetch = typeof fetch !== 'undefined';
    
    // Intersection Observer for lazy loading
    this.features.intersectionObserver = 'IntersectionObserver' in window;
    
    // Web Audio API for advanced music features
    this.features.webAudio = 'AudioContext' in window || 'webkitAudioContext' in window;
    
    // localStorage for preferences
    this.features.localStorage = typeof Storage !== 'undefined';
  }

  applyEnhancements() {
    // Add feature classes to body for CSS targeting
    document.body.classList.add('js-enabled');
    
    Object.keys(this.features).forEach(feature => {
      if (this.features[feature]) {
        document.body.classList.add(`supports-${feature}`);
      }
    });

    // Initialize enhanced features based on support
    if (this.features.intersectionObserver) {
      this.initLazyLoading();
    }
    
    if (this.features.localStorage) {
      this.initPreferences();
    }
  }

  initLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    images.forEach(img => imageObserver.observe(img));
  }

  initPreferences() {
    // Load saved preferences
    const savedVolume = localStorage.getItem('music-volume');
    if (savedVolume) {
      document.dispatchEvent(new CustomEvent('preferences:volume', { 
        detail: { volume: parseFloat(savedVolume) } 
      }));
    }
  }
}

// Initialize progressive enhancement
document.addEventListener('DOMContentLoaded', () => {
  new ProgressiveEnhancement();
});
```

---

## 5. Security Implementation

### 5.1 Authentication System

```javascript
// auth/jwtAuth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../database/config');

class AuthSystem {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtExpiry = process.env.JWT_EXPIRY || '24h';
    this.refreshTokenExpiry = process.env.REFRESH_TOKEN_EXPIRY || '7d';
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
  }

  async hashPassword(password) {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  generateTokens(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry
    });

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  async login(username, password, ipAddress, userAgent) {
    try {
      // Check if user exists and is active
      const users = await query(
        `SELECT id, username, email, password_hash, role, is_active, 
                failed_login_attempts, locked_until 
         FROM admin_users 
         WHERE username = ? AND is_active = TRUE`,
        [username]
      );

      if (!users.length) {
        throw new Error('Invalid credentials');
      }

      const user = users[0];

      // Check if account is locked
      if (user.locked_until && new Date() < new Date(user.locked_until)) {
        throw new Error('Account temporarily locked due to failed login attempts');
      }

      // Verify password
      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        await this.handleFailedLogin(user.id);
        throw new Error('Invalid credentials');
      }

      // Reset failed attempts on successful login
      await this.resetFailedAttempts(user.id);

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Update last login
      await query(
        'UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?',
        [user.id]
      );

      // Log successful login
      await this.logAuthEvent('login_success', user.id, ipAddress, userAgent);

      return {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        tokens
      };

    } catch (error) {
      // Log failed login attempt
      await this.logAuthEvent('login_failed', null, ipAddress, userAgent, error.message);
      throw error;
    }
  }

  async handleFailedLogin(userId) {
    const result = await query(
      'UPDATE admin_users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?',
      [userId]
    );

    const user = await query(
      'SELECT failed_login_attempts FROM admin_users WHERE id = ?',
      [userId]
    );

    if (user[0].failed_login_attempts >= this.maxFailedAttempts) {
      const lockUntil = new Date(Date.now() + this.lockoutDuration);
      await query(
        'UPDATE admin_users SET locked_until = ? WHERE id = ?',
        [lockUntil, userId]
      );
    }
  }

  async resetFailedAttempts(userId) {
    await query(
      'UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?',
      [userId]
    );
  }

  async logAuthEvent(event, userId, ipAddress, userAgent, details = null) {
    await query(
      `INSERT INTO site_analytics 
       (event_type, event_data, user_ip, user_agent, created_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        event,
        JSON.stringify({ userId, details }),
        ipAddress,
        userAgent
      ]
    );
  }

  verifyToken(token) {
    return jwt.verify(token, this.jwtSecret);
  }

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const users = await query(
        'SELECT id, username, role FROM admin_users WHERE id = ? AND is_active = TRUE',
        [decoded.userId]
      );

      if (!users.length) {
        throw new Error('User not found');
      }

      const tokens = this.generateTokens(users[0]);
      return tokens;

    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
}

module.exports = new AuthSystem();
```

### 5.2 Input Validation and Security

```javascript
// security/validator.js
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');

class SecurityValidator {
  // Sanitize HTML input to prevent XSS
  sanitizeHtml(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'a'],
      ALLOWED_ATTR: ['href', 'target']
    });
  }

  // Validate and sanitize text input
  sanitizeText(text, maxLength = 1000) {
    if (typeof text !== 'string') return '';
    
    // Remove potentially dangerous characters
    let sanitized = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = validator.escape(sanitized);
    
    // Trim and limit length
    sanitized = sanitized.trim();
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  // Validate email addresses
  validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return validator.isEmail(email) && email.length <= 255;
  }

  // Validate URLs
  validateUrl(url) {
    if (!url) return true; // Allow empty URLs
    return validator.isURL(url, {
      protocols: ['http', 'https'],
      require_protocol: true
    });
  }

  // Validate file uploads
  validateFileUpload(file, allowedTypes, maxSize = 10 * 1024 * 1024) { // 10MB default
    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size exceeds limit of ${maxSize / (1024 * 1024)}MB`);
    }

    // Check file type
    if (allowedTypes && !allowedTypes.includes(file.mimetype)) {
      errors.push('Invalid file type');
    }

    // Check file extension matches MIME type
    const ext = file.originalname.split('.').pop().toLowerCase();
    const mimeToExt = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'audio/mpeg': ['mp3'],
      'audio/wav': ['wav'],
      'audio/mp4': ['m4a']
    };

    if (mimeToExt[file.mimetype] && !mimeToExt[file.mimetype].includes(ext)) {
      errors.push('File extension does not match content');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Rate limiting helper
  createRateLimit(windowMs = 15 * 60 * 1000, max = 100) { // 15 minutes, 100 requests
    const requests = new Map();

    return (req, res, next) => {
      const key = req.ip;
      const now = Date.now();
      const windowStart = now - windowMs;

      if (!requests.has(key)) {
        requests.set(key, []);
      }

      const userRequests = requests.get(key);
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= max) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later'
          }
        });
      }

      validRequests.push(now);
      requests.set(key, validRequests);
      next();
    };
  }

  // CSRF protection
  generateCSRFToken() {
    return require('crypto').randomBytes(32).toString('hex');
  }

  validateCSRFToken(token, sessionToken) {
    return token && sessionToken && token === sessionToken;
  }
}

module.exports = new SecurityValidator();

// security/middleware.js
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Security headers middleware
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"],
      connectSrc: ["'self'"],
      frameSrc: ["https://www.youtube.com", "https://open.spotify.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Rate limiting for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later'
    }
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    }
  }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 contact submissions per hour
  message: {
    success: false,
    error: {
      code: 'CONTACT_RATE_LIMIT_EXCEEDED',
      message: 'Too many contact submissions, please try again later'
    }
  }
});

module.exports = {
  securityHeaders,
  generalLimiter,
  authLimiter,
  contactLimiter
};
```

---

## 6. Server Configuration

### 6.1 Express.js Application Setup

```javascript
// app.js - Main application file
const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Security and middleware imports
const { securityHeaders, generalLimiter } = require('./security/middleware');
const ApiResponse = require('./utils/apiResponse');

// Route imports
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const publicRoutes = require('./routes/public');

const app = express();

// ========================================
// MIDDLEWARE CONFIGURATION
// ========================================

// Security headers
app.use(securityHeaders);

// Request logging
app.use(morgan('combined', {
  stream: require('fs').createWriteStream(path.join(__dirname, 'logs', 'access.log'), { flags: 'a' })
}));

// Compression
app.use(compression());

// Rate limiting
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://a-moody-place.com', 'https://www.a-moody-place.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
});

app.use(session({
  key: 'a-moody-place_session',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// Static file serving with caching
app.use('/static', express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '1d',
  etag: true,
  lastModified: true
}));

// ========================================
// ROUTES
// ========================================

// API routes
app.use('/api', apiRoutes);

// Admin routes
app.use('/admin', adminRoutes);

// Public pages
app.use('/', publicRoutes);

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json(
      ApiResponse.error('Endpoint not found', 'NOT_FOUND', 404)
    );
  } else {
    res.status(404).render('404', {
      title: 'Page Not Found - A Moody Place',
      message: 'The page you are looking for could not be found.'
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Log error details
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  };

  require('fs').appendFileSync(
    path.join(__dirname, 'logs', 'error.log'),
    JSON.stringify(errorLog) + '\n'
  );

  if (req.path.startsWith('/api/')) {
    res.status(500).json(
      ApiResponse.error(
        process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : err.message,
        'INTERNAL_ERROR',
        500
      )
    );
  } else {
    res.status(500).render('error', {
      title: 'Server Error - A Moody Place',
      message: process.env.NODE_ENV === 'production'
        ? 'Something went wrong. Please try again later.'
        : err.message
    });
  }
});

module.exports = app;

// server.js - Server startup file
const app = require('./app');
const { pool } = require('./database/config');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Test database connection
async function testDatabaseConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Database connected successfully');
    conn.end();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  
  try {
    await pool.end();
    console.log('Database connections closed');
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
  
  process.exit(0);
});

// Start server
async function startServer() {
  await testDatabaseConnection();
  
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
}

startServer().catch(console.error);
```

### 6.2 Nginx Configuration

```nginx
# /etc/nginx/sites-available/a-moody-place.com
server {
    listen 80;
    server_name a-moody-place.com www.a-moody-place.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name a-moody-place.com www.a-moody-place.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/a-moody-place.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/a-moody-place.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_types
        application/atom+xml
        application/geo+json
        application/javascript
        application/x-javascript
        application/json
        application/ld+json
        application/manifest+json
        application/rdf+xml
        application/rss+xml
        application/xhtml+xml
        application/xml
        font/eot
        font/otf
        font/ttf
        image/svg+xml
        text/css
        text/javascript
        text/plain
        text/xml;

    # File Upload Limits
    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;

    # Static Files with Caching
    location /static/ {
        alias /var/www/vhosts/a-moody-place.com/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        
        # Security for uploaded files
        location ~* \.(php|pl|py|jsp|asp|sh|cgi)$ {
            return 444;
        }
    }

    # Audio files with streaming support
    location ~* \.(mp3|wav|m4a|aac)$ {
        root /var/www/vhosts/a-moody-place.com/uploads;
        expires 1M;
        add_header Cache-Control "public";
        add_header Accept-Ranges bytes;
        
        # Enable partial content for audio streaming
        location ~ ^/(.+\.(?:mp3|wav|m4a|aac))$ {
            add_header Content-Type audio/mpeg;
            try_files $uri =404;
        }
    }

    # Images with optimization
    location ~* \.(jpg|jpeg|png|gif|ico|webp|svg)$ {
        root /var/www/vhosts/a-moody-place.com/uploads;
        expires 6M;
        add_header Cache-Control "public";
        add_header Vary "Accept-Encoding";
        
        # Try WebP first if supported
        location ~* \.(jpg|jpeg|png)$ {
            add_header Vary Accept;
            try_files $uri$webp_suffix $uri =404;
        }
    }

    # API Routes
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;

        # Rate limiting for API
        limit_req zone=api burst=20 nodelay;
    }

    # Admin Routes
    location /admin/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Stricter rate limiting for admin
        limit_req zone=admin burst=5 nodelay;
        
        # Additional security for admin
        add_header X-Frame-Options "DENY";
    }

    # All other requests to Node.js
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Security - Block access to sensitive files
    location ~ /\.(ht|git|env|svn) {
        deny all;
        return 404;
    }

    location ~ /(config|logs|node_modules)/ {
        deny all;
        return 404;
    }

    # Rate limiting zones (add to http block in nginx.conf)
    # limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    # limit_req_zone $binary_remote_addr zone=admin:10m rate=2r/m;
}

# Add to /etc/nginx/nginx.conf in http block
http {
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=admin:10m rate=2r/m;
    
    # WebP support
    map $http_accept $webp_suffix {
        "~*webp" ".webp";
    }
    
    # Other configurations...
}
```

### 6.3 Environment Configuration

```bash
# .env.example
# ========================================
# APPLICATION CONFIGURATION
# ========================================
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# ========================================
# DATABASE CONFIGURATION
# ========================================
DB_HOST=localhost
DB_USER=a-moody-place_user
DB_PASSWORD=your_secure_database_password
DB_NAME=a-moody-place_db

# ========================================
# SECURITY CONFIGURATION
# ========================================
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d
SESSION_SECRET=your_very_secure_session_secret_key_here

# ========================================
# EMAIL CONFIGURATION
# ========================================
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
FROM_EMAIL=noreply@a-moody-place.com
ADMIN_EMAIL=admin@a-moody-place.com

# ========================================
# FILE STORAGE CONFIGURATION
# ========================================
UPLOAD_PATH=/var/www/vhosts/a-moody-place.com/uploads
MAX_FILE_SIZE=50MB
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp
ALLOWED_AUDIO_TYPES=audio/mpeg,audio/wav,audio/mp4

# ========================================
# EXTERNAL SERVICES
# ========================================
# Newsletter service (e.g., Mailchimp, ConvertKit)
NEWSLETTER_API_KEY=your_newsletter_service_api_key
NEWSLETTER_LIST_ID=your_newsletter_list_id

# Analytics
GOOGLE_ANALYTICS_ID=GA_TRACKING_ID

# Social Media API Keys (if needed for automated posting)
INSTAGRAM_ACCESS_TOKEN=your_instagram_token
YOUTUBE_API_KEY=your_youtube_api_key

# ========================================
# DEVELOPMENT CONFIGURATION
# ========================================
DEBUG=false
LOG_LEVEL=info

# ========================================
# PRODUCTION OVERRIDES
# ========================================
# In production, set:
# NODE_ENV=production
# DEBUG=false
# JWT_EXPIRY=1h  (shorter for better security)
```

---

## 7. Performance Optimization

### 7.1 Caching Strategy

```javascript
// utils/cache.js
const Redis = require('ioredis');
const NodeCache = require('node-cache');

class CacheManager {
  constructor() {
    // Try Redis first, fallback to in-memory cache
    this.redisAvailable = false;
    this.memoryCache = new NodeCache({ 
      stdTTL: 600, // 10 minutes default
      checkperiod: 120 // cleanup expired keys every 2 minutes
    });

    this.initRedis();
  }

  async initRedis() {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null
      });

      await this.redis.ping();
      this.redisAvailable = true;
      console.log('✅ Redis cache connected');
    } catch (error) {
      console.log('⚠️  Redis not available, using memory cache');
      this.redisAvailable = false;
    }
  }

  async get(key) {
    try {
      if (this.redisAvailable) {
        const value = await this.redis.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.memoryCache.get(key);
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = 600) { // 10 minutes default
    try {
      if (this.redisAvailable) {
        await this.redis.setex(key, ttl, JSON.stringify(value));
      } else {
        this.memoryCache.set(key, value, ttl);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key) {
    try {
      if (this.redisAvailable) {
        await this.redis.del(key);
      } else {
        this.memoryCache.del(key);
      }
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern) {
    try {
      if (this.redisAvailable) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } else {
        // For memory cache, we need to check all keys
        const keys = this.memoryCache.keys();
        const regex = new RegExp(pattern.replace('*', '.*'));
        keys.forEach(key => {
          if (regex.test(key)) {
            this.memoryCache.del(key);
          }
        });
      }
    } catch (error) {
      console.error('Cache pattern invalidation error:', error);
    }
  }

  // Specific cache methods for common operations
  async getSongs() {
    return this.get('songs:published');
  }

  async setSongs(songs, ttl = 1800) { // 30 minutes
    await this.set('songs:published', songs, ttl);
  }

  async getBlogPosts(page = 1) {
    return this.get(`blog:posts:page:${page}`);
  }

  async setBlogPosts(posts, page = 1, ttl = 900) { // 15 minutes
    await this.set(`blog:posts:page:${page}`, posts, ttl);
  }

  async invalidateBlog() {
    await this.invalidatePattern('blog:*');
  }

  async invalidateMusic() {
    await this.invalidatePattern('songs:*');
    await this.invalidatePattern('music:*');
  }
}

module.exports = new CacheManager();

// middleware/cacheMiddleware.js
const cache = require('../utils/cache');

const cacheMiddleware = (keyGenerator, ttl = 600) => {
  return async (req, res, next) => {
    try {
      const cacheKey = typeof keyGenerator === 'function' 
        ? keyGenerator(req) 
        : keyGenerator;

      const cachedData = await cache.get(cacheKey);
      
      if (cachedData) {
        // Add cache headers
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', `public, max-age=${ttl}`);
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data) {
        res.set('X-Cache', 'MISS');
        res.set('Cache-Control', `public, max-age=${ttl}`);
        
        // Cache successful responses only
        if (data && data.success) {
          cache.set(cacheKey, data, ttl).catch(console.error);
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Example usage in routes
const songsCacheMiddleware = cacheMiddleware(
  (req) => `songs:${req.query.category || 'all'}:${req.query.page || 1}`,
  1800 // 30 minutes
);

module.exports = { cacheMiddleware, songsCacheMiddleware };
```

### 7.2 Image Optimization

```javascript
// utils/imageProcessor.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class ImageProcessor {
  constructor() {
    this.sizes = {
      thumbnail: { width: 300, height: 300, quality: 80 },
      medium: { width: 800, height: 600, quality: 85 },
      large: { width: 1200, height: 900, quality: 90 },
      hero: { width: 1920, height: 1080, quality: 85 }
    };

    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
  }

  async processImage(inputPath, filename) {
    const results = {};
    const nameWithoutExt = path.parse(filename).name;
    const webpSupported = true; // Enable WebP conversion

    try {
      // Get image metadata
      const metadata = await sharp(inputPath).metadata();
      
      // Process each size variant
      for (const [sizeName, config] of Object.entries(this.sizes)) {
        const outputDir = path.join(this.uploadPath, 'images', sizeName);
        await fs.mkdir(outputDir, { recursive: true });

        // Calculate dimensions maintaining aspect ratio
        const { width: targetWidth, height: targetHeight } = this.calculateDimensions(
          metadata.width, 
          metadata.height, 
          config.width, 
          config.height
        );

        // Generate JPEG version
        const jpegFilename = `${nameWithoutExt}-${sizeName}.jpg`;
        const jpegPath = path.join(outputDir, jpegFilename);
        
        await sharp(inputPath)
          .resize(targetWidth, targetHeight, {
            fit: 'cover',
            position: 'center'
          })
          .jpeg({ 
            quality: config.quality,
            progressive: true,
            mozjpeg: true
          })
          .toFile(jpegPath);

        results[sizeName] = {
          jpeg: `/static/images/${sizeName}/${jpegFilename}`,
          dimensions: { width: targetWidth, height: targetHeight }
        };

        // Generate WebP version if supported
        if (webpSupported) {
          const webpFilename = `${nameWithoutExt}-${sizeName}.webp`;
          const webpPath = path.join(outputDir, webpFilename);
          
          await sharp(inputPath)
            .resize(targetWidth, targetHeight, {
              fit: 'cover',
              position: 'center'
            })
            .webp({ 
              quality: config.quality,
              effort: 4
            })
            .toFile(webpPath);

          results[sizeName].webp = `/static/images/${sizeName}/${webpFilename}`;
        }
      }

      return results;
    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }

  calculateDimensions(originalWidth, originalHeight, targetWidth, targetHeight) {
    const aspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    if (aspectRatio > targetAspectRatio) {
      // Original is wider, fit by height
      return {
        width: Math.round(targetHeight * aspectRatio),
        height: targetHeight
      };
    } else {
      // Original is taller, fit by width
      return {
        width: targetWidth,
        height: Math.round(targetWidth / aspectRatio)
      };
    }
  }

  generateResponsiveImageHtml(imageName, alt, sizes = {}) {
    const defaultSizes = {
      thumbnail: '300px',
      medium: '800px',
      large: '1200px'
    };

    const imageSizes = { ...defaultSizes, ...sizes };
    
    let srcset = [];
    let webpSrcset = [];
    
    Object.entries(imageSizes).forEach(([size, width]) => {
      srcset.push(`/static/images/${size}/${imageName}-${size}.jpg ${width.replace('px', 'w')}`);
      webpSrcset.push(`/static/images/${size}/${imageName}-${size}.webp ${width.replace('px', 'w')}`);
    });

    return `
      <picture>
        <source type="image/webp" srcset="${webpSrcset.join(', ')}" sizes="${Object.values(imageSizes).join(', ')}">
        <img src="/static/images/medium/${imageName}-medium.jpg" 
             srcset="${srcset.join(', ')}" 
             sizes="${Object.values(imageSizes).join(', ')}"
             alt="${alt}" 
             loading="lazy">
      </picture>
    `.trim();
  }
}

module.exports = new ImageProcessor();
```

---

## 8. Development Guidelines

### 8.1 File Structure

```
/Users/larry/AI_Projects/a-moody-place/
├── server.js                 # Application entry point
├── app.js                    # Express app configuration
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── README.md                # Project documentation
│
├── config/                  # Configuration files
│   ├── database.js          # Database configuration
│   ├── email.js             # Email service configuration
│   └── storage.js           # File storage configuration
│
├── database/                # Database related files
│   ├── config.js            # Database connection
│   ├── migrations/          # Database migrations
│   └── seeds/               # Database seed data
│
├── routes/                  # Route handlers
│   ├── api.js               # API routes
│   ├── admin.js             # Admin routes
│   └── public.js            # Public page routes
│
├── controllers/             # Business logic controllers
│   ├── songController.js    # Music-related logic
│   ├── blogController.js    # Blog-related logic
│   ├── contactController.js # Contact form logic
│   └── adminController.js   # Admin panel logic
│
├── middleware/              # Custom middleware
│   ├── auth.js              # Authentication middleware
│   ├── validation.js        # Input validation
│   ├── upload.js            # File upload handling
│   └── cache.js             # Caching middleware
│
├── models/                  # Data models
│   ├── Song.js              # Song data model
│   ├── BlogPost.js          # Blog post data model
│   ├── Photo.js             # Photo data model
│   └── Contact.js           # Contact inquiry model
│
├── services/                # Business logic services
│   ├── emailService.js      # Email sending service
│   ├── analyticsService.js  # Analytics tracking
│   └── mediaService.js      # File processing service
│
├── utils/                   # Utility functions
│   ├── apiResponse.js       # Standardized API responses
│   ├── cache.js             # Caching utilities
│   ├── imageProcessor.js    # Image processing
│   └── validators.js        # Input validation helpers
│
├── security/                # Security-related files
│   ├── auth.js              # Authentication logic
│   ├── middleware.js        # Security middleware
│   └── validator.js         # Security validation
│
├── public/                  # Static frontend files
│   ├── css/                 # Stylesheets
│   │   ├── base/            # Base styles (reset, variables)
│   │   ├── components/      # Component styles
│   │   ├── pages/           # Page-specific styles
│   │   └── main.css         # Main stylesheet
│   │
│   ├── js/                  # Client-side JavaScript
│   │   ├── components/      # Alpine.js components
│   │   ├── utils/           # Utility functions
│   │   └── main.js          # Main JavaScript file
│   │
│   ├── images/              # Static images
│   └── fonts/               # Web fonts
│
├── uploads/                 # User-uploaded files
│   ├── audio/               # Music files
│   ├── images/              # Photo uploads
│   │   ├── thumbnail/       # Thumbnail versions
│   │   ├── medium/          # Medium versions
│   │   └── large/           # Large versions
│   └── documents/           # Press kit files
│
├── views/                   # Server-side templates (if using)
│   ├── layouts/             # Page layouts
│   ├── pages/               # Page templates
│   ├── components/          # Reusable components
│   └── admin/               # Admin panel templates
│
├── tests/                   # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
│
├── logs/                    # Application logs
│   ├── access.log           # Access logs
│   ├── error.log            # Error logs
│   └── debug.log            # Debug logs
│
└── docs/                    # Project documentation
    ├── api.md               # API documentation
    ├── deployment.md        # Deployment guide
    └── development.md       # Development guide
```

### 8.2 Package.json Configuration

```json
{
  "name": "a-moody-place",
  "version": "1.0.0",
  "description": "Official website for musician 'Mood' - A comprehensive artist platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "npm run build:css && npm run build:js",
    "build:css": "postcss public/css/main.css -o public/dist/main.min.css --env production",
    "build:js": "esbuild public/js/main.js --bundle --minify --outfile=public/dist/main.min.js",
    "watch:css": "postcss public/css/main.css -o public/dist/main.css --watch",
    "watch:js": "esbuild public/js/main.js --bundle --outfile=public/dist/main.js --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .js --ignore-pattern public/dist/",
    "lint:fix": "eslint . --ext .js --ignore-pattern public/dist/ --fix",
    "db:migrate": "node database/migrate.js",
    "db:seed": "node database/seed.js",
    "db:reset": "npm run db:migrate && npm run db:seed",
    "logs:clear": "rm -f logs/*.log",
    "deploy:production": "rsync -avz --exclude node_modules . production-server:/var/www/vhosts/a-moody-place.com/"
  },
  "keywords": [
    "music",
    "artist-website",
    "portfolio",
    "express",
    "alpine-js"
  ],
  "author": "A Moody Place Development Team",
  "license": "UNLICENSED",
  "private": true,
  "engines": {
    "node": ">=22.0.0",
    "npm": ">=10.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mariadb": "^3.2.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "express-validator": "^7.0.1",
    "express-rate-limit": "^6.8.1",
    "helmet": "^7.0.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "express-session": "^1.17.3",
    "express-mysql-session": "^2.1.8",
    "multer": "^1.4.5-lts.1",
    "sharp": "^0.32.4",
    "nodemailer": "^6.9.4",
    "ioredis": "^5.3.2",
    "node-cache": "^5.1.2",
    "validator": "^13.11.0",
    "isomorphic-dompurify": "^2.11.0",
    "alpinejs": "^3.13.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.2",
    "supertest": "^6.3.3",
    "eslint": "^8.46.0",
    "eslint-config-standard": "^17.1.0",
    "postcss": "^8.4.27",
    "postcss-cli": "^10.1.0",
    "autoprefixer": "^10.4.14",
    "postcss-import": "^15.1.0",
    "postcss-nesting": "^12.0.1",
    "esbuild": "^0.18.17",
    "cssnano": "^6.0.1"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "tests/coverage",
    "collectCoverageFrom": [
      "controllers/**/*.js",
      "models/**/*.js",
      "services/**/*.js",
      "utils/**/*.js",
      "!tests/**"
    ]
  },
  "nodemonConfig": {
    "watch": [
      "server.js",
      "app.js",
      "routes/",
      "controllers/",
      "middleware/",
      "models/",
      "services/",
      "utils/"
    ],
    "ext": "js,json",
    "env": {
      "NODE_ENV": "development"
    }
  }
}
```

---

## 9. Critical Implementation Notes

### 9.1 Security Priorities
1. **Input Validation**: All user inputs must be validated and sanitized
2. **SQL Injection Prevention**: Use parameterized queries exclusively
3. **XSS Protection**: Implement Content Security Policy and input sanitization
4. **Authentication**: JWT tokens with short expiry, secure password hashing
5. **Rate Limiting**: Protect against abuse and DDoS attacks
6. **HTTPS**: Enforce HTTPS with proper SSL configuration

### 9.2 Performance Requirements
1. **Page Load Speed**: < 3 seconds on 4G mobile connection
2. **Core Web Vitals**: LCP < 2.5s, FID < 100ms, CLS < 0.1
3. **Image Optimization**: WebP format with fallbacks, lazy loading
4. **Caching**: Multi-layer caching strategy (browser, CDN, application, database)
5. **Database Optimization**: Proper indexing, query optimization

### 9.3 Accessibility Standards
1. **WCAG 2.1 AA Compliance**: Semantic HTML, proper ARIA labels
2. **Keyboard Navigation**: Full functionality without mouse
3. **Screen Reader Support**: Proper heading structure, alt text for images
4. **Color Contrast**: Minimum 4.5:1 ratio for normal text
5. **Focus Indicators**: Visible focus states for all interactive elements

### 9.4 Browser Support
- **Desktop**: Chrome 110+, Firefox 108+, Safari 16+, Edge 110+
- **Mobile**: Chrome Mobile 110+, Safari iOS 16+, Firefox Mobile 108+
- **Progressive Enhancement**: Core functionality works without JavaScript

### 9.5 Development Best Practices
1. **Code Quality**: ESLint configuration, consistent formatting
2. **Testing**: Unit tests for business logic, integration tests for APIs
3. **Documentation**: Inline comments, API documentation, README files
4. **Version Control**: Meaningful commit messages, feature branches
5. **Error Handling**: Comprehensive error logging and user-friendly error messages

---

## 10. Next Steps

### 10.1 Immediate Actions Required
1. **Environment Setup**: Create `.env` file with database and security credentials
2. **Database Creation**: Run database schema creation scripts
3. **Dependencies Installation**: `npm install` to install all required packages
4. **SSL Certificate**: Configure Let's Encrypt certificate for HTTPS
5. **Nginx Configuration**: Set up reverse proxy and static file serving

### 10.2 Development Priorities
1. **Database Implementation**: Create and populate initial database schema
2. **API Development**: Build core API endpoints for songs, blog, contact
3. **Frontend Components**: Implement Alpine.js components for music player and forms
4. **Admin Authentication**: Set up secure admin login system
5. **Content Management**: Build admin interfaces for managing content

### 10.3 Testing and Validation
1. **Cross-browser Testing**: Verify functionality across target browsers
2. **Performance Testing**: Validate Core Web Vitals requirements
3. **Security Audit**: Test authentication, input validation, and access controls
4. **Accessibility Testing**: Screen reader testing and keyboard navigation
5. **Mobile Testing**: Responsive design validation on various devices

This technical specification provides the comprehensive foundation needed to begin development of "A Moody Place" website. All critical technical decisions have been documented with specific implementation examples, ensuring development can proceed efficiently while maintaining high standards for security, performance, and user experience.

---

**Document Status**: Ready for Development  
**Review Required**: Database schema validation, security configuration review  
**Dependencies**: MariaDB server, Node.js 22+, Nginx, SSL certificate