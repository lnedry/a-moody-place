-- ========================================
-- A MOODY PLACE DATABASE SCHEMA
-- ========================================
-- This script creates the complete database schema for the A Moody Place website
-- Run this script in MariaDB/MySQL to create all necessary tables

-- Set character set and timezone
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ========================================
-- CORE TABLES
-- ========================================

-- Songs table for music catalog
CREATE TABLE IF NOT EXISTS songs (
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
    INDEX idx_sort_order (sort_order),
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
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
    INDEX idx_slug (slug),
    FULLTEXT idx_content (title, content, excerpt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shows/Events table
CREATE TABLE IF NOT EXISTS shows (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Photo gallery table
CREATE TABLE IF NOT EXISTS photos (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contact inquiries table
CREATE TABLE IF NOT EXISTS contact_inquiries (
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
    INDEX idx_created_urgency (created_at, urgency),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
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
    INDEX idx_confirmed (confirmed_at),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Site analytics table for custom tracking
CREATE TABLE IF NOT EXISTS site_analytics (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TAGGING SYSTEM (Optional Future Expansion)
-- ========================================

-- Tags system for flexible categorization
CREATE TABLE IF NOT EXISTS tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('blog', 'music', 'show', 'photo') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_type (type),
    INDEX idx_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS taggables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_id INT NOT NULL,
    taggable_id INT NOT NULL,
    taggable_type ENUM('blog_post', 'song', 'show', 'photo') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_tagging (tag_id, taggable_id, taggable_type),
    INDEX idx_taggable (taggable_type, taggable_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- SESSION STORAGE TABLE
-- ========================================

-- Session storage for express-mysql-session
CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT UNSIGNED NOT NULL,
    data MEDIUMTEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;