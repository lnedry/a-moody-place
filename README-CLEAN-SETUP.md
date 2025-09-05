# A Moody Place - Clean Docker Setup

## 🎵 Overview

This is a completely clean, Docker-optimized implementation of the "A Moody Place" website that captures all the beautiful Sprint 2 deliverables without any deployment complexity. The setup is minimal, fast, and production-ready.

## ✨ What's Included

### **Core Features**
- ✅ Beautiful, responsive website design
- ✅ Four main pages: Home, About, Music, Contact
- ✅ Alpine.js interactive components
- ✅ Working music player interface
- ✅ Newsletter signup functionality
- ✅ Mobile-responsive navigation
- ✅ Professional typography and design system
- ✅ SEO-optimized with proper meta tags
- ✅ Accessibility features (WCAG 2.1)

### **Technical Stack**
- **Backend**: Clean Express.js server (3 dependencies only)
- **Frontend**: Pure HTML, CSS, Alpine.js
- **Containerization**: Docker with health checks
- **Security**: Helmet.js security headers
- **Performance**: Compression middleware
- **Development**: Hot reload with nodemon

### **Clean Architecture**
- 📁 `server.js` - Minimal Express server (119 lines)
- 📁 `views/` - Standalone HTML pages
- 📁 `public/` - CSS, JS, and image assets
- 📁 `Dockerfile` - Optimized Node.js container
- 📁 `docker-compose.yml` - Simple container orchestration
- 📁 `package.json` - Only 3 production dependencies

## 🚀 Quick Start

### **Option 1: Automated Setup (Recommended)**
```bash
# Run the automated setup script
./setup-clean.sh

# Start with Docker
docker-compose up --build

# OR start locally
npm start
```

### **Option 2: Manual Setup**
```bash
# Install dependencies
npm install

# Start the server
npm start

# OR with Docker
docker-compose up --build
```

### **Access the Website**
- 🌐 **Website**: http://localhost:3000
- 🔍 **Health Check**: http://localhost:3000/health
- 📧 **Newsletter API**: POST http://localhost:3000/api/newsletter

## 📋 Available Scripts

```bash
# Development
npm start          # Start the server locally
npm run dev        # Start with hot reload (nodemon)

# Docker
npm run docker:build   # Build Docker image
npm run docker:run     # Run Docker container
npm run docker:up      # Start with docker-compose
npm run docker:down    # Stop docker-compose
npm run docker:logs    # View container logs

# Health
npm run health     # Check application health
```

## 🐳 Docker Commands

```bash
# Build and run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild and restart
docker-compose up --build --force-recreate
```

## 🌐 Website Features

### **Home Page** (`/`)
- Hero section with music player interface
- Featured music tracks with streaming links
- Newsletter signup form
- Responsive design showcase

### **About Page** (`/about`)
- Artist story and creative philosophy
- Core values section
- Professional biography
- Collaboration call-to-action

### **Music Page** (`/music`)
- Latest releases showcase
- Interactive music players
- Streaming platform links
- Album artwork displays

### **Contact Page** (`/contact`)
- Contact form with Alpine.js handling
- FAQ section with collapsible answers
- Multiple contact methods
- Response time information

## 🔧 Configuration

### **Environment Variables**
```bash
PORT=3000                # Server port (default: 3000)
NODE_ENV=production      # Environment mode
```

### **Docker Health Check**
- Endpoint: `/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## 📊 Performance

### **Lighthouse Scores (Expected)**
- 🟢 Performance: 95+
- 🟢 Accessibility: 100
- 🟢 Best Practices: 100
- 🟢 SEO: 100

### **Bundle Size**
- CSS: ~25KB (minified)
- JavaScript: ~5KB (Alpine.js via CDN)
- HTML: ~15KB per page (gzipped)
- Total Dependencies: 105 packages (clean install)

## 🔐 Security Features

- Helmet.js security headers
- Content Security Policy
- XSS protection
- CSRF prevention
- Input validation on newsletter endpoint
- Secure Docker container (non-root user)

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints: 640px, 768px, 1024px, 1280px
- Touch-friendly navigation
- Optimized for all screen sizes
- Progressive enhancement

## 🎨 Design System

### **Colors**
- Primary: #2c3e50 (Deep blue-gray)
- Accent: #e74c3c (Warm red)
- Text: #2c3e50, #7f8c8d (Light gray)
- Background: #ffffff, #f8f9fa (Off-white)

### **Typography**
- Primary: Inter (Google Fonts)
- Secondary: Playfair Display (Headers)
- System fallbacks included

### **Spacing & Layout**
- CSS Custom Properties (CSS variables)
- Consistent spacing scale (4px base)
- Flexbox and CSS Grid layouts
- Border radius and shadows

## 🚀 Deployment Options

### **Cloud Platforms**
- **Vercel**: `vercel --docker`
- **Railway**: Connect GitHub repo
- **DigitalOcean**: App Platform
- **AWS**: ECS or App Runner
- **Google Cloud**: Cloud Run

### **VPS Deployment**
```bash
# On your server
git clone <your-repo>
cd a-moody-place
./setup-clean.sh
docker-compose up -d --build

# Setup reverse proxy (nginx)
# Configure domain and SSL
```

## 📁 File Structure

```
a-moody-place/
├── 🐳 docker-compose.yml     # Container orchestration
├── 🐳 Dockerfile            # Container definition
├── 📋 package.json          # Dependencies (clean)
├── 🚀 server.js             # Express server (minimal)
├── ✅ healthcheck.js        # Health check script
├── 🔧 setup-clean.sh        # Automated setup
├── 📁 views/                # HTML pages
│   ├── home.html
│   ├── about.html
│   ├── music.html
│   ├── contact.html
│   └── 404.html
├── 📁 public/               # Static assets
│   ├── css/main.css         # Complete design system
│   ├── js/main.js          # Alpine.js enhancements
│   └── images/             # Placeholder info
└── 📁 backup-original/      # Original files backup
```

## 🆘 Troubleshooting

### **Common Issues**

**Port Already in Use**
```bash
# Find process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

**Docker Not Running**
```bash
# Start Docker Desktop on Mac/Windows
# Or install Docker on Linux
sudo systemctl start docker
```

**Permission Issues**
```bash
# Make setup script executable
chmod +x setup-clean.sh

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
```

### **Development Tips**

**Enable Hot Reload**
```bash
npm run dev  # Uses nodemon for auto-restart
```

**View Container Logs**
```bash
docker-compose logs -f web
```

**Clean Docker Build**
```bash
docker-compose down
docker system prune -f
docker-compose up --build
```

## 🎯 Next Steps

This clean setup gives you:
1. ✅ **Immediate visual results** - Beautiful website running locally
2. ✅ **Production-ready foundation** - Secure, performant, scalable
3. ✅ **Easy deployment** - Works on any Docker-compatible platform
4. ✅ **Simple maintenance** - Minimal dependencies, clear code structure
5. ✅ **Room to grow** - Add database, CMS, or other features as needed

### **Future Enhancements** (Optional)
- Add PostgreSQL for newsletter storage
- Integrate Stripe for merchandise
- Add headless CMS (Contentful, Strapi)
- Implement user authentication
- Add blog functionality
- Integrate real music streaming APIs

## 📞 Support

The setup has been tested and verified to work locally. If you encounter any issues:

1. Check the console output for error messages
2. Verify Docker is running (for container deployment)
3. Ensure ports 3000 is available
4. Try the manual setup steps
5. Check the troubleshooting section above

---

**🎵 Ready to share your music with the world!**

This clean implementation preserves all the beautiful design work from Sprint 2 while providing a solid, deployable foundation that you can iterate on. The website is now ready for production deployment with minimal complexity.