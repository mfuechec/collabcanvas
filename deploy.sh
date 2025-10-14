#!/bin/bash

# CollabCanvas Deployment Script
# Run this script to deploy to Firebase Hosting

echo "🚀 CollabCanvas Deployment Script"
echo "================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in
echo "🔑 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "   firebase login"
    echo "   Then run this script again."
    exit 1
fi

echo "✅ Firebase authentication confirmed"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please:"
    echo "   1. Copy ENV_SETUP.md instructions"
    echo "   2. Create .env file with your Firebase config"
    echo "   3. Run this script again"
    exit 1
fi

echo "✅ Environment variables found"

# Build the project
echo "🔨 Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy security rules first
echo "🔒 Deploying security rules..."
firebase deploy --only firestore:rules,database

if [ $? -ne 0 ]; then
    echo "❌ Security rules deployment failed"
    exit 1
fi

echo "✅ Security rules deployed"

# Deploy hosting
echo "🌐 Deploying to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -ne 0 ]; then
    echo "❌ Hosting deployment failed"
    exit 1
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "Your app is now live at:"
firebase hosting:channel:open live 2>/dev/null || echo "https://$(firebase use | grep -o '[^ ]*$').web.app"
echo ""
echo "Next steps:"
echo "1. Test the deployed app with multiple browser tabs/windows"
echo "2. Verify authentication works"
echo "3. Test real-time features with multiple users"
echo "4. Update README.md with your actual live demo URL"
