# GitGenius Credentials Setup Guide

This guide walks you through obtaining and configuring all required credentials for GitGenius.

## Table of Contents

1. [Required Credentials Overview](#required-credentials-overview)
2. [GitHub OAuth App Setup](#github-oauth-app-setup)
3. [GitHub Personal Access Token (PAT)](#github-personal-access-token-pat)
4. [Generating Secure Secrets](#generating-secure-secrets)
5. [Database Configuration](#database-configuration)
6. [Complete .env Setup](#complete-env-setup)
7. [PM2 Deployment](#pm2-deployment)

---

## Required Credentials Overview

| Credential | Purpose | How to Get |
|------------|---------|------------|
| `GITHUB_CLIENT_ID` | OAuth login | GitHub Developer Settings |
| `GITHUB_CLIENT_SECRET` | OAuth login | GitHub Developer Settings |
| `NEXTAUTH_SECRET` | Session encryption | Generate with OpenSSL |
| `ENCRYPTION_KEY` | Token encryption | Generate with OpenSSL |
| `DATABASE_URL` | PostgreSQL connection | Your DB setup |
| `REDIS_URL` | Job queue | Your Redis setup |

---

## GitHub OAuth App Setup

This enables "Sign in with GitHub" functionality.

### Step 1: Create OAuth App

1. Go to: https://github.com/settings/developers
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"** button

### Step 2: Fill in Application Details

**GitHub OAuth supports IP:PORT format!** You don't need a domain name.

#### Option A: Using IP Address + Port (No Domain Required)

| Field | Example Value |
|-------|---------------|
| **Application name** | `GitGenius` |
| **Homepage URL** | `http://YOUR_SERVER_IP:YOUR_PORT` |
| **Application description** | `GitHub contribution automation` |
| **Authorization callback URL** | `http://YOUR_SERVER_IP:YOUR_PORT/api/auth/callback/github` |

**Real examples:**
- Homepage: `http://192.168.1.50:3000` or `http://45.33.32.156:8080`
- Callback: `http://192.168.1.50:3000/api/auth/callback/github`

#### Option B: Using Domain Name

| Field | Development Value | Production Value |
|-------|-------------------|------------------|
| **Application name** | `GitGenius Dev` | `GitGenius` |
| **Homepage URL** | `http://localhost:3000` | `https://yourdomain.com` |
| **Application description** | `GitHub contribution automation` | `GitHub contribution automation` |
| **Authorization callback URL** | `http://localhost:3000/api/auth/callback/github` | `https://yourdomain.com/api/auth/callback/github` |

> **IMPORTANT**: The callback URL must be **exactly** as shown. A single typo will cause OAuth to fail.

### Step 3: Get Your Credentials

After creation:
1. Copy the **Client ID** → This is your `GITHUB_CLIENT_ID`
2. Click **"Generate a new client secret"**
3. Copy the secret **immediately** → This is your `GITHUB_CLIENT_SECRET`

> **WARNING**: The client secret is only shown once! Save it securely before leaving the page.

### Common OAuth Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "redirect_uri_mismatch" | Callback URL doesn't match | Check for typos, ensure http vs https matches |
| "application_suspended" | App was flagged | Contact GitHub support |
| "access_denied" | User rejected authorization | User needs to click "Authorize" |

---

## GitHub Personal Access Token (PAT)

Each GitHub account you want to automate needs a PAT. This is **separate** from the OAuth app.

### Step 1: Generate Token

1. Log into the GitHub account you want to automate
2. Go to: https://github.com/settings/tokens?type=beta
3. Click **"Generate new token"** → **"Fine-grained token"** (recommended)

### Step 2: Configure Token

| Setting | Value |
|---------|-------|
| **Token name** | `GitGenius Automation` |
| **Expiration** | 90 days (or custom, max 1 year) |
| **Description** | `Automated contributions via GitGenius` |
| **Repository access** | "All repositories" or select specific ones |

### Step 3: Set Permissions

Under **Repository permissions**:

| Permission | Access Level | Why Needed |
|------------|--------------|------------|
| **Contents** | Read and write | Create/update files, make commits |
| **Metadata** | Read-only | List repositories |

Under **Account permissions**:

| Permission | Access Level | Why Needed |
|------------|--------------|------------|
| **Email addresses** | Read-only | Verify account identity |

### Step 4: Copy Token

Click **"Generate token"** and copy it immediately. You'll enter this in the GitGenius dashboard when adding a GitHub account.

### Classic Token Alternative

If you prefer classic tokens:
1. Go to: https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `read:user` (Read user profile data)
   - `user:email` (Access user email addresses)

---

## Generating Secure Secrets

Run these commands on your server or local machine:

### NEXTAUTH_SECRET (32 bytes, base64)

```bash
openssl rand -base64 32
```

Example output: `K8x2mP9qL4nR7vB3cF6hJ1wA5tY8uI0oE+dG=`

### ENCRYPTION_KEY (32 bytes, hex = 64 characters)

```bash
openssl rand -hex 32
```

Example output: `a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456`

> **CRITICAL**: These are cryptographic secrets. Never share them, commit them to git, or reuse them across environments.

---

## Database Configuration

### Option A: Local PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE USER gitgenius WITH PASSWORD 'your_strong_password_here';
CREATE DATABASE gitgenius OWNER gitgenius;
GRANT ALL PRIVILEGES ON DATABASE gitgenius TO gitgenius;
\q
```

Your `DATABASE_URL`:
```
postgresql://gitgenius:your_strong_password_here@localhost:5432/gitgenius
```

### Option B: Docker PostgreSQL

Already configured in `docker-compose.yml`. Set a password:

```bash
# Generate a strong database password
openssl rand -base64 24
```

### Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Enable and start
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify it's running
redis-cli ping
# Should output: PONG
```

Your `REDIS_URL`:
```
redis://localhost:6379
```

---

## Complete .env Setup

Create your production `.env` file:

```bash
# On your server
sudo nano /opt/gitgenius/.env
```

Copy this template and fill in your values:

```env
# ===========================================
# GitGenius Production Environment
# ===========================================

# ---- Database ----
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://gitgenius:YOUR_DB_PASSWORD@localhost:5432/gitgenius"

# ---- Redis ----
REDIS_URL="redis://localhost:6379"

# ---- NextAuth ----
# Your production domain (no trailing slash)
NEXTAUTH_URL="https://yourdomain.com"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="YOUR_GENERATED_SECRET_HERE"

# ---- Encryption ----
# Generate with: openssl rand -hex 32
# Used to encrypt GitHub tokens at rest
ENCRYPTION_KEY="YOUR_64_CHAR_HEX_KEY_HERE"

# ---- GitHub OAuth ----
# From https://github.com/settings/developers
GITHUB_CLIENT_ID="Ov23li..."
GITHUB_CLIENT_SECRET="your_client_secret_here"

# ---- Node Environment ----
NODE_ENV="production"
```

Set secure permissions:

```bash
sudo chown gitgenius:gitgenius /opt/gitgenius/.env
sudo chmod 600 /opt/gitgenius/.env
```

---

## PM2 Deployment

### Initial Setup

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create gitgenius user (if not exists)
sudo useradd -r -m -d /opt/gitgenius -s /bin/bash gitgenius

# Create log directory
sudo mkdir -p /var/log/gitgenius
sudo chown gitgenius:gitgenius /var/log/gitgenius

# Copy application to /opt/gitgenius
sudo cp -r /path/to/gitgenius/* /opt/gitgenius/
sudo chown -R gitgenius:gitgenius /opt/gitgenius

# Switch to gitgenius user
sudo su - gitgenius
cd /opt/gitgenius

# Install dependencies
npm ci

# Build the application
npm run build

# Run database migrations
npx prisma migrate deploy

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script (run as root)
exit
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u gitgenius --hp /opt/gitgenius
```

### PM2 Commands Reference

```bash
# View status
pm2 status

# View logs
pm2 logs gitgenius-app
pm2 logs gitgenius-worker

# Restart services
pm2 restart all
pm2 restart gitgenius-app
pm2 restart gitgenius-worker

# Reload with zero downtime
pm2 reload gitgenius-app

# Stop services
pm2 stop all

# Monitor resources
pm2 monit

# View detailed info
pm2 show gitgenius-app
```

### Updating the Application

```bash
sudo su - gitgenius
cd /opt/gitgenius

# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Run migrations
npx prisma migrate deploy

# Rebuild
npm run build

# Reload with zero downtime
pm2 reload all
```

---

## Security Checklist

Before going live, verify:

- [ ] `.env` file has `chmod 600` permissions
- [ ] `.env` is NOT committed to git (check `.gitignore`)
- [ ] `NEXTAUTH_SECRET` is unique and random (32+ chars)
- [ ] `ENCRYPTION_KEY` is unique and random (64 hex chars)
- [ ] Database password is strong (24+ random chars)
- [ ] GitHub OAuth callback URL exactly matches your domain
- [ ] HTTPS is configured (required for OAuth in production)
- [ ] Firewall only allows ports 80, 443, 22

---

## Troubleshooting

### "Invalid client_id" Error
- Double-check `GITHUB_CLIENT_ID` in `.env`
- Ensure no extra spaces or quotes

### "redirect_uri_mismatch" Error
- Callback URL in GitHub must **exactly** match your domain
- Check http vs https
- Check for trailing slashes

### PM2 Not Starting
```bash
# Check logs
pm2 logs --err

# Verify .env exists
ls -la /opt/gitgenius/.env

# Check Node.js version
node --version  # Should be 20+
```

### Database Connection Failed
```bash
# Test PostgreSQL connection
psql -U gitgenius -d gitgenius -h localhost

# Check PostgreSQL is running
sudo systemctl status postgresql
```

### Worker Not Processing Jobs
```bash
# Check Redis is running
redis-cli ping

# Check worker logs
pm2 logs gitgenius-worker
```

---

## Quick Reference Card

```
+------------------------------------------+
|          GitGenius Credentials           |
+------------------------------------------+
| OAuth App:  github.com/settings/developers
| PAT:        github.com/settings/tokens
| Callback:   https://DOMAIN/api/auth/callback/github
|
| Generate secrets:
|   openssl rand -base64 32  (NEXTAUTH_SECRET)
|   openssl rand -hex 32     (ENCRYPTION_KEY)
|
| PM2 commands:
|   pm2 start ecosystem.config.js
|   pm2 status / logs / monit
|   pm2 reload all
+------------------------------------------+
```
