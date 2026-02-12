#!/bin/bash

# ConsultaMed Backend - Render Build Script
# =========================================
# Installs system dependencies required for WeasyPrint
# and prepares the Python environment for production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running in Render environment
if [ "$RENDER" = "true" ]; then
    print_status "Running in Render environment"
else
    print_warning "Not in Render environment, but continuing anyway"
fi

# Update package lists
print_status "Updating package lists..."
apt-get update

# Install system dependencies for WeasyPrint
# Based on: https://doc.courtbouillon.org/weasyprint/latest/install.html
print_status "Installing WeasyPrint system dependencies..."
apt-get install -y \
    build-essential \
    python3-dev \
    python3-pip \
    python3-setuptools \
    python3-wheel \
    python3-cffi \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info

# Additional dependencies for better image support
print_status "Installing additional image processing dependencies..."
apt-get install -y \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev

# Clean up apt caches to reduce image size
print_status "Cleaning up apt caches..."
apt-get clean
rm -rf /var/lib/apt/lists/*

# Upgrade pip
print_status "Upgrading pip..."
python3 -m pip install --upgrade pip setuptools wheel

# Install Python dependencies
print_status "Installing Python dependencies..."
pip install -r requirements.txt

# Verify WeasyPrint installation
print_status "Verifying WeasyPrint installation..."
python3 -c "import weasyprint; print(f'WeasyPrint version: {weasyprint.__version__}')"

# Dry-run mode for testing
if [ "$1" = "--dry-run" ]; then
    print_status "Dry-run mode complete - script syntax is valid"
    exit 0
fi

print_status "Build completed successfully!"
print_status "Backend is ready for deployment on Render"