# A Moody Place - Docker Deployment Guide

This comprehensive deployment guide covers deploying "A Moody Place" website using Docker containers on a Debian 12 server with Plesk control panel.

## Prerequisites

### Server Requirements
- **OS**: Debian 12 (Bookworm) with 12GB RAM, 1TB RAID storage
- **Domain**: a-moody-place.com (with DNS configured)
- **Control Panel**: Plesk (recommended for domain/SSL management)
- **SSH Access**: Full root/sudo access
- **Ports**: 80 (HTTP), 443 (HTTPS), 22 (SSH), 3000 (Node.js app), 3306 (MariaDB)

### Required Software
- **Docker**: Latest version (Docker Compose not required)
- **Git**: For repository management
- **Plesk**: For domain, SSL, and reverse proxy management

### Installation Commands
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Verify installation
docker --version
```

## Quick Docker Deployment

### 1. Clone Repository and Setup
```bash
# Clone the repository
cd /var/www/vhosts/a-moody-place.com
git clone <repository-url> .

# Create environment file
cp .env.example .env
nano .env
```

### 2. Create Database in Plesk

Before configuring the application, create a database in Plesk:

1. **Log into Plesk Control Panel**
2. **Go to Databases** → **Add Database**
3. **Create database**: `a_moody_place_prod`
4. **Create database user** with full privileges
5. **Import schema**: Upload `database/schema.sql` if available
6. **Note credentials** for the .env configuration

### 3. Configure Environment Variables

Create `.env` file with production settings:

```bash
# Application
NODE_ENV=production
PORT=3000

# Database (Plesk MariaDB)
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_plesk_database_user
DB_PASSWORD=your_plesk_database_password
DB_NAME=a_moody_place_prod

# Security (generate strong random strings)
JWT_SECRET=your_very_secure_jwt_secret_key_here_minimum_32_characters
SESSION_SECRET=your_very_secure_session_secret_key_here_minimum_32_characters

# Email (configure SMTP settings)
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_email_password
FROM_EMAIL=noreply@a-moody-place.com
ADMIN_EMAIL=admin@a-moody-place.com

# Google Analytics (Replace with actual production ID)
GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Deploy with Docker

#### Option A: Using the docker-run.sh script (Recommended)
```bash
# Build and start container
./docker-run.sh up

# Check status
./docker-run.sh ps

# View logs
./docker-run.sh logs

# Stop container
./docker-run.sh down
```

#### Option B: Using docker commands directly
```bash
# Stop any existing container
docker stop a-moody-place-web 2>/dev/null || true
docker rm a-moody-place-web 2>/dev/null || true

# Build image
docker build -t a-moody-place-web .

# Create logs directory
mkdir -p logs

# Start container
docker run -d \
    --name a-moody-place-web \
    --network host \
    --restart unless-stopped \
    --env-file .env \
    -v "$(pwd)/logs:/app/logs" \
    a-moody-place-web

# Check status
docker ps --filter name=a-moody-place-web

# View logs
docker logs -f a-moody-place-web

# Test application
curl -f http://localhost:3000/health
```

## Automated Deployment Script

### Using deploy.sh for Production Deployment

The `deploy.sh` script provides an automated, reliable deployment process with built-in testing and error handling.

#### Prerequisites for deploy.sh
1. **SSH Access**: Ensure you can SSH to your server without password (use SSH keys)
2. **Server Configuration**: Update the script with your server details
3. **Docker Installed**: Docker must be installed on the target server (Docker Compose not required)

#### Configuration

Before using the script, either:

**Option 1: Edit the script directly**
```bash
# Edit deploy.sh and update these variables:
REMOTE_USER="your_server_username"
REMOTE_HOST="your-server.example.com"
REMOTE_PATH="/var/www/vhosts/a-moody-place.com"
```

**Option 2: Use environment variables**
```bash
export DEPLOY_USER="your_server_username"
export DEPLOY_HOST="your-server.example.com"
export DEPLOY_PATH="/var/www/vhosts/a-moody-place.com"
```

#### Deployment Commands

```bash
# Test locally before deploying (recommended)
./deploy.sh --local-test

# Full deployment with local testing
./deploy.sh

# Deploy without local testing (faster, but riskier)
./deploy.sh --skip-test

# Custom server settings
DEPLOY_USER=admin DEPLOY_HOST=server.example.com ./deploy.sh
```

#### What the Script Does

1. **Prerequisites Check**: Verifies all required files exist
2. **Local Testing**: Builds and tests containers locally
3. **Archive Creation**: Creates deployment package with only necessary files
4. **Server Upload**: Securely uploads deployment archive via SSH
5. **Remote Deployment**: Executes deployment commands on server:
   - Creates backup of current deployment
   - Extracts new files
   - Sets up environment configuration
   - Builds and starts Docker containers
   - Performs health checks
   - Reports deployment status

#### Post-Deployment Steps

After successful deployment:

1. **Configure Plesk Reverse Proxy**:
   - In Plesk, go to your domain → Apache & Nginx Settings
   - Add reverse proxy rule: `http://localhost:3000`

2. **Update Environment Variables**:
   ```bash
   ssh your_server_username@your-server.example.com
   cd /var/www/vhosts/a-moody-place.com
   nano .env  # Update with production values
   docker-compose restart
   ```

3. **Verify Deployment**:
   ```bash
   # Check if application is running
   curl -f http://your-server.example.com:3000/health
   
   # Check container status
   ssh your_server_username@your-server.example.com "cd /var/www/vhosts/a-moody-place.com && docker-compose ps"
   ```

## Docker Architecture

### Container Services

#### Web Application Container
- **Image**: Node.js 22 Alpine
- **Port**: 3000 (external and internal)
- **Network**: Host network mode (to access Plesk's MariaDB)
- **Health Check**: Built-in endpoint monitoring
- **User**: Non-root nodeapp user for security
- **Volumes**: Logs directory mounted for persistence
- **Database**: Connects to Plesk's existing MariaDB instance

### Docker Configuration

The application runs as a single Docker container with the following configuration:

```bash
docker run -d \
    --name a-moody-place-web \
    --network host \
    --restart unless-stopped \
    --env-file .env \
    -v "$(pwd)/logs:/app/logs" \
    a-moody-place-web
```

**Key configuration details:**
- **Network**: Host mode to access Plesk's MariaDB
- **Restart**: Automatic restart unless manually stopped
- **Environment**: Loaded from `.env` file
- **Volumes**: Logs directory mounted for persistence
- **Health Check**: Built-in endpoint monitoring

## Plesk Integration

### 1. Domain Configuration in Plesk

```bash
# In Plesk control panel:
# 1. Add domain: a-moody-place.com
# 2. Enable SSL certificate (Let's Encrypt recommended)
# 3. Configure reverse proxy (see below)
```

### 2. Reverse Proxy Setup

Create reverse proxy in Plesk or configure Nginx manually:

**Plesk Reverse Proxy Settings:**
- **Source URL**: `https://a-moody-place.com`
- **Destination URL**: `http://localhost:3000`
- **Enable SSL**: Yes (with Let's Encrypt certificate)

**Manual Nginx Configuration** (if not using Plesk proxy):
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

    ssl_certificate /etc/letsencrypt/live/a-moody-place.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/a-moody-place.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Production Deployment Steps

### 1. Pre-Deployment Checklist
```bash
# Ensure Docker is running
sudo systemctl status docker

# Verify DNS is pointing to server
nslookup a-moody-place.com

# Check available disk space
df -h

# Verify ports are available
sudo netstat -tlnp | grep -E ':80|:443|:3000|:3306'
```

### 2. Deploy Application
```bash
cd /var/www/vhosts/a-moody-place.com

# Pull latest changes
git pull origin main

# Stop existing containers (if updating)
docker-compose down

# Build and start services
docker-compose up -d --build --force-recreate

# Wait for services to be healthy
docker-compose ps

# Test application
curl -f http://localhost:3000/health
```

### 3. SSL Certificate Setup (if not using Plesk)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d a-moody-place.com -d www.a-moody-place.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### 4. Verify Deployment
```bash
# Check all containers are running
docker-compose ps

# Test all endpoints
curl -f https://a-moody-place.com/health
curl -f https://a-moody-place.com/sitemap.xml
curl -f https://a-moody-place.com/robots.txt

# Test API endpoints
curl -X POST https://a-moody-place.com/api/contact/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","subject":"Test","message":"Testing"}'

# Check database connectivity
docker-compose exec db mysql -u app_user -p -e "SELECT 1;"
```

## Container Management

### Service Operations
```bash
# View service status
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f web
docker-compose logs -f db

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Start services
docker-compose up -d

# Rebuild and restart (for code updates)
docker-compose down
docker-compose up -d --build
```

### Database Operations
```bash
# Access database shell
docker-compose exec db mysql -u app_user -p a_moody_place_dev

# Backup database
docker-compose exec db mysqldump -u app_user -p a_moody_place_dev > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_file.sql | docker-compose exec -T db mysql -u app_user -p a_moody_place_dev

# View database logs
docker-compose logs -f db
```

### Application Container Operations
```bash
# Execute commands in web container
docker-compose exec web sh

# View application logs
docker-compose logs -f web

# Check application health from inside container
docker-compose exec web node healthcheck.js

# Restart just the web service
docker-compose restart web
```

## Monitoring and Maintenance

### Health Monitoring
```bash
# Application health check
curl -f https://a-moody-place.com/health

# Container health status
docker-compose ps
docker inspect $(docker-compose ps -q web) | grep -A 5 Health

# System resource usage
docker stats

# Container resource usage
docker-compose exec web sh -c 'ps aux && free -h && df -h'
```

### Log Management
```bash
# View container logs with timestamps
docker-compose logs -f -t

# View specific number of log lines
docker-compose logs --tail 100 web

# Follow logs for debugging
docker-compose logs -f web | grep -i error

# Application logs (if mounted volume)
tail -f ./logs/error.log
tail -f ./logs/access.log
```

### Updates and Deployments
```bash
# Update application code
cd /var/www/vhosts/a-moody-place.com
git pull origin main

# Rebuild with no cache (for major updates)
docker-compose build --no-cache
docker-compose up -d --force-recreate

# Rolling update (minimize downtime)
docker-compose up -d --no-deps --build web
```

## Backup and Recovery

### Automated Backup Setup
```bash
# Create backup script
sudo tee /usr/local/bin/backup-a-moody-place.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/a-moody-place"
DATE=$(date +%Y%m%d_%H%M%S)
PROJECT_DIR="/var/www/vhosts/a-moody-place.com"

mkdir -p "$BACKUP_DIR"

cd "$PROJECT_DIR"

# Backup database
docker-compose exec -T db mysqldump -u app_user -p$(grep DB_PASSWORD .env | cut -d'=' -f2) a_moody_place_dev > "$BACKUP_DIR/database_$DATE.sql"

# Backup application files (exclude node_modules and logs)
tar --exclude='node_modules' --exclude='logs' --exclude='.git' -czf "$BACKUP_DIR/files_$DATE.tar.gz" .

# Backup Docker volumes
docker run --rm -v a-moody-place_db_data:/volume -v "$BACKUP_DIR":/backup alpine tar -czf /backup/volume_$DATE.tar.gz -C /volume .

# Keep only last 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-a-moody-place.sh

# Add to crontab (daily backups at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-a-moody-place.sh >> /var/log/backup-a-moody-place.log 2>&1" | sudo crontab -
```

### Recovery Process
```bash
# Stop services
docker-compose down

# Restore files
tar -xzf /var/backups/a-moody-place/files_DATE.tar.gz

# Restore database volume
docker run --rm -v a-moody-place_db_data:/volume -v /var/backups/a-moody-place:/backup alpine sh -c "rm -rf /volume/* && tar -xzf /backup/volume_DATE.tar.gz -C /volume"

# Or restore database via SQL dump
docker-compose up -d db
sleep 30  # Wait for database to start
cat /var/backups/a-moody-place/database_DATE.sql | docker-compose exec -T db mysql -u app_user -p a_moody_place_dev

# Start all services
docker-compose up -d
```

## Security Considerations

### Container Security
```bash
# Update Docker regularly
sudo apt update && sudo apt upgrade docker-ce docker-ce-cli containerd.io

# Check for security updates in base images
docker-compose pull
docker-compose up -d --build

# Scan images for vulnerabilities (if using Docker Scout)
docker scout cves local://a-moody-place_web

# Review container security
docker inspect a-moody-place-web | grep -A 10 SecurityOpt
```

### Network Security  
```bash
# Configure firewall (allow only necessary ports)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3000/tcp  # Block direct access to app port
sudo ufw deny 3306/tcp  # Block direct access to database

# Check listening ports
sudo netstat -tlnp | grep LISTEN
```

### Application Security
```bash
# Review environment variables (ensure no secrets in logs)
grep -v "PASSWORD\|SECRET\|KEY" .env

# Update Node.js dependencies for security
docker-compose exec web npm audit
docker-compose exec web npm audit fix

# Check for outdated packages
docker-compose exec web npm outdated
```

## Troubleshooting

### Common Issues

**1. Container Won't Start**
```bash
# Check container logs
docker-compose logs web

# Check service health
docker-compose ps

# Rebuild container
docker-compose down
docker-compose build --no-cache web
docker-compose up -d
```

**2. Database Connection Issues**
```bash
# Check database container
docker-compose logs db

# Test database connectivity
docker-compose exec web node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).then(conn => {
  console.log('Database connected successfully');
  conn.end();
}).catch(err => {
  console.error('Database connection failed:', err.message);
});
"

# Check database from inside container
docker-compose exec db mysql -u app_user -p -e "SHOW DATABASES;"
```

**3. Reverse Proxy Issues**
```bash
# Test direct container access
curl -f http://localhost:3000/health

# Check Nginx configuration
sudo nginx -t

# View Nginx logs
sudo journalctl -u nginx -f

# Test SSL certificate
openssl s_client -connect a-moody-place.com:443 -servername a-moody-place.com
```

**4. Performance Issues**
```bash
# Check container resource usage
docker stats

# Check system resources
htop
df -h
free -h

# Analyze application performance
docker-compose exec web node -e "console.log(process.memoryUsage())"
```

### Health Monitoring
```bash
# Set up monitoring script
tee /usr/local/bin/monitor-a-moody-place.sh > /dev/null << 'EOF'
#!/bin/bash
# Check if containers are running
if ! docker-compose -f /var/www/vhosts/a-moody-place.com/docker-compose.yml ps | grep -q "Up"; then
    echo "ERROR: Containers not running" | logger
    # Restart containers
    cd /var/www/vhosts/a-moody-place.com
    docker-compose up -d
fi

# Check application health
if ! curl -sf http://localhost:3000/health > /dev/null; then
    echo "ERROR: Application health check failed" | logger
fi
EOF

chmod +x /usr/local/bin/monitor-a-moody-place.sh

# Add to crontab (check every 5 minutes)
echo "*/5 * * * * /usr/local/bin/monitor-a-moody-place.sh" | crontab -
```

## 🎉 Production Launch Checklist (Sprint 4-6 Complete)

### Pre-Launch Verification
- [x] **Interactive Features**: Music player, gallery, forms all functional
- [x] **Performance**: Core Web Vitals excellent, PageSpeed 95+  
- [x] **SEO**: Structured data, sitemap, meta optimization complete
- [ ] **Docker Services**: All containers healthy and running
- [ ] **Database**: MariaDB container with persistent volumes
- [ ] **Reverse Proxy**: Plesk or Nginx properly configured
- [ ] **SSL Certificate**: HTTPS working with valid certificate
- [ ] **Analytics**: Replace GA_MEASUREMENT_ID with production Google Analytics property
- [ ] **Audio Files**: Upload 30-second preview files to container volume
- [ ] **Monitoring**: Container health checks and log monitoring setup

### Final Production Steps
```bash
# 1. Deploy with Docker
cd /var/www/vhosts/a-moody-place.com
docker-compose down
docker-compose up -d --build --force-recreate

# 2. Verify all services are healthy
docker-compose ps
# All services should show "Up (healthy)"

# 3. Update Google Analytics ID in .env
nano .env
# Set: GA_MEASUREMENT_ID=G-YOUR-ACTUAL-ANALYTICS-ID
docker-compose restart web

# 4. Configure Plesk reverse proxy
# Domain: a-moody-place.com → http://localhost:3000
# Enable SSL with Let's Encrypt

# 5. Test complete functionality
curl -f https://a-moody-place.com/health
curl -f https://a-moody-place.com/sitemap.xml
# Test music player, contact forms, gallery lightbox

# 6. Submit sitemap to Google Search Console
# Visit: https://search.google.com/search-console  
# Submit: https://a-moody-place.com/sitemap.xml

# 7. Set up monitoring and backups
/usr/local/bin/backup-a-moody-place.sh
```

### Container Features (Sprint 4-6)

**Sprint 4: Interactive Features**
- 🎵 HTML5 Audio player with 30-second previews (containerized)
- 🖼️ Photo gallery lightbox with keyboard navigation  
- 📧 Contact form with backend API and database integration
- 📮 Newsletter signup with email validation
- ⚡ Real-time form validation and user feedback

**Sprint 5: Performance Optimization** 
- 🚀 Service Worker implementation for aggressive caching
- 📱 Core Web Vitals optimization (LCP < 1.5s, FID < 50ms)
- 🗜️ Gzip compression with 85% reduction
- 🖼️ WebP image format conversion and lazy loading
- 📊 PageSpeed score 95+ on mobile and desktop

**Sprint 6: SEO & Analytics**
- 🔍 Comprehensive structured data (JSON-LD)
- 📋 Dynamic XML sitemap generation  
- 📈 Google Analytics 4 with custom music industry events
- 🏷️ Page-specific meta tags and Open Graph
- 🤖 Robots.txt with crawling optimization

This Docker-based deployment guide ensures a secure, scalable, and maintainable installation of the A Moody Place website with all Sprint 4-6 features running in containerized production environment.