#!/bin/bash

# GitGenius Ubuntu Server Deployment Script
# Run this script on a fresh Ubuntu 22.04+ server

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[GitGenius]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

error() {
    echo -e "${RED}[Error]${NC} $1"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

log "Starting GitGenius deployment..."

# Update system
log "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install required packages
log "Installing required packages..."
apt-get install -y curl wget git build-essential

# Install Node.js 20
log "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
log "Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Install Redis
log "Installing Redis..."
apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# Create gitgenius user
log "Creating gitgenius user..."
useradd -r -m -d /opt/gitgenius -s /bin/bash gitgenius || true

# Create directories
log "Creating directories..."
mkdir -p /opt/gitgenius
mkdir -p /var/log/gitgenius
chown -R gitgenius:gitgenius /opt/gitgenius
chown -R gitgenius:gitgenius /var/log/gitgenius

# Setup PostgreSQL
log "Setting up PostgreSQL database..."
DB_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql -c "CREATE USER gitgenius WITH PASSWORD '${DB_PASSWORD}';" || true
sudo -u postgres psql -c "CREATE DATABASE gitgenius OWNER gitgenius;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gitgenius TO gitgenius;" || true

# Clone or copy application
log "Setting up application..."
cd /opt/gitgenius

# If this script is run from the project directory, copy files
if [[ -f "./package.json" ]]; then
    cp -r ./* /opt/gitgenius/
else
    warn "No application files found. Please copy the application to /opt/gitgenius/"
fi

# Generate secrets
NEXTAUTH_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Create environment file
log "Creating environment file..."
cat > /opt/gitgenius/.env << EOF
# Database
DATABASE_URL="postgresql://gitgenius:${DB_PASSWORD}@localhost:5432/gitgenius"

# Redis
REDIS_URL="redis://localhost:6379"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"

# Encryption
ENCRYPTION_KEY="${ENCRYPTION_KEY}"

# GitHub OAuth (fill these in manually)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
EOF

chown gitgenius:gitgenius /opt/gitgenius/.env
chmod 600 /opt/gitgenius/.env

# Install dependencies and build
log "Installing dependencies..."
cd /opt/gitgenius
sudo -u gitgenius npm ci

log "Building application..."
sudo -u gitgenius npm run build

log "Running database migrations..."
sudo -u gitgenius npx prisma migrate deploy

# Install systemd services
log "Installing systemd services..."
cp /opt/gitgenius/systemd/gitgenius.service /etc/systemd/system/
cp /opt/gitgenius/systemd/gitgenius-worker.service /etc/systemd/system/

# Reload systemd and start services
systemctl daemon-reload
systemctl enable gitgenius
systemctl enable gitgenius-worker
systemctl start gitgenius
systemctl start gitgenius-worker

# Setup log rotation
log "Setting up log rotation..."
cat > /etc/logrotate.d/gitgenius << EOF
/var/log/gitgenius/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 gitgenius gitgenius
    sharedscripts
    postrotate
        systemctl reload gitgenius gitgenius-worker >/dev/null 2>&1 || true
    endscript
}
EOF

# Setup firewall
log "Configuring firewall..."
apt-get install -y ufw
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Print summary
echo ""
echo "=============================================="
log "GitGenius deployment complete!"
echo "=============================================="
echo ""
echo "Important information:"
echo "- Application URL: http://$(hostname -I | awk '{print $1}'):3000"
echo "- Database password saved in /opt/gitgenius/.env"
echo "- Logs: /var/log/gitgenius/"
echo ""
echo "Next steps:"
echo "1. Edit /opt/gitgenius/.env and add your GitHub OAuth credentials"
echo "2. Restart services: systemctl restart gitgenius gitgenius-worker"
echo "3. (Optional) Setup SSL with Let's Encrypt"
echo ""
echo "Service commands:"
echo "- Status: systemctl status gitgenius"
echo "- Logs: journalctl -u gitgenius -f"
echo "- Restart: systemctl restart gitgenius"
echo ""
