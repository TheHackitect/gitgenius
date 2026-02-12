#!/bin/bash

# GitGenius PM2 Setup Script
# Automates the deployment process for PM2

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

# Check prerequisites
check_prereqs() {
    log "Checking prerequisites..."
    
    command -v node >/dev/null 2>&1 || error "Node.js is not installed. Install Node.js 20+ first."
    command -v npm >/dev/null 2>&1 || error "npm is not installed."
    command -v pm2 >/dev/null 2>&1 || { warn "PM2 not found. Installing..."; npm install -g pm2; }
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ required. Current: $(node -v)"
    fi
    
    log "All prerequisites met!"
}

# Generate secrets
generate_secrets() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           GENERATING SECURE SECRETS                ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=')
    
    echo -e "${GREEN}NEXTAUTH_SECRET=${NC}"
    echo "$NEXTAUTH_SECRET"
    echo ""
    echo -e "${GREEN}ENCRYPTION_KEY=${NC}"
    echo "$ENCRYPTION_KEY"
    echo ""
    echo -e "${GREEN}Suggested DB_PASSWORD=${NC}"
    echo "$DB_PASSWORD"
    echo ""
    
    info "Copy these values to your .env file!"
}

# Interactive .env creation
create_env() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           ENVIRONMENT CONFIGURATION               ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    ENV_FILE="${1:-.env}"
    
    if [ -f "$ENV_FILE" ]; then
        read -p "$(echo -e ${YELLOW}$ENV_FILE exists. Overwrite? [y/N]: ${NC})" OVERWRITE
        if [[ ! "$OVERWRITE" =~ ^[Yy]$ ]]; then
            log "Keeping existing $ENV_FILE"
            return
        fi
    fi
    
    # Generate secrets
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    ENCRYPTION_KEY=$(openssl rand -hex 32)
    
    echo ""
    info "Enter your configuration values (press Enter for defaults):"
    echo ""
    
    read -p "Database host [localhost]: " DB_HOST
    DB_HOST=${DB_HOST:-localhost}
    
    read -p "Database port [5432]: " DB_PORT
    DB_PORT=${DB_PORT:-5432}
    
    read -p "Database name [gitgenius]: " DB_NAME
    DB_NAME=${DB_NAME:-gitgenius}
    
    read -p "Database user [gitgenius]: " DB_USER
    DB_USER=${DB_USER:-gitgenius}
    
    read -sp "Database password: " DB_PASSWORD
    echo ""
    
    read -p "Redis URL [redis://localhost:6379]: " REDIS_URL
    REDIS_URL=${REDIS_URL:-redis://localhost:6379}
    
    echo ""
    info "Server URL - supports IP:PORT format (no domain required)"
    echo "  Examples:"
    echo "    http://localhost:3000"
    echo "    http://192.168.1.50:3000"
    echo "    http://45.33.32.156:8080"
    echo "    https://yourdomain.com"
    echo ""
    read -p "Your server URL: " DOMAIN
    DOMAIN=${DOMAIN:-http://localhost:3000}
    
    echo ""
    info "GitHub OAuth credentials"
    echo "  Create at: github.com/settings/developers"
    echo "  Use this callback URL: ${DOMAIN}/api/auth/callback/github"
    echo ""
    read -p "GitHub Client ID: " GITHUB_CLIENT_ID
    read -sp "GitHub Client Secret: " GITHUB_CLIENT_SECRET
    echo ""
    
    # Write .env file
    cat > "$ENV_FILE" << EOF
# ===========================================
# GitGenius Environment Configuration
# Generated: $(date)
# ===========================================

# ---- Database ----
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# ---- Redis ----
REDIS_URL="${REDIS_URL}"

# ---- NextAuth ----
NEXTAUTH_URL="${DOMAIN}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# ---- Encryption ----
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# ---- GitHub OAuth ----
GITHUB_CLIENT_ID="${GITHUB_CLIENT_ID}"
GITHUB_CLIENT_SECRET="${GITHUB_CLIENT_SECRET}"

# ---- Node Environment ----
NODE_ENV="production"
EOF

    chmod 600 "$ENV_FILE"
    log "Created $ENV_FILE with secure permissions (600)"
}

# Setup database
setup_database() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           DATABASE SETUP                          ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    if command -v psql >/dev/null 2>&1; then
        read -p "Create PostgreSQL database? [Y/n]: " CREATE_DB
        if [[ ! "$CREATE_DB" =~ ^[Nn]$ ]]; then
            read -p "Database name [gitgenius]: " DB_NAME
            DB_NAME=${DB_NAME:-gitgenius}
            
            read -p "Database user [gitgenius]: " DB_USER
            DB_USER=${DB_USER:-gitgenius}
            
            read -sp "Database password: " DB_PASSWORD
            echo ""
            
            sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || warn "User may already exist"
            sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || warn "Database may already exist"
            sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null
            
            log "Database setup complete!"
        fi
    else
        warn "PostgreSQL client not found. Please setup database manually."
    fi
}

# Build and deploy
deploy() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}           BUILDING AND DEPLOYING                  ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""
    
    log "Installing dependencies..."
    npm ci
    
    log "Generating Prisma client..."
    npx prisma generate
    
    log "Running database migrations..."
    npx prisma migrate deploy
    
    log "Building Next.js application..."
    npm run build
    
    log "Starting with PM2..."
    pm2 start ecosystem.config.js
    
    log "Saving PM2 process list..."
    pm2 save
    
    echo ""
    log "Deployment complete!"
    echo ""
    pm2 status
}

# Setup PM2 startup
setup_startup() {
    echo ""
    log "Setting up PM2 startup script..."
    
    pm2 startup
    pm2 save
    
    log "PM2 will now start automatically on system boot!"
}

# Show help
show_help() {
    echo ""
    echo -e "${CYAN}GitGenius PM2 Setup Script${NC}"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  secrets     Generate secure secrets (NEXTAUTH_SECRET, ENCRYPTION_KEY)"
    echo "  env         Interactive .env file creation"
    echo "  database    Setup PostgreSQL database"
    echo "  deploy      Build and deploy with PM2"
    echo "  startup     Configure PM2 to start on boot"
    echo "  all         Run complete setup (env + database + deploy + startup)"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 secrets              # Just generate secrets"
    echo "  $0 env                  # Create .env interactively"
    echo "  $0 all                  # Complete setup"
    echo ""
}

# Main
main() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          GitGenius PM2 Setup Script                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    case "${1:-help}" in
        secrets)
            generate_secrets
            ;;
        env)
            create_env "$2"
            ;;
        database)
            setup_database
            ;;
        deploy)
            check_prereqs
            deploy
            ;;
        startup)
            setup_startup
            ;;
        all)
            check_prereqs
            create_env
            setup_database
            deploy
            setup_startup
            ;;
        help|*)
            show_help
            ;;
    esac
}

main "$@"
