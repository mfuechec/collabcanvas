#!/bin/bash

# CollabCanvas Beta Deployment Script
# Deploy to beta channel for testing before production

echo "🧪 CollabCanvas Beta Deployment Script"
echo "======================================="

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

# Deploy to beta channel (no need to deploy rules - same database)
echo "🌐 Deploying to beta channel..."
# Get Firebase project ID (or use default)
FIREBASE_PROJECT=${FIREBASE_PROJECT_ID:-"collabcanvas-5b9fb"}

firebase hosting:channel:deploy beta --expires 30d --project "$FIREBASE_PROJECT"

if [ $? -ne 0 ]; then
    echo "❌ Beta deployment failed"
    exit 1
fi

echo ""
echo "🎉 Beta deployment completed successfully!"
echo ""
echo "🧪 Your beta site is now live!"
echo ""
echo "To get the beta URL, run:"
echo "  firebase hosting:channel:open beta"
echo ""
echo "Or list all channels:"
echo "  firebase hosting:channel:list"
echo ""
echo "Note: Beta channel expires in 30 days. Redeploy to extend."
echo "      Uses same Firestore & Realtime Database as production."
echo ""

