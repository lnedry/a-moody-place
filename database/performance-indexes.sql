-- ========================================
-- PERFORMANCE OPTIMIZATION INDEXES
-- ========================================
-- Additional indexes for optimizing query performance
-- Run this after the main schema to add performance-specific indexes

-- Performance optimization for songs table
DROP INDEX IF EXISTS idx_songs_performance_composite ON songs;
CREATE INDEX idx_songs_performance_composite ON songs (is_published, featured, sort_order, release_date DESC);

DROP INDEX IF EXISTS idx_songs_play_count ON songs;
CREATE INDEX idx_songs_play_count ON songs (play_count DESC);

-- Performance optimization for blog_posts table
DROP INDEX IF EXISTS idx_blog_performance_composite ON blog_posts;
CREATE INDEX idx_blog_performance_composite ON blog_posts (status, is_featured, published_at DESC);

DROP INDEX IF EXISTS idx_blog_slug_status ON blog_posts;
CREATE INDEX idx_blog_slug_status ON blog_posts (slug, status);

-- Performance optimization for shows table
DROP INDEX IF EXISTS idx_shows_performance_composite ON shows;
CREATE INDEX idx_shows_performance_composite ON shows (status, show_date ASC, is_featured);

DROP INDEX IF EXISTS idx_shows_date_range ON shows;
CREATE INDEX idx_shows_date_range ON shows (show_date ASC, status);

-- Performance optimization for photos table
DROP INDEX IF EXISTS idx_photos_performance_composite ON photos;
CREATE INDEX idx_photos_performance_composite ON photos (is_featured, category, sort_order);

DROP INDEX IF EXISTS idx_photos_category_published ON photos;
CREATE INDEX idx_photos_category_published ON photos (category, is_published, created_at DESC);

-- Performance optimization for contact_inquiries table
DROP INDEX IF EXISTS idx_contact_performance ON contact_inquiries;
CREATE INDEX idx_contact_performance ON contact_inquiries (status, inquiry_type, created_at DESC);

DROP INDEX IF EXISTS idx_contact_email_date ON contact_inquiries;
CREATE INDEX idx_contact_email_date ON contact_inquiries (email, created_at DESC);

-- Performance optimization for newsletter_subscribers table
DROP INDEX IF EXISTS idx_newsletter_status_date ON newsletter_subscribers;
CREATE INDEX idx_newsletter_status_date ON newsletter_subscribers (status, subscribed_at DESC);

DROP INDEX IF EXISTS idx_newsletter_source ON newsletter_subscribers;
CREATE INDEX idx_newsletter_source ON newsletter_subscribers (source, status);

-- ========================================
-- QUERY OPTIMIZATION VIEWS
-- ========================================

-- Create optimized view for published songs with play counts
CREATE OR REPLACE VIEW vw_published_songs AS
SELECT 
    id,
    title,
    slug,
    description,
    release_date,
    duration,
    spotify_url,
    apple_music_url,
    youtube_url,
    soundcloud_url,
    audio_file_path,
    cover_image_path,
    play_count,
    featured,
    sort_order,
    created_at,
    updated_at
FROM songs 
WHERE is_published = TRUE
ORDER BY sort_order ASC, release_date DESC;

-- Create view for featured content across all types
CREATE OR REPLACE VIEW vw_featured_content AS
SELECT 
    'song' AS content_type,
    id,
    title,
    slug,
    created_at,
    cover_image_path AS image_path,
    featured,
    NULL AS show_date,
    NULL AS category
FROM songs 
WHERE is_published = TRUE AND featured = TRUE

UNION ALL

SELECT 
    'blog' AS content_type,
    id,
    title,
    slug,
    created_at,
    featured_image_path AS image_path,
    is_featured AS featured,
    NULL AS show_date,
    NULL AS category
FROM blog_posts 
WHERE status = 'published' AND is_featured = TRUE

UNION ALL

SELECT 
    'show' AS content_type,
    id,
    title,
    slug,
    created_at,
    poster_image_path AS image_path,
    is_featured AS featured,
    show_date,
    NULL AS category
FROM shows 
WHERE status = 'confirmed' AND is_featured = TRUE

UNION ALL

SELECT 
    'photo' AS content_type,
    id,
    title,
    slug,
    created_at,
    file_path AS image_path,
    is_featured AS featured,
    NULL AS show_date,
    category
FROM photos 
WHERE is_published = TRUE AND is_featured = TRUE

ORDER BY created_at DESC;

-- Create view for recent activity
CREATE OR REPLACE VIEW vw_recent_activity AS
SELECT 
    'new_song' AS activity_type,
    id,
    title,
    slug,
    created_at AS activity_date,
    cover_image_path AS image_path
FROM songs 
WHERE is_published = TRUE 
    AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)

UNION ALL

SELECT 
    'new_blog_post' AS activity_type,
    id,
    title,
    slug,
    published_at AS activity_date,
    featured_image_path AS image_path
FROM blog_posts 
WHERE status = 'published' 
    AND published_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)

UNION ALL

SELECT 
    'upcoming_show' AS activity_type,
    id,
    title,
    slug,
    show_date AS activity_date,
    poster_image_path AS image_path
FROM shows 
WHERE status IN ('confirmed', 'on_sale') 
    AND show_date >= NOW()
    AND show_date <= DATE_ADD(NOW(), INTERVAL 60 DAY)

ORDER BY activity_date DESC
LIMIT 10;

-- ========================================
-- PERFORMANCE MONITORING QUERIES
-- ========================================

-- Query to identify slow queries and table performance
-- Run these periodically to monitor database performance

-- Check table sizes
SELECT 
    TABLE_NAME as 'Table',
    ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) as 'Size (MB)',
    ROUND((DATA_LENGTH / 1024 / 1024), 2) as 'Data (MB)',
    ROUND((INDEX_LENGTH / 1024 / 1024), 2) as 'Index (MB)',
    TABLE_ROWS as 'Rows'
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;

-- Check index usage efficiency
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    INDEX_NAME,
    CARDINALITY,
    SUB_PART,
    PACKED,
    NULLABLE,
    INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME, CARDINALITY DESC;

-- ========================================
-- CACHE-FRIENDLY STORED PROCEDURES
-- ========================================

-- Stored procedure for getting homepage content (frequently accessed)
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_get_homepage_content()
BEGIN
    -- Get featured songs
    SELECT 
        'featured_songs' AS section,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'title', title,
                'slug', slug,
                'release_date', release_date,
                'cover_image_path', cover_image_path,
                'spotify_url', spotify_url,
                'apple_music_url', apple_music_url,
                'play_count', play_count
            )
        ) AS content
    FROM songs 
    WHERE is_published = TRUE AND featured = TRUE
    ORDER BY sort_order ASC, release_date DESC
    LIMIT 3;
    
    -- Get recent blog posts
    SELECT 
        'recent_blog_posts' AS section,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'title', title,
                'slug', slug,
                'excerpt', excerpt,
                'featured_image_path', featured_image_path,
                'published_at', published_at
            )
        ) AS content
    FROM blog_posts 
    WHERE status = 'published'
    ORDER BY published_at DESC
    LIMIT 2;
    
    -- Get upcoming shows
    SELECT 
        'upcoming_shows' AS section,
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'id', id,
                'title', title,
                'slug', slug,
                'venue_name', venue_name,
                'show_date', show_date,
                'ticket_url', ticket_url,
                'status', status
            )
        ) AS content
    FROM shows 
    WHERE status IN ('confirmed', 'on_sale') 
        AND show_date >= NOW()
    ORDER BY show_date ASC
    LIMIT 3;
END //
DELIMITER ;

-- Stored procedure for music page content
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_get_music_content()
BEGIN
    SELECT 
        id,
        title,
        slug,
        description,
        release_date,
        duration,
        spotify_url,
        apple_music_url,
        youtube_url,
        soundcloud_url,
        audio_file_path,
        cover_image_path,
        play_count,
        featured
    FROM songs 
    WHERE is_published = TRUE
    ORDER BY sort_order ASC, release_date DESC;
END //
DELIMITER ;

-- ========================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- ========================================

-- Optimize MySQL settings for performance
SET GLOBAL innodb_buffer_pool_size = 128 * 1024 * 1024; -- 128MB for small server
SET GLOBAL query_cache_size = 16 * 1024 * 1024; -- 16MB query cache
SET GLOBAL query_cache_type = 1; -- Enable query cache
SET GLOBAL tmp_table_size = 32 * 1024 * 1024; -- 32MB temp tables
SET GLOBAL max_heap_table_size = 32 * 1024 * 1024; -- 32MB heap tables

-- ========================================
-- MAINTENANCE PROCEDURES
-- ========================================

-- Stored procedure for updating play counts efficiently
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_increment_play_count(IN song_id INT)
BEGIN
    UPDATE songs 
    SET play_count = play_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = song_id AND is_published = TRUE;
END //
DELIMITER ;

-- Stored procedure for cleaning up old analytics data
DELIMITER //
CREATE OR REPLACE PROCEDURE sp_cleanup_old_data()
BEGIN
    -- Clean up old contact inquiries (keep for 1 year)
    DELETE FROM contact_inquiries 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
        AND status = 'resolved';
    
    -- Clean up old unconfirmed newsletter subscribers (keep for 30 days)
    DELETE FROM newsletter_subscribers 
    WHERE status = 'pending'
        AND subscribed_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Archive old blog posts view counts if needed
    -- This would be implemented based on analytics requirements
    
    SELECT 'Cleanup completed' AS status;
END //
DELIMITER ;

-- ========================================
-- MONITORING AND ALERTS
-- ========================================

-- Create table for performance monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_name_date (metric_name, recorded_at),
    INDEX idx_recorded_at (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;