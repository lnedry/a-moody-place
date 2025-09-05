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
- Node.js 22+ with Express.js framework
- MariaDB database (Plesk-hosted) for structured data
- JWT authentication for admin panel (Phase 3)
- Docker containerization with single-container architecture
- Self-hosted on Debian 12 server with Plesk control panel

**Frontend:**
- Multi-page application (MPA) with SPA-like features
- Alpine.js for reactive components and interactions
- Modern CSS (Grid, Flexbox, custom properties)
- No TypeScript - JavaScript ES6+ only

**Deployment Architecture:**
- Single Docker container deployment (no docker-compose)
- Host network mode for Plesk MariaDB connectivity
- Nginx reverse proxy via Plesk configuration
- Automated deployment via SSH with deploy.sh script

**Key Architectural Decisions:**
- Mobile-first responsive design
- 30-second music previews with streaming platform integration
- Social media feed embedding (Instagram, YouTube)
- Newsletter signup functionality
- Press kit with downloadable assets

## Development Phases

**Phase 1 (Weeks 1-6): Core Website Development** ✅ COMPLETED
- Infrastructure setup and basic Express.js app ✅
- Core pages: Home, About, Music, Contact, Press Kit, Shows, Blog, Gallery ✅
- All pages implemented with consistent Option A design system ✅
- Hero sections standardized across all pages ✅
- Mobile-responsive design implemented ✅
- Docker development environment configured ✅
- Interactive features: Music player, gallery lightbox, contact forms ✅
- Backend API integration: Contact and newsletter endpoints ✅
- Performance optimization: 95+ PageSpeed score, Core Web Vitals compliant ✅
- SEO optimization: Meta tags, structured data, XML sitemap ✅
- Analytics integration: Google Analytics 4 with custom events ✅

**Phase 2 (Weeks 7-9): Content Integration & Soft Launch**
- Real content population (music, photos, bio, press materials)
- Audio file integration (30-second previews)
- Final content review and quality assurance
- Soft launch and beta testing

**Phase 3 (Weeks 10-12): Admin Panel & Production Launch**
- Custom lightweight CMS for content management
- Blog post editing, music catalog management
- Photo gallery uploads, show/event management
- Contact inquiry management, newsletter subscribers
- Public launch and production deployment
- Launch day monitoring and optimization

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

**Docker Containerization:**
- Single Node.js 22 Alpine container architecture
- Host network mode for direct Plesk MariaDB access
- No docker-compose dependency (Plesk compatibility)
- Automated health checks and graceful error handling

**Deployment Process:**
- Automated via deploy.sh script with SSH deployment
- Local Docker build testing with database connection graceful handling
- Remote container management with restart policies
- Environment variable configuration via .env files

**Server Configuration:**
- Self-hosted on Debian 12 server with Plesk control panel
- Nginx reverse proxy configuration via Plesk
- MariaDB database with regular backups
- Let's Encrypt SSL certificate management

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
- Start: `./docker-run.sh` or `./docker-run.sh up`
- Rebuild: `./docker-run.sh down && ./docker-run.sh up`
- Logs: `./docker-run.sh logs`
- Status: `./docker-run.sh ps`
- Shell access: `./docker-run.sh shell`
- Access: http://localhost:3000

**Deployment Commands:**
- Local build only: `./deploy.sh --build-only`
- Local testing: `./deploy.sh --local-test`
- Full deployment: `./deploy.sh`
- Skip local test: `./deploy.sh --skip-test`

**Utility Scripts:**
- Performance analysis: `node scripts/analyze.js`
- Production build optimization: `node scripts/build.js`
- Domain validation: `./scripts/validate-domain.sh`

**Current Sprint Status:**
- Phase 1 Core Website Development: ✅ COMPLETED (Sprints 1-6)
- Ready for Phase 2 Content Integration & Launch
- Docker deployment architecture optimized and tested