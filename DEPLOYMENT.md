# A Moody Place - Deployment Guide

This comprehensive deployment guide covers everything needed to deploy "A Moody Place" website to a Debian 12 server with MariaDB, Node.js, and Nginx.

## Prerequisites

### Server Requirements
- **OS**: Debian 12 (Bookworm) with 12GB RAM, 1TB RAID storage
- **Domain**: a-moody-place.com (with DNS configured)
- **Control Panel**: Plesk (optional, can work without)
- **SSH Access**: Full root/sudo access
- **Ports**: 80 (HTTP), 443 (HTTPS), 22 (SSH)

### Pre-installed Software
- **Node.js**: Version 18.0.0 or higher
- **MariaDB**: Version 10.11 or higher  
- **Nginx**: Version 1.22 or higher
- **Certbot**: For SSL certificates
- **Git**: For version control

### Verification Commands
```bash
# Check versions
node --version    # Should be >= 18.0.0
mysql --version   # Should be MariaDB 10.11+
nginx -v          # Should be 1.22+
certbot --version # For SSL certificates
```

## Quick Deployment

### 1. Prepare Local Environment

```bash
# Clone the repository
git clone <repository-url> a-moody-place
cd a-moody-place

# Install dependencies for local development
npm install

# Create environment configuration
cp .env.example .env

# Edit .env with your production settings
nano .env
```

### 2. Configure Environment Variables

Edit `.env` with your production values:

```bash
# Application
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# Database
DB_HOST=localhost
DB_USER=a-moody-place_user
DB_PASSWORD=your_secure_database_password
DB_NAME=a-moody-place_db

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

# File Storage
UPLOAD_PATH=/var/www/vhosts/a-moody-place.com/uploads

# Optional Services
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Deploy to Server

```bash
# Copy files to server (replace with your server details)
scp -r . user@your-server:/tmp/a-moody-place-deploy/

# SSH into server
ssh user@your-server

# Run deployment script
cd /tmp/a-moody-place-deploy/
sudo ./scripts/deploy.sh production
```

## Manual Deployment Steps

If you prefer to deploy manually or troubleshoot issues:

### 1. Database Setup

```bash
# Connect to MariaDB
sudo mysql -u root -p

# Create database and user
CREATE DATABASE a-moody-place_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'a-moody-place_user'@'localhost' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON a-moody-place_db.* TO 'a-moody-place_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Test connection
mysql -u a-moody-place_user -p a-moody-place_db -e "SELECT 1;"
```

### 2. Application Installation

```bash
# Create application directory
sudo mkdir -p /var/www/vhosts/a-moody-place.com
sudo chown www-data:www-data /var/www/vhosts/a-moody-place.com

# Copy application files
sudo cp -r . /var/www/vhosts/a-moody-place.com/
sudo chown -R www-data:www-data /var/www/vhosts/a-moody-place.com

# Install dependencies
cd /var/www/vhosts/a-moody-place.com
sudo -u www-data npm ci --only=production

# Create required directories
sudo mkdir -p /var/www/vhosts/a-moody-place.com/uploads/{audio,images/{thumbnail,medium,large},documents}
sudo mkdir -p /var/www/vhosts/a-moody-place.com/logs
sudo chmod 775 /var/www/vhosts/a-moody-place.com/{uploads,logs}
```

### 3. Database Migration

```bash
cd /var/www/vhosts/a-moody-place.com

# Run database migrations
sudo -u www-data node database/migrate.js

# Seed with initial data (optional)
sudo -u www-data node database/seed.js
```

### 4. Nginx Configuration

```bash
# Copy Nginx configuration
sudo cp config/nginx-a-moody-place.conf /etc/nginx/sites-available/a-moody-place.com

# Enable the site
sudo ln -s /etc/nginx/sites-available/a-moody-place.com /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 5. SSL Certificate

```bash
# Install SSL certificate
sudo certbot certonly --nginx -d a-moody-place.com -d www.a-moody-place.com

# Test auto-renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### 6. Systemd Service

```bash
# Copy service file
sudo cp config/a-moody-place.service /etc/systemd/system/

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable a-moody-place
sudo systemctl start a-moody-place

# Check status
sudo systemctl status a-moody-place
```

## Post-Deployment Configuration

### 1. Admin User Creation

```bash
# Connect to the server and application directory
cd /var/www/vhosts/a-moody-place.com

# Create initial admin user (using the seeded default or create new)
# Default from seed: username=admin, password=admin123!
# You should change this immediately after first login
```

### 2. Security Hardening

```bash
# Set up firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Secure MariaDB
sudo mysql_secure_installation

# Set proper file permissions
sudo find /var/www/vhosts/a-moody-place.com -type f -exec chmod 644 {} \;
sudo find /var/www/vhosts/a-moody-place.com -type d -exec chmod 755 {} \;
sudo chmod 600 /var/www/vhosts/a-moody-place.com/.env
sudo chmod +x /var/www/vhosts/a-moody-place.com/server.js
```

### 3. Monitoring Setup

```bash
# Set up log rotation
sudo cp config/logrotate-a-moody-place /etc/logrotate.d/a-moody-place

# Test application health
curl -f http://localhost:3000/health
curl -f https://a-moody-place.com/health
```

## Maintenance & Operations

### Service Management

```bash
# Check service status
sudo systemctl status a-moody-place

# View logs
sudo journalctl -u a-moody-place -f

# Restart service
sudo systemctl restart a-moody-place

# Stop/start service
sudo systemctl stop a-moody-place
sudo systemctl start a-moody-place
```

### Database Operations

```bash
cd /var/www/vhosts/a-moody-place.com

# Backup database
mysqldump -u a-moody-place_user -p a-moody-place_db > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u a-moody-place_user -p a-moody-place_db < backup_file.sql

# Run migrations (for updates)
sudo -u www-data node database/migrate.js
```

### Log Management

```bash
# Application logs
tail -f /var/www/vhosts/a-moody-place.com/logs/error.log
tail -f /var/www/vhosts/a-moody-place.com/logs/access.log

# System logs
sudo journalctl -u a-moody-place -f
sudo journalctl -u nginx -f

# Nginx logs
tail -f /var/log/nginx/a-moody-place-access.log
tail -f /var/log/nginx/a-moody-place-error.log
```

### Updates & Deployment

```bash
# Pull latest changes
cd /var/www/vhosts/a-moody-place.com
sudo -u www-data git pull origin main

# Install new dependencies
sudo -u www-data npm ci --only=production

# Run migrations if needed
sudo -u www-data node database/migrate.js

# Restart services
sudo systemctl restart a-moody-place
sudo systemctl reload nginx
```

## Troubleshooting

### Common Issues

**1. Application won't start**
```bash
# Check logs
sudo journalctl -u a-moody-place -n 50

# Check environment variables
sudo cat /var/www/vhosts/a-moody-place.com/.env

# Test database connection
cd /var/www/vhosts/a-moody-place.com
sudo -u www-data node -e "require('./database/config').testConnection()"
```

**2. Database connection issues**
```bash
# Test database access
mysql -u a-moody-place_user -p a-moody-place_db -e "SELECT 1;"

# Check database service
sudo systemctl status mariadb

# Check database logs
sudo journalctl -u mariadb -f
```

**3. Nginx/SSL issues**
```bash
# Test Nginx configuration
sudo nginx -t

# Check SSL certificate
sudo certbot certificates

# Renew SSL certificate
sudo certbot renew --force-renewal
```

**4. Permission issues**
```bash
# Fix ownership
sudo chown -R www-data:www-data /var/www/vhosts/a-moody-place.com

# Fix permissions
sudo find /var/www/vhosts/a-moody-place.com -type f -exec chmod 644 {} \;
sudo find /var/www/vhosts/a-moody-place.com -type d -exec chmod 755 {} \;
sudo chmod 600 /var/www/vhosts/a-moody-place.com/.env
sudo chmod 775 /var/www/vhosts/a-moody-place.com/{uploads,logs}
```

### Performance Monitoring

```bash
# Check system resources
htop
df -h
free -h

# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s https://a-moody-place.com/

# Database performance
sudo mysql -u root -p -e "SHOW PROCESSLIST;"
sudo mysql -u root -p -e "SHOW STATUS LIKE '%slow%';"
```

### Health Checks

```bash
# Application health
curl https://a-moody-place.com/health
curl https://a-moody-place.com/health/detailed

# Service status
sudo systemctl is-active a-moody-place
sudo systemctl is-active nginx
sudo systemctl is-active mariadb
```

## Backup & Recovery

### Automated Backups

```bash
# Create backup script
sudo tee /usr/local/bin/backup-a-moody-place.sh > /dev/null << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/a-moody-place"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup files
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" -C /var/www a-moody-place

# Backup database
mysqldump -u a-moody-place_user -p$(grep DB_PASSWORD /var/www/vhosts/a-moody-place.com/.env | cut -d'=' -f2) a-moody-place_db > "$BACKUP_DIR/database_$DATE.sql"

# Keep only last 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
EOF

sudo chmod +x /usr/local/bin/backup-a-moody-place.sh

# Add to crontab (daily backups at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-a-moody-place.sh" | sudo crontab -
```

### Recovery Process

```bash
# Stop services
sudo systemctl stop a-moody-place

# Restore files
sudo tar -xzf /var/backups/a-moody-place/files_DATE.tar.gz -C /var/www/

# Restore database
mysql -u a-moody-place_user -p a-moody-place_db < /var/backups/a-moody-place/database_DATE.sql

# Fix permissions
sudo chown -R www-data:www-data /var/www/vhosts/a-moody-place.com

# Start services
sudo systemctl start a-moody-place
```

## Security Considerations

### Regular Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /var/www/vhosts/a-moody-place.com
sudo -u www-data npm audit
sudo -u www-data npm update
```

### Security Monitoring

```bash
# Check for suspicious activity
sudo tail -f /var/log/nginx/a-moody-place-access.log | grep -E "(40[0-9]|50[0-9])"

# Monitor authentication attempts
sudo journalctl -u a-moody-place | grep -i "login"

# Check fail2ban (if installed)
sudo fail2ban-client status
```

## Support & Resources

### Useful Commands Reference

```bash
# Quick status check
sudo systemctl status a-moody-place nginx mariadb

# View all logs
sudo journalctl -u a-moody-place -u nginx -f

# Test all endpoints
curl -f https://a-moody-place.com/health
curl -f https://a-moody-place.com/api/songs
curl -f https://a-moody-place.com/api/blog

# Performance test
ab -n 100 -c 10 https://a-moody-place.com/
```

### Directory Structure
```
/var/www/vhosts/a-moody-place.com/
├── server.js                 # Main application entry
├── app.js                    # Express application
├── package.json              # Dependencies
├── .env                      # Environment variables
├── database/                 # Database files
├── routes/                   # API routes
├── controllers/              # Business logic
├── middleware/               # Custom middleware
├── security/                 # Security modules
├── utils/                    # Utilities
├── public/                   # Static files
├── uploads/                  # User uploads
├── logs/                     # Application logs
└── scripts/                  # Deployment scripts
```

### Contact & Support

For deployment issues or questions:
- Check the logs first: `sudo journalctl -u a-moody-place -f`
- Review this documentation
- Test individual components (database, nginx, application)
- Check firewall and DNS settings

This deployment guide ensures a secure, performant, and maintainable installation of the A Moody Place website.