#!/bin/bash

# ========================================
# A Moody Place - Plesk Deployment Script
# ========================================

set -e  # Exit on any error

# Configuration
DOMAIN="a-moody-place.com"
VHOST_DIR="/var/www/vhosts/${DOMAIN}"
HTTPDOCS_DIR="${VHOST_DIR}/httpdocs"
APP_DIR="${VHOST_DIR}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root. Please run as the domain user."
    exit 1
fi

log "Starting Plesk deployment for A Moody Place..."

# ========================================
# 1. CREATE DIRECTORY STRUCTURE
# ========================================

log "Creating Plesk directory structure..."

# Ensure directories exist
sudo mkdir -p "${VHOST_DIR}"
sudo mkdir -p "${HTTPDOCS_DIR}"
sudo mkdir -p "${HTTPDOCS_DIR}/public"
sudo mkdir -p "${HTTPDOCS_DIR}/uploads/music"
sudo mkdir -p "${HTTPDOCS_DIR}/uploads/photos"
sudo mkdir -p "${HTTPDOCS_DIR}/uploads/press"
sudo mkdir -p "${APP_DIR}/logs"
sudo mkdir -p "${APP_DIR}/config"

success "Directory structure created"

# ========================================
# 2. COPY APPLICATION FILES
# ========================================

log "Copying application files..."

# Copy application root files to vhost directory
cp package.json "${APP_DIR}/"
cp server.js "${APP_DIR}/"
cp app.js "${APP_DIR}/"
cp -r config/ "${APP_DIR}/"
cp -r database/ "${APP_DIR}/"
cp -r routes/ "${APP_DIR}/"
cp -r middleware/ "${APP_DIR}/"
cp -r controllers/ "${APP_DIR}/"
cp -r security/ "${APP_DIR}/"
cp -r utils/ "${APP_DIR}/"

# Copy web files to httpdocs
cp -r public/ "${HTTPDOCS_DIR}/"
cp -r views/ "${HTTPDOCS_DIR}/"

success "Application files copied"

# ========================================
# 3. ENVIRONMENT CONFIGURATION
# ========================================

log "Setting up environment configuration..."

# Create production environment file
cat > "${APP_DIR}/.env" << EOF
# Production Environment for A Moody Place
NODE_ENV=production
PORT=3000
HOST=127.0.0.1

# Database Configuration
DB_HOST=localhost
DB_USER=a-moody-place_user
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=a-moody-place_db

# Security Configuration
JWT_SECRET=$(openssl rand -base64 64)
JWT_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=7d
SESSION_SECRET=$(openssl rand -base64 64)

# Email Configuration
FROM_EMAIL=noreply@a-moody-place.com
ADMIN_EMAIL=admin@a-moody-place.com

# File Storage
UPLOAD_PATH=${HTTPDOCS_DIR}/uploads
MAX_FILE_SIZE=50MB

# Application Settings
DEBUG=false
LOG_LEVEL=info
EOF

success "Environment configured"

# ========================================
# 4. INSTALL NODE.JS DEPENDENCIES
# ========================================

log "Installing Node.js dependencies..."

cd "${APP_DIR}"
npm install --production

success "Dependencies installed"

# ========================================
# 5. DATABASE SETUP
# ========================================

log "Setting up database..."

# Extract database credentials
DB_PASSWORD=$(grep "DB_PASSWORD=" "${APP_DIR}/.env" | cut -d '=' -f2)
DB_USER="a-moody-place_user"
DB_NAME="a-moody-place_db"

# Create database and user
mysql -u root << EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
EOF

# Run migrations
node "${APP_DIR}/database/migrate.js"

success "Database configured"

# ========================================
# 6. SET PERMISSIONS
# ========================================

log "Setting file permissions..."

# Set ownership to Plesk user
sudo chown -R psaadm:psaadm "${VHOST_DIR}"

# Set proper permissions
sudo chmod -R 755 "${VHOST_DIR}"
sudo chmod -R 777 "${HTTPDOCS_DIR}/uploads"
sudo chmod 600 "${APP_DIR}/.env"

success "Permissions set"

# ========================================
# 7. PLESK NODE.JS CONFIGURATION
# ========================================

log "Configuring Plesk Node.js application..."

# Create Plesk Node.js configuration file
cat > "${APP_DIR}/plesk-node-config.json" << EOF
{
    "name": "A Moody Place",
    "script": "server.js",
    "cwd": "${APP_DIR}",
    "env": {
        "NODE_ENV": "production",
        "PORT": "3000"
    },
    "instances": 1,
    "exec_mode": "fork",
    "watch": false,
    "merge_logs": true,
    "log_file": "${APP_DIR}/logs/combined.log",
    "out_file": "${APP_DIR}/logs/out.log",
    "error_file": "${APP_DIR}/logs/error.log",
    "log_date_format": "YYYY-MM-DD HH:mm:ss Z"
}
EOF

success "Plesk Node.js configured"

# ========================================
# 8. HEALTH CHECK
# ========================================

log "Running health checks..."

# Check if Node.js app starts
cd "${APP_DIR}"
timeout 30s npm start &
APP_PID=$!
sleep 5

if kill -0 $APP_PID 2>/dev/null; then
    success "Node.js application starts successfully"
    kill $APP_PID
else
    error "Node.js application failed to start"
fi

# Check database connection
if node -e "require('./database/config.js').testConnection()"; then
    success "Database connection successful"
else
    error "Database connection failed"
fi

# ========================================
# 9. FINAL SETUP INSTRUCTIONS
# ========================================

log "Deployment completed successfully!"

echo ""
echo "========================================"
echo "🎉 A Moody Place Deployment Complete!"
echo "========================================"
echo ""
echo "📁 Application Directory: ${APP_DIR}"
echo "🌐 Web Root Directory: ${HTTPDOCS_DIR}"
echo "🔧 Environment File: ${APP_DIR}/.env"
echo ""
echo "📋 Next Steps:"
echo "1. Configure Node.js app in Plesk Panel:"
echo "   - Go to Websites & Domains > a-moody-place.com"
echo "   - Click 'Node.js' and upload plesk-node-config.json"
echo "   - Set Document Root to: ${HTTPDOCS_DIR}"
echo "   - Set Application Root to: ${APP_DIR}"
echo "   - Enable 'Passenger' if available"
echo ""
echo "2. Configure SSL certificate in Plesk Panel"
echo "3. Test the website: https://a-moody-place.com"
echo ""
echo "🔍 Troubleshooting:"
echo "   - Check logs: ${APP_DIR}/logs/"
echo "   - Test database: node ${APP_DIR}/database/config.js"
echo "   - Check permissions: ls -la ${VHOST_DIR}"
echo ""

success "Ready for Plesk configuration!"