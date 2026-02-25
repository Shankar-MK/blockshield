#!/bin/bash

# BruteShield - Automated Setup Script
# This script will set up everything needed to run the platform

set -e

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║         BruteShield - Security Training Platform         ║"
echo "║                  Automated Setup Script                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "${BLUE}[1/5]${NC} Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js is not installed!${NC}"
    echo "Please install Node.js (v14 or higher) from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓${NC} Node.js ${NODE_VERSION} detected"
echo ""

# Check if npm is installed
echo -e "${BLUE}[2/5]${NC} Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}npm is not installed!${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓${NC} npm ${NPM_VERSION} detected"
echo ""

# Install dependencies
echo -e "${BLUE}[3/5]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Initialize database
echo -e "${BLUE}[4/5]${NC} Initializing database..."
node init-db.js
echo -e "${GREEN}✓${NC} Database initialized"
echo ""

# Create database directory if it doesn't exist
mkdir -p database

# Final setup
echo -e "${BLUE}[5/5]${NC} Final setup..."
chmod +x kali-attacks.sh
echo -e "${GREEN}✓${NC} Made Kali attacks script executable"
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                  Setup Complete! 🎉                       ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "To start the server, run:"
echo -e "${GREEN}npm start${NC}"
echo ""
echo "Then visit:"
echo -e "${GREEN}http://localhost:3000${NC}"
echo ""
echo "For development with auto-reload:"
echo -e "${GREEN}npm run dev${NC}"
echo ""
echo "To run Kali Linux attacks:"
echo -e "${GREEN}./kali-attacks.sh${NC}"
echo ""
echo "For more information, check:"
echo "  • README.md - Detailed documentation"
echo "  • QUICKSTART.md - Quick start guide"
echo ""
echo -e "${YELLOW}Remember: Use this platform ethically and legally!${NC}"
echo ""
