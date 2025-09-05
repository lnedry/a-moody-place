# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"A Moody Place" is a comprehensive artist website for musician "Mood" - a songwriter, artist, and topliner. This is a surprise project being built to establish professional online presence and facilitate industry networking.

**Key Details:**
- Domain: a-moody-place.com
- Target launch: Week 5 of development (surprise reveal)
- Self-hosted on Debian 12 server with Plesk control panel
- Server specs: 12GB RAM, 1TB RAID, 100Mb internet

## Architecture & Technology Stack

**Backend:**
- Node.js with Express.js framework
- MariaDB database for structured data
- JWT authentication for admin panel (Phase 3)
- Self-hosted on Debian 12 with Nginx proxy

**Frontend:**
- Multi-page application (MPA) with SPA-like features
- Alpine.js for reactive components and interactions
- Modern CSS (Grid, Flexbox, custom properties)
- No TypeScript - JavaScript ES6+ only

**Key Architectural Decisions:**
- Mobile-first responsive design
- 30-second music previews with streaming platform integration
- Social media feed embedding (Instagram, YouTube)
- Newsletter signup functionality
- Press kit with downloadable assets

## Development Phases

**Phase 1 (Weeks 1-4): Core Website** ✅ COMPLETED
- Infrastructure setup and basic Express.js app ✅
- Core pages: Home, About, Music, Contact, Press Kit, Shows, Blog, Gallery ✅
- All pages implemented with consistent Option A design system ✅
- Hero sections standardized across all pages ✅
- Mobile-responsive design implemented ✅
- Docker development environment configured ✅

**Phase 2 (Week 5): Content Integration & Launch**
- Real content population (music, photos, bio, press materials)
- Final testing and performance optimization
- Launch preparation and go-live

**Phase 3 (Weeks 6-8): Admin Panel**
- Custom lightweight CMS for content management
- Blog post editing, music catalog management
- Photo gallery uploads, show/event management
- Contact inquiry management, newsletter subscribers

## Database Schema

Key tables include:
- `songs` - Music catalog with streaming links and audio files
- `blog_posts` - Artist blog content with publication status
- `shows` - Events with venue info and ticket links
- `photos` - Gallery images with categories and metadata
- `contact_inquiries` - Form submissions with inquiry types
- `newsletter_subscribers` - Email list management

## Performance Requirements

- Page load speeds < 3 seconds on 4G mobile
- Google PageSpeed score > 90
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1
- 99.5% uptime target

## Content Guidelines

**Brand Aesthetic:**
- Clean, minimalist design reflecting introspective artistic brand
- Emotionally resonant, professional yet approachable
- Mobile-optimized for 18-35 demographic

**Music Integration:**
- 30-second audio previews hosted locally
- Direct links to Spotify, Apple Music, YouTube
- Play count tracking and engagement analytics

## Security & Compliance

- HTTPS with Let's Encrypt certificate
- Input validation and SQL injection prevention
- CSRF protection and XSS prevention
- Rate limiting on API endpoints
- Secure file uploads with type validation

## Key Integrations

**Social Media:**
- Instagram: @amoodyplace
- TikTok: @amoodyplace  
- YouTube: @amoodyplace
- Spotify & Apple Music artist profiles

**External Services:**
- Email marketing service for newsletter
- Analytics tracking (Google Analytics)
- CDN for static asset delivery (planned)

## Testing Strategy

- Cross-browser compatibility (Chrome, Firefox, Safari, Edge latest 2 versions)
- Mobile responsiveness across device sizes
- Performance testing on actual devices
- Accessibility compliance (WCAG 2.1 AA)

## Deployment

- Self-hosted deployment via SSH/FTP access
- Nginx reverse proxy configuration
- MariaDB database with regular backups
- Plesk control panel for domain/SSL management

## Content Management

- Current: Manual content updates via HTML files and static assets
- Implemented content: Artist bio, two singles ("Falling" released, "Moog Play" upcoming)
- Blog: First post published ("Finding Your Other Light")
- Future: Custom admin panel for artist self-management
- Blog posts, gallery photos, show dates, music catalog
- Press kit asset management and download tracking

## Current Development Status

**Recently Completed:**
- All 8 core pages implemented and styled
- Consistent design system (Option A - minimal elegant)
- Mobile-responsive layouts
- Hero section height standardization across all pages
- Artist photo integration on About page
- New single "Moog Play" added to Music page (releasing 9/12/2025)
- Press Kit updated with dual single information
- First blog post added ("Finding Your Other Light")
- Docker development environment fully configured

**Active Pages:**
- Home: Landing page with hero section and featured music
- About: Artist biography, photo, and creative values
- Music: Current releases ("Falling" released, "Moog Play" upcoming)
- Shows: Event listings (placeholder structure ready)
- Blog: Artist thoughts and updates (first post published)
- Gallery: Photo collections (structure ready)
- Press Kit: Professional media resources for both singles
- Contact: Multiple contact methods and inquiry form

**Design System:**
- Typography: Playfair Display (headings) + Inter (body)
- Color palette: #2c3e50, #7f8c8d, #95a5a6, #f8f9fa
- Card-based layouts with 12px border radius
- Consistent hero sections: padding 1.5rem 0, subtitle margin 1rem
- Hero titles: clamp(2.5rem, 6vw, 4rem), font-weight 400
- Background images with overlay gradients
- Mobile-first responsive design

**Development Commands:**
- Start: `docker-compose up -d`
- Rebuild: `docker-compose down && docker system prune -f && docker-compose up --build --force-recreate -d`
- Logs: `docker-compose logs -f`
- Access: http://localhost:3000

**Next Steps:**
- Music player functionality implementation
- Contact form backend integration
- Newsletter signup functionality
- Social media integration
- Performance optimization