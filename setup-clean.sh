#!/bin/bash

# A Moody Place - Clean Docker Setup Script
# This script replaces the complex setup with clean, minimal files

set -e

echo "🎵 Setting up clean A Moody Place environment..."

# Backup original files
echo "📦 Backing up original files..."
if [ ! -d "backup-original" ]; then
    mkdir backup-original
    
    # Backup key files
    [ -f "package.json" ] && cp package.json backup-original/
    [ -f "server.js" ] && cp server.js backup-original/
    [ -d "views" ] && cp -r views backup-original/
    [ -d "public" ] && cp -r public backup-original/
    
    echo "✅ Backup complete"
else
    echo "ℹ️  Backup already exists, skipping..."
fi

# Replace with clean versions
echo "🔄 Installing clean versions..."

# Replace package.json
cp package-clean.json package.json
echo "✅ Updated package.json"

# Replace server
cp server-clean.js server.js
echo "✅ Updated server.js"

# Replace views directory
if [ -d "views-clean" ]; then
    rm -rf views
    mv views-clean views
    echo "✅ Updated views/"
fi

# Replace public directory
if [ -d "public-clean" ]; then
    rm -rf public
    mv public-clean public
    echo "✅ Updated public/"
fi

# Install clean dependencies
echo "📥 Installing clean dependencies..."
npm install

echo ""
echo "🎉 Clean setup complete!"
echo ""
echo "🐳 To start with Docker:"
echo "   docker-compose up --build"
echo ""
echo "🚀 To start locally:"
echo "   npm start"
echo ""
echo "🌍 Website will be available at:"
echo "   http://localhost:3000"
echo ""
echo "📂 Original files backed up in backup-original/"
echo ""