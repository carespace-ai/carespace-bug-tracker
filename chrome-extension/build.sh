#!/bin/bash

# Carespace Bug Reporter - Production Build Script
# Creates a production-ready ZIP file for Chrome Web Store submission

set -e  # Exit on error

echo "🚀 Building Carespace Bug Reporter Chrome Extension..."

# Configuration
VERSION=$(node -p "require('./manifest.json').version")
BUILD_DIR="build"
EXTENSION_NAME="carespace-bug-reporter-v${VERSION}"
ZIP_NAME="${EXTENSION_NAME}.zip"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy extension files (exclude unnecessary files)
echo "📦 Packaging extension files..."
rsync -av --progress \
  --exclude="$BUILD_DIR" \
  --exclude="build.sh" \
  --exclude="*.md" \
  --exclude=".DS_Store" \
  --exclude="*.log" \
  ./ "$BUILD_DIR/$EXTENSION_NAME/"

# Create ZIP file
echo "🗜️  Creating ZIP archive..."
cd "$BUILD_DIR"
zip -r "$ZIP_NAME" "$EXTENSION_NAME/"
cd ..

# Calculate file size
FILE_SIZE=$(du -h "$BUILD_DIR/$ZIP_NAME" | cut -f1)

echo ""
echo "✅ Build complete!"
echo ""
echo "📊 Build Information:"
echo "  Version:    $VERSION"
echo "  File:       $BUILD_DIR/$ZIP_NAME"
echo "  Size:       $FILE_SIZE"
echo ""
echo "📤 Next Steps:"
echo "  1. Test the extension locally first"
echo "  2. Upload $BUILD_DIR/$ZIP_NAME to Chrome Web Store"
echo "  3. Fill in store listing information"
echo "  4. Submit for review"
echo ""
echo "🔗 Chrome Web Store Developer Dashboard:"
echo "   https://chrome.google.com/webstore/devconsole"
echo ""
