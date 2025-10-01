#!/bin/bash

echo "🚀 Deploying NavGurukul Kitchen Duty System..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run db:generate

# Build the application
echo "🏗️ Building application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "📋 Deployment Instructions:"
    echo "1. Upload the .next folder to your deployment platform"
    echo "2. Upload the public folder to your deployment platform"
    echo "3. Set the DATABASE_URL environment variable"
    echo "4. Set the start command to: npm start"
    echo "5. Your app should be available at the provided domain"
    echo ""
    echo "🔍 To test locally: npm start"
    echo "🌐 Health check: curl http://localhost:3000/api/health"
else
    echo "❌ Build failed!"
    exit 1
fi