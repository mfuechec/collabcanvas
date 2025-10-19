#!/bin/bash

# CollabCanvas Test Deployment Script
# Deploy to Firebase preview channel for testing Jira tickets
#
# Usage:
#   ./scripts/deploy/deploy-test.sh CRM-19
#   ./scripts/deploy/deploy-test.sh crm-42

echo "🧪 CollabCanvas Test Deployment Script"
echo "======================================="

# Check if ticket key provided
if [ -z "$1" ]; then
    echo "❌ Please provide a ticket key"
    echo ""
    echo "Usage: ./scripts/deploy/deploy-test.sh CRM-19"
    exit 1
fi

TICKET_KEY="$1"
CHANNEL_NAME=$(echo "$TICKET_KEY" | tr '[:upper:]' '[:lower:]')

echo "📋 Ticket: $TICKET_KEY"
echo "🌐 Channel: $CHANNEL_NAME"
echo ""

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

# Check for uncommitted changes (warning only)
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Consider committing before deploying for review"
    echo ""
fi

# Build the project
echo "🔨 Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix build errors and try again."
    exit 1
fi

echo "✅ Build completed successfully"

# Deploy to preview channel
echo "🚀 Deploying to preview channel: $CHANNEL_NAME..."
DEPLOY_OUTPUT=$(firebase hosting:channel:deploy "$CHANNEL_NAME" --expires 30d)

if [ $? -ne 0 ]; then
    echo "❌ Preview deployment failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "✅ Preview deployment successful"
echo ""

# Extract preview URL - Firebase adds random suffix to channel URLs
PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -oE "https://[^[:space:]]+--${CHANNEL_NAME}[^[:space:]]+" | grep "web.app" | head -1)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Test deployment complete!"
echo ""
echo "📋 Ticket:  $TICKET_KEY"
echo "🔗 Preview: $PREVIEW_URL"
echo "⏰ Expires: 30 days from now"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Note: Preview uses production database and auth"
echo ""
echo "To delete this preview channel:"
echo "  firebase hosting:channel:delete $CHANNEL_NAME"
echo ""

