#!/bin/bash

# A Moody Place - Docker Run Script
# Simple replacement for docker-compose for single container deployment

set -e

# Configuration
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

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  up        Build and start the container (default)"
    echo "  down      Stop and remove the container"
    echo "  restart   Restart the container"
    echo "  logs      Show container logs"
    echo "  build     Build the Docker image"
    echo "  ps        Show container status"
    echo "  shell     Open shell in running container"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                # Build and start container"
    echo "  $0 up             # Build and start container"
    echo "  $0 down           # Stop and remove container"
    echo "  $0 logs           # Show container logs"
}

# Function to build image
build_image() {
    print_status "Building Docker image..."
    docker build -t "$IMAGE_NAME" .
    print_success "Image built successfully"
}

# Function to start container
start_container() {
    print_status "Starting container..."
    
    # Create logs directory if it doesn't exist
    mkdir -p logs
    
    # Check if .env exists
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            print_warning ".env file not found, copying from .env.example"
            cp .env.example .env
            print_warning "Please edit .env with your configuration"
        else
            print_error ".env file not found and no .env.example available"
            exit 1
        fi
    fi
    
    # Start container
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network host \
        --restart unless-stopped \
        --env-file .env \
        -v "$(pwd)/logs:/app/logs" \
        "$IMAGE_NAME"
    
    print_success "Container started successfully"
    print_status "Application should be available at: http://localhost:3000"
    print_status "Use '$0 logs' to view container logs"
}

# Function to stop container
stop_container() {
    print_status "Stopping and removing container..."
    docker stop "$CONTAINER_NAME" 2>/dev/null || print_warning "Container was not running"
    docker rm "$CONTAINER_NAME" 2>/dev/null || print_warning "Container was not found"
    print_success "Container stopped and removed"
}

# Function to restart container
restart_container() {
    print_status "Restarting container..."
    docker restart "$CONTAINER_NAME" 2>/dev/null || {
        print_warning "Container not found, starting new one..."
        start_container
        return
    }
    print_success "Container restarted successfully"
}

# Function to show logs
show_logs() {
    docker logs -f "$CONTAINER_NAME" 2>/dev/null || {
        print_error "Container '$CONTAINER_NAME' not found"
        print_status "Run '$0 up' to start the container first"
        exit 1
    }
}

# Function to show container status
show_status() {
    print_status "Container status:"
    docker ps --filter name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || print_error "Failed to get container status"
    echo ""
    print_status "Image info:"
    docker images --filter reference="$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" || print_error "Failed to get image info"
}

# Function to open shell in container
open_shell() {
    docker exec -it "$CONTAINER_NAME" /bin/sh 2>/dev/null || {
        print_error "Container '$CONTAINER_NAME' not found or not running"
        print_status "Run '$0 up' to start the container first"
        exit 1
    }
}

# Function to bring up the application (build + start)
up() {
    # Stop existing container
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    
    # Build and start
    build_image
    start_container
}

# Main function
main() {
    local command="${1:-up}"
    
    case $command in
        up)
            up
            ;;
        down)
            stop_container
            ;;
        restart)
            restart_container
            ;;
        logs)
            show_logs
            ;;
        build)
            build_image
            ;;
        ps|status)
            show_status
            ;;
        shell|sh|bash)
            open_shell
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"