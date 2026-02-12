#!/bin/bash

# GitGenius Start Script
# This script starts both the Next.js app and the automation worker

set -e

echo "=========================================="
echo "       GitGenius Start Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the gitgenius directory.${NC}"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Check PostgreSQL
if command_exists psql; then
    echo -e "${GREEN}✓ PostgreSQL available${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL CLI not found (but service might still be running)${NC}"
fi

# Check Redis
if command_exists redis-cli; then
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Redis is running${NC}"
    else
        echo -e "${RED}✗ Redis is not responding. Please start Redis first.${NC}"
        echo "  Run: sudo systemctl start redis-server"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Redis CLI not found. Make sure Redis is running on port 6379.${NC}"
fi

echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Please create .env file with required configuration."
    echo "You can copy from .env.example: cp .env.example .env"
    exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Check for required env vars
if ! grep -q "DATABASE_URL" .env; then
    echo -e "${RED}Error: DATABASE_URL not found in .env${NC}"
    exit 1
fi
echo -e "${GREEN}✓ DATABASE_URL configured${NC}"

if ! grep -q "NEXTAUTH_SECRET" .env; then
    echo -e "${RED}Error: NEXTAUTH_SECRET not found in .env${NC}"
    exit 1
fi
echo -e "${GREEN}✓ NEXTAUTH_SECRET configured${NC}"

echo ""
echo -e "${BLUE}Starting GitGenius...${NC}"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
npx prisma db push

echo ""
echo -e "${GREEN}=========================================="
echo "       Starting Services"
echo "==========================================${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    kill $WORKER_PID 2>/dev/null || true
    kill $APP_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM

# Start the worker in background
echo -e "${BLUE}Starting automation worker...${NC}"
npm run worker &
WORKER_PID=$!
echo -e "${GREEN}✓ Worker started (PID: $WORKER_PID)${NC}"

# Wait a moment for worker to initialize
sleep 2

# Start the Next.js app
echo -e "${BLUE}Starting Next.js application...${NC}"
npm run dev &
APP_PID=$!
echo -e "${GREEN}✓ Application started (PID: $APP_PID)${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "       GitGenius is running!"
echo "==========================================${NC}"
echo ""
echo -e "  ${BLUE}Web App:${NC}     http://localhost:3000"
echo -e "  ${BLUE}Worker:${NC}      Running in background"
echo ""
echo -e "${YELLOW}How automation works:${NC}"
echo "  1. Add a GitHub account (Settings > Accounts > Add PAT)"
echo "  2. Sync repositories (Click 'Sync Repos' on the account)"
echo "  3. Enable automation on repositories (Repositories > Select > Toggle)"
echo "  4. Create an Automation Config (Automation > Create Config)"
echo "  5. The worker will automatically schedule and execute commits!"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for processes
wait $APP_PID $WORKER_PID
