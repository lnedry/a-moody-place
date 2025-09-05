#!/bin/bash

# A Moody Place - Docker Deployment Script for Plesk Server
# This script deploys the application to the production Plesk server using Docker

set -e  # Exit on any error

# Configuration
REMOTE_USER="your_server_username"  # Update with your server username
REMOTE_HOST="your-server.example.com"  # Update with your server hostname/IP
REMOTE_PATH="/var/www/vhosts/a-moody-place.com"
APP_NAME="a-moody-place"
IMAGE_NAME="a-moody-place-web"
CONTAINER_NAME="a-moody-place-web"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required files exist
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    local required_files=(
        "Dockerfile"
        "package.json"
        "server.js"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Required file $file not found!"
            exit 1
        fi
    done
    
    # Check if .env.example exists for guidance
    if [[ ! -f ".env.example" ]]; then
        print_warning ".env.example not found - creating one for server setup"
        create_env_example
    fi
    
    print_success "Prerequisites check passed"
}

# Function to create .env.example if it doesn't exist
create_env_example() {
    cat > .env.example << 'EOF'
# Application
NODE_ENV=production
PORT=3000

# Database (Docker service names)
DB_HOST=db
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=your_secure_database_password_here
DB_NAME=a_moody_place_dev

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
EOF
}

# Function to build and test locally before deployment
local_build_test() {
    print_status "Building and testing locally..."
    
    # Stop any running containers
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    
    # Build the application
    print_status "Building Docker image..."
    docker build -t "$IMAGE_NAME" --no-cache .
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Test if we can start the container (basic smoke test)
    print_status "Testing container startup..."
    docker run -d \
        --name "$CONTAINER_NAME-test" \
        --network host \
        --env-file .env \
        -v "$(pwd)/logs:/app/logs" \
        "$IMAGE_NAME"
    
    # Wait a bit for container to start
    sleep 5
    
    # Check if container is running
    if docker ps --filter name="$CONTAINER_NAME-test" --format "{{.Names}}" | grep -q "$CONTAINER_NAME-test"; then
        print_success "Container started successfully"
        
        # Try health check (but don't fail if database is not available)
        print_status "Attempting health check (may fail without local database)..."
        if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
            print_success "Application is fully healthy!"
        else
            print_warning "Health check failed (expected without local MariaDB)"
            print_status "This is normal for local testing - container starts correctly"
            print_status "Application will work properly when deployed with Plesk MariaDB"
        fi
    else
        print_error "Container failed to start"
        docker logs "$CONTAINER_NAME-test"
        docker stop "$CONTAINER_NAME-test" 2>/dev/null || true
        docker rm "$CONTAINER_NAME-test" 2>/dev/null || true
        exit 1
    fi
    
    # Stop test container
    docker stop "$CONTAINER_NAME-test"
    docker rm "$CONTAINER_NAME-test"
    
    print_success "Local build and test completed successfully"
    print_status "Image is ready for deployment to server with Plesk MariaDB"
}

# Function to build image only (no container testing)
build_only() {
    print_status "Building Docker image only..."
    
    # Build the application
    print_status "Building Docker image..."
    docker build -t "$IMAGE_NAME" --no-cache .
    
    print_success "Docker image built successfully"
    print_status "Image '$IMAGE_NAME' is ready for deployment"
    print_status "Use --local-test to test container startup, or deploy directly to server"
}

# Function to create deployment archive
create_deployment_archive() {
    print_status "Creating deployment archive..."
    
    local archive_name="a-moody-place-deployment-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Create list of files to include
    local files_to_include=(
        "Dockerfile"
        "docker-compose.yml"
        "package.json"
        "package-lock.json"
        "server.js"
        "healthcheck.js"
        ".env.example"
        "views/"
        "public/"
        "database/"
    )
    
    # Add files that exist
    local existing_files=()
    for file in "${files_to_include[@]}"; do
        if [[ -e "$file" ]]; then
            existing_files+=("$file")
        fi
    done
    
    # Create archive
    tar -czf "$archive_name" "${existing_files[@]}" --exclude="node_modules" --exclude="*.log" --exclude=".git" --exclude="docker-compose.yml"
    
    echo "$archive_name"
}

# Function to deploy to remote server
deploy_to_server() {
    local archive_name="$1"
    
    print_status "Deploying to server..."
    
    # Upload archive to server
    print_status "Uploading deployment archive..."
    scp "$archive_name" "$REMOTE_USER@$REMOTE_HOST:/tmp/"
    
    # Execute deployment commands on server
    print_status "Executing deployment on server..."
    ssh "$REMOTE_USER@$REMOTE_HOST" << EOF
        set -e
        
        # Create deployment directory if it doesn't exist
        sudo mkdir -p $REMOTE_PATH
        cd $REMOTE_PATH
        
        # Backup current deployment
        if [[ -f docker-compose.yml ]]; then
            echo "Creating backup of current deployment..."
            sudo cp -r . ../backup-\$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
        fi
        
        # Extract new deployment
        echo "Extracting new deployment..."
        sudo tar -xzf /tmp/$archive_name -C . --overwrite
        sudo chown -R \$USER:\$USER .
        
        # Clean up archive
        rm -f /tmp/$archive_name
        
        # Create .env if it doesn't exist
        if [[ ! -f .env ]]; then
            echo "Creating .env file from example..."
            cp .env.example .env
            echo "⚠️  IMPORTANT: Please edit .env with your actual production values!"
        fi
        
        # Ensure Docker is available
        if ! command -v docker &> /dev/null; then
            echo "Docker not found! Please install Docker first."
            exit 1
        fi
        
        # Stop and remove existing container
        echo "Stopping existing container..."
        docker stop a-moody-place-web 2>/dev/null || true
        docker rm a-moody-place-web 2>/dev/null || true
        
        # Create logs directory
        mkdir -p logs
        
        # Build Docker image
        echo "Building Docker image..."
        docker build -t a-moody-place-web .
        
        # Start container
        echo "Starting container..."
        docker run -d \\
            --name a-moody-place-web \\
            --network host \\
            --restart unless-stopped \\
            --env-file .env \\
            -v "\$(pwd)/logs:/app/logs" \\
            a-moody-place-web
        
        # Wait for services and test
        echo "Waiting for services to start..."
        sleep 15
        
        # Test application
        echo "Testing application..."
        for i in {1..30}; do
            if curl -f -s http://localhost:3000/health > /dev/null 2>&1; then
                echo "✅ Application is running successfully!"
                break
            elif [[ \$i -eq 30 ]]; then
                echo "❌ Application health check failed"
                docker logs a-moody-place-web
                exit 1
            else
                echo "Waiting for application... (attempt \$i/30)"
                sleep 2
            fi
        done
        
        # Show service status
        echo "Deployment complete! Container status:"
        docker ps --filter name=a-moody-place-web
        
        echo ""
        echo "🎉 Deployment successful!"
        echo "📊 Check logs with: docker logs -f a-moody-place-web"
        echo "🔄 Restart with: docker restart a-moody-place-web"
        echo "🛑 Stop with: docker stop a-moody-place-web"
EOF
    
    # Clean up local archive
    rm -f "$archive_name"
    
    print_success "Deployment completed successfully!"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --local-test    Only run local build and test (no deployment)"
    echo "  --build-only    Only build Docker image (no container startup test)"
    echo "  --skip-test     Skip local testing before deployment"
    echo "  --help          Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DEPLOY_USER     Remote server username (default: your_server_username)"
    echo "  DEPLOY_HOST     Remote server hostname/IP (default: your-server.example.com)"
    echo "  DEPLOY_PATH     Remote deployment path (default: /var/www/vhosts/a-moody-place.com)"
    echo ""
    echo "Examples:"
    echo "  $0                          # Full deployment with testing"
    echo "  $0 --local-test            # Only test locally"
    echo "  $0 --build-only            # Only build Docker image"
    echo "  $0 --skip-test             # Deploy without local testing"
    echo "  DEPLOY_USER=admin DEPLOY_HOST=server.example.com $0  # Custom server settings"
}

# Main deployment function
main() {
    local local_test_only=false
    local skip_test=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --local-test)
                local_test_only=true
                shift
                ;;
            --build-only)
                build_only
                exit 0
                ;;
            --skip-test)
                skip_test=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # Override defaults with environment variables
    REMOTE_USER="${DEPLOY_USER:-$REMOTE_USER}"
    REMOTE_HOST="${DEPLOY_HOST:-$REMOTE_HOST}"
    REMOTE_PATH="${DEPLOY_PATH:-$REMOTE_PATH}"
    
    echo ""
    echo "🎵 A Moody Place - Deployment Script"
    echo "====================================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Local testing
    if [[ "$skip_test" == false ]]; then
        local_build_test
    else
        print_warning "Skipping local testing"
    fi
    
    # If only local testing, exit here
    if [[ "$local_test_only" == true ]]; then
        print_success "Local testing completed. Use without --local-test flag to deploy."
        exit 0
    fi
    
    # Create deployment archive and deploy
    local archive=$(create_deployment_archive)
    deploy_to_server "$archive"
    
    echo ""
    echo "🎉 Deployment Complete!"
    echo ""
    echo "📍 Application should be available at:"
    echo "   http://$REMOTE_HOST:3000"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Configure Plesk reverse proxy to point to port 3000"
    echo "   2. Set up SSL certificate in Plesk"
    echo "   3. Update .env file with production values"
    echo "   4. Configure domain DNS if needed"
    echo ""
    echo "📚 For detailed setup instructions, see DEPLOYMENT.md"
    echo ""
}

# Run main function with all arguments
main "$@"