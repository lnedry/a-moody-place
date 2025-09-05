#!/bin/bash

# Domain Validation Script
# This script checks for incorrect domain references across the codebase
# CORRECT: a-moody-place.com
# INCORRECT: amoodyplace.com (without hyphens)

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
CORRECT_DOMAIN="a-moody-place.com"
INCORRECT_DOMAIN="amoodyplace.com"
CORRECT_PREFIX="a-moody-place"
INCORRECT_PREFIX="amoodyplace"

# Counters
TOTAL_ERRORS=0
CHECK_COUNT=0

# Function to log messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((TOTAL_ERRORS++))
}

# Function to check for incorrect domain references
check_domain_references() {
    local file="$1"
    local line_num
    local content
    
    # Skip binary files and certain directories
    if file "$file" | grep -q "binary\|image\|archive"; then
        return 0
    fi
    
    # Check for incorrect domain (.com)
    if grep -n "$INCORRECT_DOMAIN" "$file" 2>/dev/null; then
        while IFS=: read -r line_num content; do
            log_error "Incorrect domain in $file:$line_num - Found '$INCORRECT_DOMAIN', should be '$CORRECT_DOMAIN'"
        done < <(grep -n "$INCORRECT_DOMAIN" "$file" 2>/dev/null || true)
    fi
    
    # Check for incorrect prefix (without .com)
    # But skip social media handles (@amoodyplace is correct)
    if grep -n "$INCORRECT_PREFIX" "$file" 2>/dev/null | grep -v "@$INCORRECT_PREFIX" | grep -v "instagram\|twitter\|tiktok\|youtube\|social"; then
        while IFS=: read -r line_num content; do
            # Skip social media context
            if echo "$content" | grep -q "@$INCORRECT_PREFIX\|instagram\|twitter\|tiktok\|youtube\|social"; then
                continue
            fi
            log_error "Incorrect prefix in $file:$line_num - Found '$INCORRECT_PREFIX', should be '$CORRECT_PREFIX'"
        done < <(grep -n "$INCORRECT_PREFIX" "$file" 2>/dev/null | grep -v "@$INCORRECT_PREFIX" | grep -v "instagram\|twitter\|tiktok\|youtube\|social" || true)
    fi
}

# Main validation function
validate_codebase() {
    log_info "Starting domain validation for $CORRECT_DOMAIN..."
    log_info "Checking for incorrect references to '$INCORRECT_DOMAIN' and '$INCORRECT_PREFIX'"
    
    # Find all relevant files
    local files_to_check=(
        "app.js"
        ".env.example"
        "scripts/"
        "config/"
        "routes/"
        "security/"
        "database/"
        "*.md"
        "package.json"
        "technical-specification.md"
        "README.md"
        "DEPLOYMENT.md"
        "CLAUDE.md"
    )
    
    # Check specific files
    for pattern in "${files_to_check[@]}"; do
        if [[ "$pattern" == */ ]]; then
            # Directory - check all files within
            if [[ -d "$pattern" ]]; then
                find "$pattern" -type f -name "*" | while read -r file; do
                    ((CHECK_COUNT++))
                    check_domain_references "$file"
                done
            fi
        else
            # File pattern - use find with pattern
            find . -maxdepth 1 -name "$pattern" -type f | while read -r file; do
                ((CHECK_COUNT++))
                check_domain_references "$file"
            done
        fi
    done
}

# Check for renamed configuration files
validate_config_files() {
    log_info "Validating configuration file names..."
    
    # Check if old config files still exist
    if [[ -f "config/nginx-amoodyplace.conf" ]]; then
        log_error "Old nginx config file still exists: config/nginx-amoodyplace.conf"
        log_info "Should be renamed to: config/nginx-a-moody-place.conf"
    fi
    
    if [[ -f "config/amoodyplace.service" ]]; then
        log_error "Old systemd service file still exists: config/amoodyplace.service"
        log_info "Should be renamed to: config/a-moody-place.service"
    fi
    
    if [[ -f "config/logrotate-amoodyplace" ]]; then
        log_error "Old logrotate config still exists: config/logrotate-amoodyplace"
        log_info "Should be renamed to: config/logrotate-a-moody-place"
    fi
    
    # Check if new config files exist
    if [[ -f "config/nginx-a-moody-place.conf" ]]; then
        log_info "✓ Correct nginx config file exists: config/nginx-a-moody-place.conf"
    else
        log_warning "Missing nginx config file: config/nginx-a-moody-place.conf"
    fi
    
    if [[ -f "config/a-moody-place.service" ]]; then
        log_info "✓ Correct systemd service file exists: config/a-moody-place.service"
    else
        log_warning "Missing systemd service file: config/a-moody-place.service"
    fi
    
    if [[ -f "config/logrotate-a-moody-place" ]]; then
        log_info "✓ Correct logrotate config exists: config/logrotate-a-moody-place"
    else
        log_warning "Missing logrotate config: config/logrotate-a-moody-place"
    fi
}

# Validate deployment scripts reference correct file names
validate_deployment_references() {
    log_info "Validating deployment script references..."
    
    if [[ -f "scripts/deploy.sh" ]]; then
        if grep -q "nginx-amoodyplace.conf" "scripts/deploy.sh"; then
            log_error "Deployment script references old nginx config: nginx-amoodyplace.conf"
        fi
        
        if grep -q "amoodyplace.service" "scripts/deploy.sh"; then
            log_error "Deployment script references old systemd service: amoodyplace.service"
        fi
        
        if grep -q "nginx-a-moody-place.conf" "scripts/deploy.sh"; then
            log_info "✓ Deployment script references correct nginx config"
        fi
        
        if grep -q "a-moody-place.service" "scripts/deploy.sh"; then
            log_info "✓ Deployment script references correct systemd service"
        fi
    fi
}

# Main execution
main() {
    log_info "Domain Validation Script for A Moody Place"
    log_info "=========================================="
    
    # Change to project root if script is run from scripts directory
    if [[ $(basename "$PWD") == "scripts" ]]; then
        cd ..
    fi
    
    validate_codebase
    validate_config_files
    validate_deployment_references
    
    echo
    log_info "Validation complete!"
    if [[ $TOTAL_ERRORS -eq 0 ]]; then
        log_info "✅ No domain naming errors found!"
    else
        log_error "❌ Found $TOTAL_ERRORS domain naming errors that need to be fixed"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Domain Validation Script"
        echo "Usage: $0 [--help|--fix]"
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --fix         Show suggested fixes for found errors (not implemented)"
        echo ""
        echo "This script validates that all domain references use 'a-moody-place.com'"
        echo "instead of the incorrect 'amoodyplace.com'"
        exit 0
        ;;
    --fix)
        log_warning "Automatic fixing is not implemented. Please fix errors manually."
        log_info "Use the following commands to fix common issues:"
        echo "  • Replace domain: sed -i 's/amoodyplace\\.com/a-moody-place.com/g' FILE"
        echo "  • Replace prefix: sed -i 's/amoodyplace/a-moody-place/g' FILE"
        echo "  • Rename files: mv config/old-name config/new-name"
        ;;
    *)
        main
        ;;
esac