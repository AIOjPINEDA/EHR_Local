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

print_status "Skipping apt-get system package installation in Render native runtime"
print_status "If extra OS packages are required, deploy this service with Docker runtime"

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