# 🚀 Deployment Quick Reference

## TL;DR

### Deploy to Beta (Testing)
```bash
./deploy-beta.sh
```
Get URL: `firebase hosting:channel:open beta`

### Deploy to Production (Live)
```bash
./deploy-production.sh
```
URL: https://collabcanvas-5b9fb.web.app

---

## What You Need to Know

### Beta Channel
- **Purpose**: Testing before production
- **Database**: Uses same Firestore & Realtime Database as production
- **URL**: Unique beta URL (different from production)
- **Security Rules**: Inherits from production
- **Expiration**: 30 days (automatically extended when you redeploy)

### Production Channel
- **Purpose**: Public live site
- **Database**: Production Firestore & Realtime Database
- **URL**: https://collabcanvas-5b9fb.web.app
- **Security Rules**: Deploys updated rules

---

## Typical Workflow

1. Make code changes
2. Deploy to beta: `./deploy-beta.sh`
3. Test thoroughly on beta URL
4. Deploy to production: `./deploy-production.sh`

---

## Useful Commands

```bash
# Get beta URL
firebase hosting:channel:open beta

# List all hosting channels
firebase hosting:channel:list

# Delete beta channel
firebase hosting:channel:delete beta

# Manual deployment
npm run build
firebase deploy --only hosting  # Production
firebase hosting:channel:deploy beta  # Beta
```

---

## Full Documentation

See `docs/DEPLOYMENT.md` for complete deployment guide with troubleshooting.

---

**Built with Firebase Hosting Channels**

