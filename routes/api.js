/**
 * API Routes for A Moody Place
 * 
 * This file defines all public and admin API endpoints for the website.
 * Includes authentication, content management, and public data access routes.
 */

const express = require('express');
const router = express.Router();

// Middleware imports
const { authenticateAdmin, requireAdmin, requireEditor, logAuthEvent } = require('../middleware/auth');
const { 
  handleValidationErrors,
  loginValidation,
  registerValidation,
  contactValidation,
  newsletterSubscriptionValidation,
  songValidation,
  blogPostValidation,
  showValidation,
  idParamValidation,
  slugParamValidation,
  paginationValidation
} = require('../middleware/validation');

// Controller imports (will be created)
const authController = require('../controllers/authController');
const songController = require('../controllers/songController');
const blogController = require('../controllers/blogController');
const showController = require('../controllers/showController');
const photoController = require('../controllers/photoController');
const contactController = require('../controllers/contactController');
const analyticsController = require('../controllers/analyticsController');

// Import API response utility
const ApiResponse = require('../utils/apiResponse');

// ========================================
// PUBLIC API ENDPOINTS
// ========================================

// Health check endpoint
router.get('/health', (req, res) => {
  res.json(ApiResponse.success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  }, 'API is running'));
});

// ========================================
// MUSIC ENDPOINTS
// ========================================

// Get all published songs with pagination
router.get('/songs', 
  paginationValidation,
  handleValidationErrors,
  songController.getPublishedSongs
);

// Get featured songs
router.get('/songs/featured', songController.getFeaturedSongs);

// Get specific song by slug
router.get('/songs/:slug',
  slugParamValidation,
  handleValidationErrors,
  songController.getSongBySlug
);

// Track song play event (for analytics)
router.post('/songs/:id/play',
  idParamValidation,
  handleValidationErrors,
  songController.trackPlayEvent
);

// ========================================
// BLOG ENDPOINTS
// ========================================

// Get published blog posts with pagination
router.get('/blog',
  paginationValidation,
  handleValidationErrors,
  blogController.getPublishedPosts
);

// Get featured blog posts
router.get('/blog/featured', blogController.getFeaturedPosts);

// Get specific blog post by slug
router.get('/blog/:slug',
  slugParamValidation,
  handleValidationErrors,
  blogController.getPostBySlug
);

// Track blog post view (for analytics)
router.post('/blog/:id/view',
  idParamValidation,
  handleValidationErrors,
  blogController.trackViewEvent
);

// ========================================
// SHOWS ENDPOINTS
// ========================================

// Get shows (upcoming by default)
router.get('/shows',
  paginationValidation,
  handleValidationErrors,
  showController.getShows
);

// Get upcoming shows
router.get('/shows/upcoming', showController.getUpcomingShows);

// Get past shows
router.get('/shows/past', showController.getPastShows);

// Get specific show by ID
router.get('/shows/:id',
  idParamValidation,
  handleValidationErrors,
  showController.getShowById
);

// ========================================
// GALLERY ENDPOINTS
// ========================================

// Get photos with category filtering
router.get('/photos',
  paginationValidation,
  handleValidationErrors,
  photoController.getPhotos
);

// Get featured photos
router.get('/photos/featured', photoController.getFeaturedPhotos);

// Get photos by category
router.get('/photos/category/:category', photoController.getPhotosByCategory);

// ========================================
// CONTACT AND NEWSLETTER ENDPOINTS
// ========================================

// Submit contact form
router.post('/contact',
  contactValidation,
  handleValidationErrors,
  contactController.submitContactForm
);

// Subscribe to newsletter
router.post('/newsletter/subscribe',
  newsletterSubscriptionValidation,
  handleValidationErrors,
  contactController.subscribeToNewsletter
);

// Unsubscribe from newsletter
router.post('/newsletter/unsubscribe',
  contactController.unsubscribeFromNewsletter
);

// Confirm newsletter subscription
router.get('/newsletter/confirm/:token',
  contactController.confirmNewsletterSubscription
);

// ========================================
// GENERAL ENDPOINTS
// ========================================

// Get press kit information
router.get('/press-kit', photoController.getPressKit);

// Get site information (social links, contact info, etc.)
router.get('/site-info', (req, res) => {
  res.json(ApiResponse.success({
    siteName: 'A Moody Place',
    artist: 'Mood',
    social: {
      spotify: process.env.SPOTIFY_URL || null,
      youtube: process.env.YOUTUBE_URL || null,
      instagram: process.env.INSTAGRAM_URL || null,
      soundcloud: process.env.SOUNDCLOUD_URL || null
    },
    contact: {
      email: process.env.CONTACT_EMAIL || 'contact@a-moody-place.com',
      booking: process.env.BOOKING_EMAIL || 'booking@a-moody-place.com'
    }
  }));
});

// ========================================
// ADMIN AUTHENTICATION ENDPOINTS
// ========================================

// Admin login
router.post('/admin/login',
  loginValidation,
  handleValidationErrors,
  logAuthEvent('admin_login_attempt'),
  authController.login
);

// Admin logout
router.post('/admin/logout',
  authenticateAdmin,
  logAuthEvent('admin_logout'),
  authController.logout
);

// Refresh JWT token
router.post('/admin/refresh',
  authController.refreshToken
);

// Get current admin user info
router.get('/admin/me',
  authenticateAdmin,
  authController.getCurrentUser
);

// Change password
router.post('/admin/change-password',
  authenticateAdmin,
  authController.changePassword
);

// ========================================
// ADMIN DASHBOARD ENDPOINTS
// ========================================

// Get dashboard statistics
router.get('/admin/dashboard',
  authenticateAdmin,
  requireEditor,
  analyticsController.getDashboardStats
);

// ========================================
// ADMIN SONG MANAGEMENT
// ========================================

// Get all songs (including unpublished)
router.get('/admin/songs',
  authenticateAdmin,
  requireEditor,
  paginationValidation,
  handleValidationErrors,
  songController.getAllSongs
);

// Create new song
router.post('/admin/songs',
  authenticateAdmin,
  requireEditor,
  songValidation,
  handleValidationErrors,
  songController.createSong
);

// Get song for editing
router.get('/admin/songs/:id',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  handleValidationErrors,
  songController.getSongById
);

// Update song
router.put('/admin/songs/:id',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  songValidation,
  handleValidationErrors,
  songController.updateSong
);

// Delete song
router.delete('/admin/songs/:id',
  authenticateAdmin,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  songController.deleteSong
);

// Toggle featured status
router.post('/admin/songs/:id/toggle-featured',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  handleValidationErrors,
  songController.toggleFeatured
);

// ========================================
// ADMIN BLOG MANAGEMENT
// ========================================

// Get all blog posts
router.get('/admin/blog',
  authenticateAdmin,
  requireEditor,
  paginationValidation,
  handleValidationErrors,
  blogController.getAllPosts
);

// Create new blog post
router.post('/admin/blog',
  authenticateAdmin,
  requireEditor,
  blogPostValidation,
  handleValidationErrors,
  blogController.createPost
);

// Get blog post for editing
router.get('/admin/blog/:id',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  handleValidationErrors,
  blogController.getPostById
);

// Update blog post
router.put('/admin/blog/:id',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  blogPostValidation,
  handleValidationErrors,
  blogController.updatePost
);

// Delete blog post
router.delete('/admin/blog/:id',
  authenticateAdmin,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  blogController.deletePost
);

// Publish/unpublish blog post
router.post('/admin/blog/:id/publish',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  handleValidationErrors,
  blogController.togglePublished
);

// ========================================
// ADMIN SHOW MANAGEMENT
// ========================================

// Get all shows
router.get('/admin/shows',
  authenticateAdmin,
  requireEditor,
  paginationValidation,
  handleValidationErrors,
  showController.getAllShows
);

// Create new show
router.post('/admin/shows',
  authenticateAdmin,
  requireEditor,
  showValidation,
  handleValidationErrors,
  showController.createShow
);

// Update show
router.put('/admin/shows/:id',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  showValidation,
  handleValidationErrors,
  showController.updateShow
);

// Delete show
router.delete('/admin/shows/:id',
  authenticateAdmin,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  showController.deleteShow
);

// ========================================
// ADMIN PHOTO MANAGEMENT
// ========================================

// Get all photos with management info
router.get('/admin/photos',
  authenticateAdmin,
  requireEditor,
  paginationValidation,
  handleValidationErrors,
  photoController.getAllPhotos
);

// Upload new photos (handled by separate upload middleware)
router.post('/admin/photos',
  authenticateAdmin,
  requireEditor,
  photoController.uploadPhotos
);

// Update photo metadata
router.put('/admin/photos/:id',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  handleValidationErrors,
  photoController.updatePhoto
);

// Delete photo
router.delete('/admin/photos/:id',
  authenticateAdmin,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  photoController.deletePhoto
);

// Bulk photo upload
router.post('/admin/photos/bulk-upload',
  authenticateAdmin,
  requireEditor,
  photoController.bulkUploadPhotos
);

// ========================================
// ADMIN CONTACT MANAGEMENT
// ========================================

// Get contact inquiries
router.get('/admin/contacts',
  authenticateAdmin,
  requireEditor,
  paginationValidation,
  handleValidationErrors,
  contactController.getContactInquiries
);

// Update contact inquiry (mark as responded)
router.put('/admin/contacts/:id',
  authenticateAdmin,
  requireEditor,
  idParamValidation,
  handleValidationErrors,
  contactController.updateContactInquiry
);

// Delete contact inquiry
router.delete('/admin/contacts/:id',
  authenticateAdmin,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  contactController.deleteContactInquiry
);

// Get newsletter subscribers
router.get('/admin/subscribers',
  authenticateAdmin,
  requireEditor,
  paginationValidation,
  handleValidationErrors,
  contactController.getNewsletterSubscribers
);

// Remove subscriber
router.delete('/admin/subscribers/:id',
  authenticateAdmin,
  requireAdmin,
  idParamValidation,
  handleValidationErrors,
  contactController.removeSubscriber
);

// ========================================
// ADMIN ANALYTICS
// ========================================

// Get site analytics data
router.get('/admin/analytics',
  authenticateAdmin,
  requireEditor,
  analyticsController.getAnalytics
);

// Get analytics summary for dashboard
router.get('/admin/analytics/summary',
  authenticateAdmin,
  requireEditor,
  analyticsController.getAnalyticsSummary
);

// ========================================
// ERROR HANDLING
// ========================================

// Handle 404s for API routes
router.use('*', (req, res) => {
  res.status(404).json(ApiResponse.notFoundError('API endpoint'));
});

// Global error handler for API routes
router.use((error, req, res, next) => {
  console.error('API Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json(ApiResponse.validationError(error.details || []));
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json(ApiResponse.error('Invalid ID format', 'INVALID_ID', 400));
  }
  
  res.status(500).json(ApiResponse.serverError('An error occurred processing your request'));
});

module.exports = router;