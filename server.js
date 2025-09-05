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

// Compression middleware
app.use(compression());

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 0,
    etag: false,
    cacheControl: false
}));

// Parse JSON bodies
app.use(express.json({ limit: '1mb' }));

// Routes
app.get('/', (req, res) => {
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