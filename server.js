const express = require('express');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
        },
    },
}));

// Enhanced compression middleware
app.use(compression({
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    },
    level: process.env.NODE_ENV === 'production' ? 6 : 1, // Higher compression in production
    threshold: 1024, // Only compress files > 1KB
    chunkSize: 16 * 1024, // 16KB chunks
}));

// Performance optimizations middleware
const setPerformanceHeaders = (req, res, next) => {
    // Set security headers for performance
    res.set({
        'X-DNS-Prefetch-Control': 'on',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff'
    });
    
    // Conditional compression based on file type
    if (req.url.match(/\.(html|css|js|json|xml|txt)$/)) {
        res.set('Vary', 'Accept-Encoding');
    }
    
    next();
};

app.use(setPerformanceHeaders);

// Static files with aggressive caching strategy
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '1h', // 1 year in production, 1 hour in dev
    etag: true,
    lastModified: true,
    immutable: process.env.NODE_ENV === 'production',
    setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        
        // Image caching strategy
        if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.ico'].includes(ext)) {
            res.set('Cache-Control', process.env.NODE_ENV === 'production' 
                ? 'public, max-age=31536000, immutable' // 1 year
                : 'public, max-age=3600' // 1 hour in dev
            );
        }
        
        // Audio file caching
        if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
            res.set('Cache-Control', process.env.NODE_ENV === 'production' 
                ? 'public, max-age=31536000, immutable' // 1 year
                : 'public, max-age=7200' // 2 hours in dev
            );
        }
        
        // CSS and JS caching
        if (['.css', '.js'].includes(ext)) {
            res.set('Cache-Control', process.env.NODE_ENV === 'production' 
                ? 'public, max-age=31536000, immutable' // 1 year
                : 'public, max-age=3600' // 1 hour in dev
            );
        }
        
        // HTML caching (shorter for content updates)
        if (ext === '.html') {
            res.set('Cache-Control', process.env.NODE_ENV === 'production' 
                ? 'public, max-age=300, must-revalidate' // 5 minutes
                : 'no-cache'
            );
        }
    }
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
try {
    const contactRoutes = require('./routes/contact');
    app.use('/api/contact', contactRoutes);
    console.log('✅ Contact API routes loaded');
} catch (error) {
    console.warn('⚠️  Contact routes not loaded:', error.message);
}

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    const originalSend = res.send;
    res.send = function(data) {
        const responseTime = Date.now() - startTime;
        res.set('Server-Timing', `app;dur=${responseTime}`);
        return originalSend.call(this, data);
    };
    
    next();
};

app.use(performanceMiddleware);

// Routes with performance optimization
app.get('/', (req, res) => {
    // Set performance hints for the homepage
    res.set({
        'Link': [
            '</css/main.css>; rel=preload; as=style',
            '</js/music-player.js>; rel=preload; as=script',
            '<https://fonts.googleapis.com>; rel=preconnect',
            '<https://fonts.gstatic.com>; rel=preconnect; crossorigin'
        ].join(', ')
    });
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/music', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'music.html'));
});

app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'contact.html'));
});

// Design option routes
app.get('/home-option-a', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home-option-a.html'));
});

app.get('/home-option-b', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home-option-b.html'));
});

app.get('/home-option-c', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home-option-c.html'));
});

app.get('/home-option-d', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home-option-d.html'));
});

// Sprint 4 pages
app.get('/shows', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'shows.html'));
});

app.get('/blog', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'blog.html'));
});

app.get('/gallery', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'gallery.html'));
});

app.get('/press-kit', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'press-kit.html'));
});

// Service Worker route
app.get('/sw.js', (req, res) => {
    res.set({
        'Content-Type': 'application/javascript',
        'Service-Worker-Allowed': '/',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

// Web App Manifest
app.get('/manifest.json', (req, res) => {
    res.set({
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=86400'
    });
    res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
});

// XML Sitemap Generation
app.get('/sitemap.xml', (req, res) => {
    const baseURL = 'https://a-moody-place.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const sitemapData = [
        {
            url: '/',
            lastmod: currentDate,
            changefreq: 'weekly',
            priority: '1.0',
            title: 'Home - A Moody Place'
        },
        {
            url: '/about',
            lastmod: currentDate,
            changefreq: 'monthly', 
            priority: '0.9',
            title: 'About Mood - Artist Biography'
        },
        {
            url: '/music',
            lastmod: currentDate,
            changefreq: 'weekly',
            priority: '0.9',
            title: 'Music - Listen to Falling & Moog Play'
        },
        {
            url: '/shows',
            lastmod: currentDate,
            changefreq: 'weekly',
            priority: '0.8',
            title: 'Live Shows & Events'
        },
        {
            url: '/blog',
            lastmod: currentDate,
            changefreq: 'weekly',
            priority: '0.7',
            title: 'Blog - Artist Thoughts & Journey'
        },
        {
            url: '/gallery',
            lastmod: currentDate,
            changefreq: 'monthly',
            priority: '0.6',
            title: 'Photo Gallery - Visual Journey'
        },
        {
            url: '/press-kit',
            lastmod: currentDate,
            changefreq: 'monthly',
            priority: '0.8',
            title: 'Press Kit - Media Resources'
        },
        {
            url: '/contact',
            lastmod: currentDate,
            changefreq: 'monthly',
            priority: '0.7',
            title: 'Contact - Get in Touch'
        }
    ];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
`;
    
    sitemapData.forEach(page => {
        sitemap += `  <url>
`;
        sitemap += `    <loc>${baseURL}${page.url}</loc>
`;
        sitemap += `    <lastmod>${page.lastmod}</lastmod>
`;
        sitemap += `    <changefreq>${page.changefreq}</changefreq>
`;
        sitemap += `    <priority>${page.priority}</priority>
`;
        sitemap += `    <mobile:mobile/>
`;
        
        // Add image entries for pages with notable images
        if (page.url === '/music') {
            sitemap += `    <image:image>
`;
            sitemap += `      <image:loc>${baseURL}/images/falling_632x632.webp</image:loc>
`;
            sitemap += `      <image:caption>Falling - Debut Single by Mood</image:caption>
`;
            sitemap += `      <image:title>Falling Single Artwork</image:title>
`;
            sitemap += `    </image:image>
`;
        }
        
        sitemap += `  </url>
`;
    });
    
    sitemap += `</urlset>`;
    
    res.set({
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=86400'
    });
    res.send(sitemap);
});

// Robots.txt
app.get('/robots.txt', (req, res) => {
    const robotsTxt = `User-agent: *
Allow: /

# Disallow admin areas if they exist in future
Disallow: /admin/
Disallow: /api/
Disallow: /*.json$

# Allow specific API endpoints
Allow: /api/contact
Allow: /api/newsletter

# Sitemap
Sitemap: https://a-moody-place.com/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1`;
    
    res.set({
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400'
    });
    res.send(robotsTxt);
});

// Simple newsletter endpoint (placeholder)
app.post('/api/newsletter', (req, res) => {
    const { email, source } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ 
            success: false, 
            error: 'Valid email address required' 
        });
    }
    
    // In a real implementation, this would save to a database
    console.log(`Newsletter signup: ${email} from ${source || 'unknown'}`);
    
    res.json({ 
        success: true, 
        message: 'Thank you for subscribing!' 
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler - only for HTML pages, let images return proper 404
app.use((req, res) => {
    if (req.accepts('html') && !req.path.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
    } else {
        res.status(404).send('Not Found');
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 A Moody Place server running at http://0.0.0.0:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = app;