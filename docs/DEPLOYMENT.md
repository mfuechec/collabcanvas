# CollabCanvas Deployment Guide

## Overview

CollabCanvas uses Firebase Hosting with multiple deployment channels for production and beta testing.

## Deployment Channels

### Production (`live` channel)
- **Script**: `./deploy-production.sh`
- **URL**: https://collabcanvas-5b9fb.web.app
- **Purpose**: Public production site
- **Deploys**: Hosting + Security rules

### Beta (`beta` channel)
- **Script**: `./deploy-beta.sh`
- **URL**: https://collabcanvas-5b9fb--beta-[UNIQUE_ID].web.app
- **Purpose**: Testing before production
- **Deploys**: Hosting only (uses same database as production)

## Quick Start

### Deploy to Production
```bash
./deploy-production.sh
```

### Deploy to Beta
```bash
./deploy-beta.sh
```

## Firebase Hosting Channels

Firebase Hosting channels allow you to deploy different versions of your app with unique URLs, all using the same Firebase project (same Firestore and Realtime Database).

### Useful Commands

#### Get Beta URL
```bash
firebase hosting:channel:open beta
```

#### List All Channels
```bash
firebase hosting:channel:list
```

#### Delete Beta Channel
```bash
firebase hosting:channel:delete beta
```

#### Deploy to Custom Channel
```bash
# Deploy to any custom channel (e.g., "staging", "dev")
firebase hosting:channel:deploy staging --expires 7d
```

## Channel Expiration

By default, the beta channel is set to expire in 30 days. To extend:

```bash
# Redeploy to reset the 30-day timer
./deploy-beta.sh
```

Or set a longer expiration:

```bash
firebase hosting:channel:deploy beta --expires 90d
```

## Database Access

**Important**: Both production and beta channels use the **same** Firebase project, meaning:
- ✅ Same Firestore database
- ✅ Same Realtime Database
- ✅ Same Authentication users
- ✅ Same Storage

This allows you to test new UI/features on beta without affecting the production site, while still accessing real data.

### Testing Strategy

1. **Beta Testing**: Deploy to beta for internal testing (`./deploy-beta.sh`)
2. **Verification**: Test all features on beta URL
3. **Production Deploy**: Once verified, deploy to production (`./deploy-production.sh`)

## Security Rules

Security rules (Firestore, Realtime Database) are **only deployed with production** to avoid conflicts. The beta channel automatically uses the same rules as production.

## Troubleshooting

### Channel Not Found
If you get a "channel not found" error:
```bash
# Deploy the channel first
firebase hosting:channel:deploy beta
```

### Authentication Issues
```bash
firebase login
firebase projects:list  # Verify you can access the project
```

### Build Errors
If the build fails:
1. Check for linting errors: `npm run lint`
2. Test locally: `npm run dev`
3. Fix errors before deploying

## Manual Deployment

If you prefer manual control:

```bash
# Build
npm run build

# Deploy to production
firebase deploy --only hosting

# Deploy to beta channel
firebase hosting:channel:deploy beta
```

## CI/CD Integration

For automated deployments, you can integrate with GitHub Actions:

```yaml
# .github/workflows/deploy-beta.yml
name: Deploy to Beta
on:
  push:
    branches: [develop]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: beta
          expires: 30d
```

## Best Practices

1. **Always test on beta first** before deploying to production
2. **Keep beta channel fresh** by redeploying regularly (extends expiration)
3. **Document breaking changes** if beta uses different data structures
4. **Monitor both channels** for errors and performance
5. **Use semantic versioning** to track deployments

## URLs Reference

- **Production**: https://collabcanvas-5b9fb.web.app
- **Beta**: Run `firebase hosting:channel:open beta` to get URL
- **Firebase Console**: https://console.firebase.google.com/project/collabcanvas-5b9fb

## Questions?

For more information on Firebase Hosting channels:
https://firebase.google.com/docs/hosting/multisites

