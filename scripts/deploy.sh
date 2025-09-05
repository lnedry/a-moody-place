#!/bin/bash

# ========================================
# A Moody Place - Deployment Script
# ========================================
# 
# This script handles the complete deployment of the A Moody Place website
# to a Debian 12 server with all necessary configurations and security measures.
# 
# Usage: ./scripts/deploy.sh [environment]
# Environments: production
# 
# Prerequisites:
# - SSH access to the server
# - Sudo privileges on the server
# - MariaDB installed and configured
# - Node.js 18+ installed
# - Nginx installed

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# ========================================
# CONFIGURATION
# ========================================

ENVIRONMENT=${1:-production}
SERVER_USER="inthemood"
SERVER_GROUP="psacln"
APP_NAME="a-moody-place"
APP_DIR="/var/www/vhosts/a-moody-place.com"
NGINX_CONFIG="/var/www/vhosts/system/a-moody-place.com/conf/vhost_nginx.conf"
SYSTEMD_SERVICE="/etc/systemd/system/a-moody-place.service"
DOMAIN="a-moody-place.com"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ========================================
# UTILITY FUNCTIONS
# ========================================

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

confirm() {
    read -p "$(echo -e ${YELLOW}$1${NC}) [y/N]: " -r
    echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

# ========================================
# VALIDATION FUNCTIONS
# ========================================

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
    
    # Check if required commands exist
    local commands=("node" "npm" "mysql" "nginx" "systemctl")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' not found. Please install it first."
        fi
    done
    
    # Check Node.js version
    local node_version=$(node --version | sed 's/v//')
    local required_version="18.0.0"
    if ! [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
        error "Node.js version $required_version or higher is required. Found: $node_version"
    fi
    
    success "All prerequisites check passed"
}

validate_environment() {
    log "Validating environment configuration..."
    
    if [[ "$ENVIRONMENT" != "production" ]]; then
        error "Invalid environment: $ENVIRONMENT. Must be 'production'"
    fi
    
    # Check if .env file exists
    if [[ ! -f ".env" ]]; then
        error ".env file not found. Please create it from .env.example"
    fi
    
    # Validate required environment variables
    local required_vars=("DB_PASSWORD" "SESSION_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env || grep -q "^${var}=$" .env; then
            error "Environment variable '$var' is not set or empty in .env file"
        fi
    done
    
    success "Environment validation passed"
}

# ========================================
# SETUP FUNCTIONS
# ========================================

setup_directories() {
    log "Setting up application directories..."
    
    # Note: APP_DIR already exists in Plesk, don't create or change ownership
    
    # Create only the subdirectories we need (uploads and backups)
    mkdir -p "$APP_DIR"/httpdocs/uploads/{audio,images/{thumbnail,medium,large},documents}
    mkdir -p "$APP_DIR"/backups
    
    # Set permissions only for new directories (preserve existing APP_DIR permissions: 710)
    chmod 775 "$APP_DIR"/httpdocs/uploads
    chmod -R 664 "$APP_DIR"/httpdocs/uploads/*
    chmod 755 "$APP_DIR"/backups
    
    success "Directory structure created"
}

install_application() {
    log "Installing application files..."
    
    # Copy application files (excluding node_modules and sensitive files)
    rsync -av --exclude='node_modules' --exclude='.git' --exclude='logs' --exclude='uploads' \
          --exclude='.env' . "$APP_DIR/"
    
    # Copy environment file
    cp .env "$APP_DIR/"
    
    # Note: Don't change ownership of APP_DIR - Plesk manages this
    
    # Set permissions
    find "$APP_DIR" -type f -exec chmod 644 {} \;
    find "$APP_DIR" -type d -exec chmod 755 {} \;
    chmod 600 "$APP_DIR/.env"
    chmod +x "$APP_DIR/server.js"
    chmod +x "$APP_DIR/scripts"/*.sh
    
    success "Application files installed"
}

install_dependencies() {
    log "Installing Node.js dependencies..."
    
    cd "$APP_DIR"
    
    # Install production dependencies (don't use sudo in Plesk)
    npm ci --only=production --no-audit --no-fund
    
    # Build assets if build script exists
    if npm run | grep -q "build"; then
        log "Building assets..."
        npm run build
    fi
    
    success "Dependencies installed"
}

setup_database() {
    log "Setting up database..."
    
    # Source environment variables
    set -a
    source "$APP_DIR/.env"
    set +a
    
    # Test database connection
    if ! mysql -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" -e "SELECT 1;" &>/dev/null; then
        error "Cannot connect to database. Please check credentials."
    fi
    
    # Create database if it doesn't exist
    mysql -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\`;"
    
    # Run migrations
    cd "$APP_DIR"
    node database/migrate.js
    
    # Ask if we should seed the database (no staging environment)
    if confirm "Do you want to seed the database with sample data?"; then
        log "Seeding database..."
        node database/seed.js
    fi
    
    success "Database setup completed"
}

setup_nginx() {
    log "Setting up Nginx configuration..."
    
    # For Plesk, we need to add directives to the existing vhost_nginx.conf
    # Copy our additional nginx directives
    cat > "${NGINX_CONFIG}" << 'EOF'
# Additional nginx directives for A Moody Place Node.js app
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Serve static assets directly
location /public/ {
    root /var/www/vhosts/a-moody-place.com/httpdocs;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Serve uploaded content
location /uploads/ {
    root /var/www/vhosts/a-moody-place.com/httpdocs;
    expires 1y;
}
EOF
    
    # Note: Plesk will automatically reload nginx when vhost_nginx.conf changes
    warning "Nginx directives added to Plesk vhost config. Plesk will reload nginx automatically."
    
    success "Nginx configuration setup completed"
}

setup_systemd() {
    log "Setting up systemd service..."
    
    # Copy systemd service file
    cp "config/a-moody-place.service" "$SYSTEMD_SERVICE"
    
    # Update working directory in service file
    sed -i "s|WorkingDirectory=.*|WorkingDirectory=$APP_DIR|g" "$SYSTEMD_SERVICE"
    
    # Update environment file path
    sed -i "s|EnvironmentFile=.*|EnvironmentFile=$APP_DIR/.env|g" "$SYSTEMD_SERVICE"
    
    # Reload systemd daemon
    systemctl daemon-reload
    
    # Enable service
    systemctl enable a-moody-place
    
    success "Systemd service setup completed"
}

setup_logrotate() {
    log "Setting up log rotation..."
    
    cat > /etc/logrotate.d/a-moody-place << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 $SERVER_USER $SERVER_GROUP
    postrotate
        systemctl reload a-moody-place
    endscript
}

/var/log/nginx/a-moody-place-*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
EOF
    
    success "Log rotation setup completed"
}

# ========================================
# MONITORING AND MAINTENANCE
# ========================================

setup_monitoring() {
    log "Setting up basic monitoring..."
    
    # Create monitoring script
    cat > "$APP_DIR/scripts/health-check.sh" << 'EOF'
#!/bin/bash

# Health check script for A Moody Place
# This script checks if the application is running and responding

APP_URL="http://localhost:3000/health"
LOG_FILE="/var/www/vhosts/a-moody-place.com/logs/health-check.log"

# Function to log with timestamp
log_message() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if application is responding
if curl -f -s "$APP_URL" > /dev/null; then
    log_message "Health check passed"
    exit 0
else
    log_message "Health check failed - application not responding"
    
    # Try to restart the service
    systemctl restart a-moody-place
    log_message "Attempted to restart a-moody-place service"
    
    # Wait and check again
    sleep 10
    if curl -f -s "$APP_URL" > /dev/null; then
        log_message "Application recovered after restart"
        exit 0
    else
        log_message "Application still not responding after restart"
        exit 1
    fi
fi
EOF
    
    chmod +x "$APP_DIR/scripts/health-check.sh"
    chown "$SERVER_USER:$SERVER_GROUP" "$APP_DIR/scripts/health-check.sh"
    
    # Add to crontab for regular health checks
    (crontab -l 2>/dev/null; echo "*/5 * * * * $APP_DIR/scripts/health-check.sh") | crontab -
    
    success "Monitoring setup completed"
}

# ========================================
# SERVICE MANAGEMENT
# ========================================

start_services() {
    log "Starting services..."
    
    # Restart Nginx
    systemctl restart nginx
    systemctl enable nginx
    
    # Start application
    systemctl restart a-moody-place
    
    # Wait a moment for services to start
    sleep 5
    
    # Check service status
    if systemctl is-active --quiet nginx; then
        success "Nginx is running"
    else
        error "Nginx failed to start"
    fi
    
    if systemctl is-active --quiet a-moody-place; then
        success "A Moody Place application is running"
    else
        error "A Moody Place application failed to start"
    fi
    
    # Test application
    if curl -f -s http://localhost:3000/health > /dev/null; then
        success "Application is responding to health checks"
    else
        warning "Application may not be responding correctly"
    fi
}

# ========================================
# BACKUP FUNCTIONS
# ========================================

create_backup() {
    log "Creating backup before deployment..."
    
    local backup_dir="/var/backups/a-moody-place"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$backup_dir/backup_$timestamp.tar.gz"
    
    mkdir -p "$backup_dir"
    
    # Backup application files and database
    tar -czf "$backup_file" -C "/var/www/vhosts" "a-moody-place.com" 2>/dev/null || true
    
    # Backup database
    source "$APP_DIR/.env" 2>/dev/null || true
    if [[ -n "${DB_PASSWORD:-}" ]]; then
        mysqldump -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" "$DB_NAME" > "$backup_dir/database_$timestamp.sql"
    fi
    
    # Keep only last 10 backups
    find "$backup_dir" -name "backup_*.tar.gz" -type f -mtime +10 -delete
    find "$backup_dir" -name "database_*.sql" -type f -mtime +10 -delete
    
    success "Backup created: $backup_file"
}

# ========================================
# MAIN DEPLOYMENT PROCESS
# ========================================

main() {
    log "Starting deployment for environment: $ENVIRONMENT"
    
    # Check if this is an update deployment
    local is_update=false
    if [[ -d "$APP_DIR" && -f "$APP_DIR/package.json" ]]; then
        is_update=true
        warning "Existing installation detected. This will be an update deployment."
    fi
    
    # Confirm deployment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if ! confirm "Are you sure you want to deploy to PRODUCTION?"; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Create backup if this is an update
    if [[ "$is_update" == true ]]; then
        create_backup
    fi
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    setup_directories
    install_application
    install_dependencies
    setup_database
    setup_nginx
    setup_systemd
    setup_logrotate
    setup_monitoring
    start_services
    
    # Final checks and summary
    log "Deployment completed successfully!"
    echo
    echo "=========================================="
    echo "DEPLOYMENT SUMMARY"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Application: $APP_DIR"
    echo "Database: $(grep DB_NAME .env | cut -d'=' -f2)"
    echo "Domain: $DOMAIN"
    echo "Services:"
    echo "  - Nginx: $(systemctl is-active nginx)"
    echo "  - Application: $(systemctl is-active a-moody-place)"
    echo
    echo "Next steps:"
    echo "1. Test the application: https://$DOMAIN"
    echo "2. Check logs: journalctl -u a-moody-place -f"
    echo "3. Monitor health: $APP_DIR/scripts/health-check.sh"
    echo
    success "A Moody Place deployment completed!"
}

# ========================================
# SCRIPT EXECUTION
# ========================================

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi