#!/bin/bash

echo "========================================"
echo "ACO Service - Automated Setup Script"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "[1/5] Checking Node.js version..."
node --version
echo ""

echo "[2/5] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi
echo ""

echo "[3/5] Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "Creating .env from template..."
    cp .env.example .env
    echo ""
    echo "WARNING: Please edit .env file with your Discord credentials!"
    echo ""
else
    echo ".env file already exists"
    echo ""
fi

echo "[4/5] Generating secure keys..."
npm run generate-keys
echo ""
echo "Copy these keys to your .env file!"
echo ""
read -p "Press enter to continue..."

echo "[5/5] Initializing database..."
npm run init-db
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to initialize database"
    exit 1
fi
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Edit .env file with your Discord credentials"
echo "2. Set up Google Forms (see GOOGLE_FORMS_SETUP.md)"
echo "3. Run: npm run dev (web server)"
echo "4. Run: npm run bot (Discord bot)"
echo ""
echo "For detailed instructions, see README.md"
echo ""
