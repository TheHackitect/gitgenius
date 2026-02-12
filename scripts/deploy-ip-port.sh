#!/bin/bash

# GitGenius IP:PORT Quick Deploy Script
# For hosting without a domain name - uses server IP and custom port
#
# This is a simplified deployment that runs Next.js directly on your chosen port
# No nginx required (though you can add it later for caching/SSL)

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[GitGenius]${NC} $1"; }
warn() { echo -e "${YELLOW}[Warning]${NC} $1"; }
error() { echo -e "${RED}[Error]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[Info]${NC} $1"; }

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     GitGenius IP:PORT Deployment (No Domain)         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# Detect server IP
get_server_ip() {
    # Try to get public IP first
    PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || \
                curl -s --max-time 5 ipinfo.io/ip 2>/dev/null || \
                curl -s --max-time 5 icanhazip.com 2>/dev/null || \
                echo "")
    
    # Get local IP as fallback
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    if [ -n "$PUBLIC_IP" ]; then
        echo "$PUBLIC_IP"
    else
        echo "$LOCAL_IP"
    fi
}

# Main setup
main() {
    info "Detecting your server IP..."
    DETECTED_IP=$(get_server_ip)
    echo ""
    
    # Get configuration
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           SERVER CONFIGURATION                    ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    echo "Detected IP: $DETECTED_IP"
    echo ""
    read -p "Server IP [$DETECTED_IP]: " SERVER_IP
    SERVER_IP=${SERVER_IP:-$DETECTED_IP}
    
    read -p "Port to run on [3000]: " SERVER_PORT
    SERVER_PORT=${SERVER_PORT:-3000}
    
    SERVER_URL="http://${SERVER_IP}:${SERVER_PORT}"
    CALLBACK_URL="${SERVER_URL}/api/auth/callback/github"
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Your GitGenius will be available at:             ${NC}"
    echo -e "${GREEN}  ${SERVER_URL}                    ${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    # GitHub OAuth instructions
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           GITHUB OAUTH SETUP                      ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "1. Go to: https://github.com/settings/developers"
    echo "2. Click 'New OAuth App'"
    echo "3. Use these EXACT values:"
    echo ""
    echo -e "   ${CYAN}Application name:${NC}          GitGenius"
    echo -e "   ${CYAN}Homepage URL:${NC}              ${SERVER_URL}"
    echo -e "   ${CYAN}Application description:${NC}   GitHub automation"
    echo -e "   ${CYAN}Authorization callback URL:${NC} ${CALLBACK_URL}"
    echo ""
    echo "4. Click 'Register application'"
    echo "5. Copy the Client ID"
    echo "6. Click 'Generate a new client secret' and copy it"
    echo ""
    read -p "Press Enter when you have your GitHub OAuth credentials..."
    
    echo ""
    read -p "GitHub Client ID: " GITHUB_CLIENT_ID
    read -sp "GitHub Client Secret: " GITHUB_CLIENT_SECRET
    echo ""
    
    # Database configuration
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           DATABASE CONFIGURATION                  ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    read -p "PostgreSQL host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "PostgreSQL port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Database name [gitgenius]: " DB_NAME
    DB_NAME=${DB_NAME:-gitgenius}
    
    read -p "Database user [gitgenius]: " DB_USER
    DB_USER=${DB_USER:-gitgenius}
    
    read -sp "Database password: " DB_PASSWORD
    echo ""
    
    read -p "Redis URL [redis://localhost:6379]: " REDIS_URL
    REDIS_URL=${REDIS_URL:-redis://localhost:6379}
    
    # Generate secrets
    log "Generating secure secrets..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    # Create .env file
    log "Creating .env file..."
    cat > .env << EOF
# ===========================================
# GitGenius Environment Configuration
# Generated: $(date)
# Server: ${SERVER_URL}
# ===========================================

# Application URL (IP:PORT format - no domain required)
NEXT_PUBLIC_APP_URL="${SERVER_URL}"
NODE_ENV=production

# Database
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Redis
REDIS_URL="${REDIS_URL}"

# NextAuth - MUST match your GitHub OAuth callback URL
NEXTAUTH_URL="${SERVER_URL}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# GitHub OAuth (configured for ${SERVER_URL})
GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID}"
GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET}"

# Token encryption
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# Server port (used by Next.js)
PORT=${SERVER_PORT}
EOF
    
    chmod 600 .env
    log ".env file created with secure permissions"
    
    # Install and build
    echo ""
    log "Installing dependencies..."
    npm ci
    
    log "Running database migrations..."
    npx prisma migrate deploy || npx prisma db push
    
    log "Building Next.js application..."
    npm run build
    
    # Update ecosystem.config.js with correct port
    log "Configuring PM2..."
    sed -i "s/PORT: 3000/PORT: ${SERVER_PORT}/" ecosystem.config.js 2>/dev/null || true
    
    # Start with PM2
    log "Starting with PM2..."
    pm2 delete gitgenius-app gitgenius-worker 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    
    # Open firewall port
    if command -v ufw >/dev/null 2>&1; then
        log "Opening firewall port ${SERVER_PORT}..."
        sudo ufw allow ${SERVER_PORT}/tcp 2>/dev/null || warn "Could not configure firewall"
    fi
    
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           DEPLOYMENT COMPLETE!                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "GitGenius is now running at: ${CYAN}${SERVER_URL}${NC}"
    echo ""
    echo "Quick commands:"
    echo "  pm2 status          - Check if running"
    echo "  pm2 logs            - View logs"
    echo "  pm2 restart all     - Restart services"
    echo ""
    echo "GitHub OAuth callback URL (already configured):"
    echo "  ${CALLBACK_URL}"
    echo ""
    
    # Test if accessible
    sleep 3
    if curl -s --max-time 5 "${SERVER_URL}" >/dev/null 2>&1; then
        log "Server is responding! Open ${SERVER_URL} in your browser."
    else
        warn "Server may still be starting up. Try accessing ${SERVER_URL} in a minute."
    fi
}

main "$@"
