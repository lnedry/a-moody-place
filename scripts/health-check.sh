#!/bin/bash

# ========================================
# A Moody Place - Health Check Script
# ========================================
# 
# This script performs comprehensive health checks on the application
# and automatically attempts recovery procedures if issues are detected.
# 
# Usage: ./scripts/health-check.sh [--fix] [--verbose]
# 
# Options:
#   --fix      Attempt to fix issues automatically
#   --verbose  Show detailed output
#   --silent   Only show errors

set -euo pipefail

# ========================================
# CONFIGURATION
# ========================================

APP_NAME="a-moody-place"
APP_DIR="/var/www/vhosts/a-moody-place.com"
APP_URL="http://localhost:3000"
LOG_FILE="$APP_DIR/logs/health-check.log"
PID_FILE="/var/run/a-moody-place.pid"

# Command line options
FIX_ISSUES=false
VERBOSE=false
SILENT=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_ISSUES=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --silent)
            SILENT=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for output (only if not silent)
if [[ "$SILENT" != true ]]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m' # No Color
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# ========================================
# UTILITY FUNCTIONS
# ========================================

log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    
    # Log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    
    # Output to console based on level and verbosity
    if [[ "$SILENT" != true ]]; then
        case $level in
            "INFO")
                if [[ "$VERBOSE" == true ]]; then
                    echo -e "${BLUE}[INFO]${NC} $message"
                fi
                ;;
            "WARN")
                echo -e "${YELLOW}[WARN]${NC} $message"
                ;;
            "ERROR")
                echo -e "${RED}[ERROR]${NC} $message"
                ;;
            "SUCCESS")
                echo -e "${GREEN}[SUCCESS]${NC} $message"
                ;;
        esac
    elif [[ $level == "ERROR" ]]; then
        # Always show errors even in silent mode
        echo -e "${RED}[ERROR]${NC} $message" >&2
    fi
}

# ========================================
# HEALTH CHECK FUNCTIONS
# ========================================

check_service_status() {
    log_message "INFO" "Checking service status..."
    
    if systemctl is-active --quiet $APP_NAME; then
        log_message "SUCCESS" "Service $APP_NAME is running"
        return 0
    else
        log_message "ERROR" "Service $APP_NAME is not running"
        return 1
    fi
}

check_application_response() {
    log_message "INFO" "Checking application response..."
    
    local start_time=$(date +%s%N)
    
    if curl -f -s --max-time 10 "$APP_URL/health" > /dev/null; then
        local end_time=$(date +%s%N)
        local duration=$((($end_time - $start_time) / 1000000))  # Convert to milliseconds
        
        log_message "SUCCESS" "Application responding (${duration}ms)"
        return 0
    else
        log_message "ERROR" "Application not responding at $APP_URL/health"
        return 1
    fi
}

check_database_connection() {
    log_message "INFO" "Checking database connection..."
    
    cd "$APP_DIR"
    if sudo -u www-data node -e "require('./database/config').testConnection().then(() => process.exit(0)).catch(() => process.exit(1))" 2>/dev/null; then
        log_message "SUCCESS" "Database connection successful"
        return 0
    else
        log_message "ERROR" "Database connection failed"
        return 1
    fi
}

check_disk_space() {
    log_message "INFO" "Checking disk space..."
    
    local usage=$(df "$APP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $usage -lt 90 ]]; then
        log_message "SUCCESS" "Disk usage OK (${usage}%)"
        return 0
    elif [[ $usage -lt 95 ]]; then
        log_message "WARN" "Disk usage high (${usage}%)"
        return 1
    else
        log_message "ERROR" "Disk usage critical (${usage}%)"
        return 2
    fi
}

check_memory_usage() {
    log_message "INFO" "Checking memory usage..."
    
    local memory_info=$(free | grep Mem)
    local total=$(echo $memory_info | awk '{print $2}')
    local used=$(echo $memory_info | awk '{print $3}')
    local usage=$((used * 100 / total))
    
    if [[ $usage -lt 80 ]]; then
        log_message "SUCCESS" "Memory usage OK (${usage}%)"
        return 0
    elif [[ $usage -lt 90 ]]; then
        log_message "WARN" "Memory usage high (${usage}%)"
        return 1
    else
        log_message "ERROR" "Memory usage critical (${usage}%)"
        return 2
    fi
}

check_nginx_status() {
    log_message "INFO" "Checking Nginx status..."
    
    if systemctl is-active --quiet nginx; then
        log_message "SUCCESS" "Nginx is running"
        return 0
    else
        log_message "ERROR" "Nginx is not running"
        return 1
    fi
}

check_ssl_certificate() {
    log_message "INFO" "Checking SSL certificate..."
    
    local domain="a-moody-place.com"
    local cert_file="/etc/letsencrypt/live/$domain/fullchain.pem"
    
    if [[ -f "$cert_file" ]]; then
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( ($expiry_timestamp - $current_timestamp) / 86400 ))
        
        if [[ $days_until_expiry -gt 30 ]]; then
            log_message "SUCCESS" "SSL certificate valid for $days_until_expiry days"
            return 0
        elif [[ $days_until_expiry -gt 7 ]]; then
            log_message "WARN" "SSL certificate expires in $days_until_expiry days"
            return 1
        else
            log_message "ERROR" "SSL certificate expires in $days_until_expiry days"
            return 2
        fi
    else
        log_message "ERROR" "SSL certificate file not found"
        return 1
    fi
}

check_log_file_sizes() {
    log_message "INFO" "Checking log file sizes..."
    
    local max_size=100  # MB
    local issues=0
    
    if [[ -d "$APP_DIR/logs" ]]; then
        while IFS= read -r -d '' log_file; do
            local size=$(du -m "$log_file" | cut -f1)
            if [[ $size -gt $max_size ]]; then
                log_message "WARN" "Large log file: $(basename "$log_file") (${size}MB)"
                ((issues++))
            fi
        done < <(find "$APP_DIR/logs" -name "*.log" -print0)
    fi
    
    if [[ $issues -eq 0 ]]; then
        log_message "SUCCESS" "Log file sizes OK"
        return 0
    else
        log_message "WARN" "$issues large log files found"
        return 1
    fi
}

# ========================================
# RECOVERY FUNCTIONS
# ========================================

restart_application() {
    log_message "INFO" "Restarting application..."
    
    if systemctl restart $APP_NAME; then
        sleep 5  # Give it time to start
        
        if systemctl is-active --quiet $APP_NAME; then
            log_message "SUCCESS" "Application restarted successfully"
            return 0
        else
            log_message "ERROR" "Application failed to start after restart"
            return 1
        fi
    else
        log_message "ERROR" "Failed to restart application"
        return 1
    fi
}

restart_nginx() {
    log_message "INFO" "Restarting Nginx..."
    
    if systemctl restart nginx; then
        log_message "SUCCESS" "Nginx restarted successfully"
        return 0
    else
        log_message "ERROR" "Failed to restart Nginx"
        return 1
    fi
}

clean_old_logs() {
    log_message "INFO" "Cleaning old log files..."
    
    # Remove logs older than 30 days
    find "$APP_DIR/logs" -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    # Truncate large current log files
    find "$APP_DIR/logs" -name "*.log" -size +100M -exec truncate -s 50M {} \; 2>/dev/null || true
    
    log_message "SUCCESS" "Log cleanup completed"
}

renew_ssl_certificate() {
    log_message "INFO" "Attempting to renew SSL certificate..."
    
    if certbot renew --quiet; then
        systemctl reload nginx
        log_message "SUCCESS" "SSL certificate renewed"
        return 0
    else
        log_message "ERROR" "SSL certificate renewal failed"
        return 1
    fi
}

# ========================================
# MAIN HEALTH CHECK PROCESS
# ========================================

run_health_checks() {
    local overall_status=0
    local issues_found=0
    local critical_issues=0
    
    log_message "INFO" "Starting health check for A Moody Place..."
    
    # Array of check functions and their names
    declare -a checks=(
        "check_service_status:Service Status"
        "check_nginx_status:Nginx Status"
        "check_application_response:Application Response"
        "check_database_connection:Database Connection"
        "check_disk_space:Disk Space"
        "check_memory_usage:Memory Usage"
        "check_ssl_certificate:SSL Certificate"
        "check_log_file_sizes:Log File Sizes"
    )
    
    # Run each check
    for check_info in "${checks[@]}"; do
        IFS=':' read -r check_function check_name <<< "$check_info"
        
        if $check_function; then
            continue  # Check passed
        else
            local exit_code=$?
            ((issues_found++))
            
            if [[ $exit_code -eq 2 ]]; then
                ((critical_issues++))
            fi
            
            # Attempt fixes if requested
            if [[ "$FIX_ISSUES" == true ]]; then
                case $check_function in
                    "check_service_status")
                        restart_application
                        ;;
                    "check_nginx_status")
                        restart_nginx
                        ;;
                    "check_application_response")
                        restart_application
                        ;;
                    "check_log_file_sizes")
                        clean_old_logs
                        ;;
                    "check_ssl_certificate")
                        if [[ $exit_code -eq 2 ]]; then
                            renew_ssl_certificate
                        fi
                        ;;
                esac
            fi
        fi
    done
    
    # Summary
    if [[ $issues_found -eq 0 ]]; then
        log_message "SUCCESS" "All health checks passed"
        overall_status=0
    elif [[ $critical_issues -eq 0 ]]; then
        log_message "WARN" "Health check completed with $issues_found warnings"
        overall_status=1
    else
        log_message "ERROR" "Health check failed with $critical_issues critical issues and $issues_found total issues"
        overall_status=2
    fi
    
    return $overall_status
}

# ========================================
# NOTIFICATION FUNCTIONS
# ========================================

send_notification() {
    local status=$1
    local message=$2
    
    # Here you could add email notifications, Slack webhooks, etc.
    # For now, we'll just log the notification
    
    case $status in
        0)
            log_message "INFO" "NOTIFICATION: $message"
            ;;
        1)
            log_message "WARN" "NOTIFICATION: $message"
            ;;
        2)
            log_message "ERROR" "NOTIFICATION: $message"
            ;;
    esac
}

# ========================================
# SCRIPT EXECUTION
# ========================================

main() {
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Run health checks
    if run_health_checks; then
        send_notification 0 "A Moody Place health check: All systems operational"
        exit 0
    else
        local exit_code=$?
        
        if [[ $exit_code -eq 1 ]]; then
            send_notification 1 "A Moody Place health check: Warnings detected"
        else
            send_notification 2 "A Moody Place health check: Critical issues detected"
        fi
        
        exit $exit_code
    fi
}

# Check if script is being sourced or executed
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi