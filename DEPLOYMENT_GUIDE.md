# Saknew Market - Deployment Guide

## Overview
This guide covers deploying the Saknew Market application to production environments.

---

## Prerequisites

### Required Accounts
- [x] Heroku account (Backend)
- [x] Netlify account (Frontend Web)
- [x] Cloudinary account (Media storage)
- [x] PostgreSQL database (Heroku provides)
- [x] Email service (Gmail/SendGrid)

### Required Tools
- Git
- Heroku CLI
- Netlify CLI
- Node.js 18+
- Python 3.11+

---

## Backend Deployment (Heroku)

### Initial Setup

1. **Install Heroku CLI**
```bash
# Windows
choco install heroku-cli

# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Login to Heroku**
```bash
heroku login
```

3. **Create Heroku App**
```bash
cd saknew_backend
heroku create saknew-makert
```

### Configure Environment Variables

```bash
# Django Settings
heroku config:set SECRET_KEY="your-secret-key-here"
heroku config:set DEBUG=False
heroku config:set ALLOWED_HOSTS="saknew-makert-e7ac1361decc.herokuapp.com"

# Database (automatically set by Heroku)
# DATABASE_URL is set when you add PostgreSQL addon

# Cloudinary
heroku config:set CLOUDINARY_CLOUD_NAME="your-cloud-name"
heroku config:set CLOUDINARY_API_KEY="your-api-key"
heroku config:set CLOUDINARY_API_SECRET="your-api-secret"

# Email
heroku config:set EMAIL_HOST="smtp.gmail.com"
heroku config:set EMAIL_PORT=587
heroku config:set EMAIL_USE_TLS=True
heroku config:set EMAIL_HOST_USER="your-email@gmail.com"
heroku config:set EMAIL_HOST_PASSWORD="your-app-password"

# CORS
heroku config:set CORS_ALLOWED_ORIGINS="https://saknew-makert.netlify.app"
```

### Add PostgreSQL Database

```bash
heroku addons:create heroku-postgresql:mini
```

### Deploy Backend

1. **Initialize Git (if not already)**
```bash
git init
git add .
git commit -m "Initial commit"
```

2. **Add Heroku Remote**
```bash
heroku git:remote -a saknew-makert
```

3. **Deploy**
```bash
git push heroku main
```

4. **Run Migrations**
```bash
heroku run python manage.py migrate
```

5. **Create Superuser**
```bash
heroku run python manage.py createsuperuser
```

6. **Collect Static Files**
```bash
heroku run python manage.py collectstatic --noinput
```

### Verify Deployment

```bash
heroku open
# Visit: https://saknew-makert-e7ac1361decc.herokuapp.com/admin
```

### View Logs

```bash
heroku logs --tail
```

---

## Frontend Deployment (Netlify)

### Initial Setup

1. **Install Netlify CLI**
```bash
npm install -g netlify-cli
```

2. **Login to Netlify**
```bash
netlify login
```

3. **Initialize Netlify**
```bash
cd saknew_frontend
netlify init
```

### Configure Build Settings

Create `netlify.toml`:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production.environment]
  SERVER_IP = "saknew-makert-e7ac1361decc.herokuapp.com"
  SERVER_PORT = "443"
  API_BASE_URL = "https://saknew-makert-e7ac1361decc.herokuapp.com/"
  IMAGE_BASE_URL = "https://saknew-makert-e7ac1361decc.herokuapp.com"
  DEBUG = "false"
  APP_ENV = "production"
```

### Deploy Frontend

1. **Build Project**
```bash
npm run build
```

2. **Deploy to Production**
```bash
netlify deploy --prod --dir=dist
```

### Verify Deployment

Visit: https://saknew-makert.netlify.app

---

## Mobile App Deployment

### Android (Google Play Store)

1. **Build APK**
```bash
cd saknew_frontend
eas build --platform android
```

2. **Configure app.json**
```json
{
  "expo": {
    "android": {
      "package": "com.saknew.market",
      "versionCode": 1,
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

3. **Submit to Play Store**
- Create developer account ($25 one-time fee)
- Upload APK
- Fill in app details
- Submit for review

### iOS (Apple App Store)

1. **Build IPA**
```bash
eas build --platform ios
```

2. **Configure app.json**
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.saknew.market",
      "buildNumber": "1.0.0",
      "supportsTablet": true
    }
  }
}
```

3. **Submit to App Store**
- Enroll in Apple Developer Program ($99/year)
- Upload IPA via Xcode or Transporter
- Fill in app details
- Submit for review

---

## Database Management

### Backup Database

```bash
# Heroku PostgreSQL
heroku pg:backups:capture
heroku pg:backups:download
```

### Restore Database

```bash
heroku pg:backups:restore <backup-url> DATABASE_URL
```

### Run Migrations

```bash
# After code changes
heroku run python manage.py makemigrations
heroku run python manage.py migrate
```

---

## Monitoring & Maintenance

### Application Monitoring

1. **Heroku Metrics**
```bash
heroku logs --tail
heroku ps
heroku pg:info
```

2. **Netlify Analytics**
- Visit Netlify dashboard
- View deployment logs
- Monitor bandwidth usage

### Performance Optimization

1. **Backend**
- Enable database connection pooling
- Use Redis for caching (optional)
- Optimize database queries
- Enable gzip compression

2. **Frontend**
- Minimize bundle size
- Lazy load components
- Optimize images
- Enable CDN caching

### Security Updates

1. **Update Dependencies**
```bash
# Backend
pip install --upgrade -r requirements.txt

# Frontend
npm update
```

2. **Security Patches**
```bash
# Check for vulnerabilities
npm audit
pip check
```

---

## Continuous Deployment

### GitHub Actions (Backend)

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Heroku

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: "saknew-makert"
          heroku_email: "your-email@example.com"
```

### Netlify Auto Deploy

1. Connect GitHub repository to Netlify
2. Configure build settings
3. Enable auto-deploy on push to main branch

---

## Rollback Procedures

### Backend Rollback

```bash
# View releases
heroku releases

# Rollback to previous version
heroku rollback v99
```

### Frontend Rollback

```bash
# View deployments
netlify deploy:list

# Restore previous deployment
netlify deploy:restore <deploy-id>
```

---

## Environment-Specific Configurations

### Development
```bash
DEBUG=True
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Staging
```bash
DEBUG=False
DATABASE_URL=postgresql://staging-db-url
ALLOWED_HOSTS=staging.saknew.com
```

### Production
```bash
DEBUG=False
DATABASE_URL=postgresql://production-db-url
ALLOWED_HOSTS=saknew-makert-e7ac1361decc.herokuapp.com
```

---

## Troubleshooting

### Backend Issues

**App won't start**
```bash
heroku logs --tail
heroku restart
```

**Database connection errors**
```bash
heroku pg:info
heroku pg:reset DATABASE_URL
heroku run python manage.py migrate
```

**Static files not loading**
```bash
heroku run python manage.py collectstatic --noinput
```

### Frontend Issues

**Build fails**
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

**Environment variables not working**
- Check netlify.toml configuration
- Verify variables in Netlify dashboard
- Redeploy after changes

---

## Cost Estimation

### Monthly Costs

**Heroku**
- Eco Dyno: $5/month
- Mini PostgreSQL: $5/month
- Total: $10/month

**Netlify**
- Starter Plan: Free (100GB bandwidth)
- Pro Plan: $19/month (400GB bandwidth)

**Cloudinary**
- Free Plan: 25GB storage, 25GB bandwidth
- Plus Plan: $89/month (100GB storage)

**Total Estimated Cost**: $10-$120/month depending on usage

---

## Scaling Considerations

### Horizontal Scaling
- Add more Heroku dynos
- Use load balancer
- Implement caching layer

### Vertical Scaling
- Upgrade Heroku dyno type
- Increase database size
- Optimize queries

### Database Scaling
- Enable connection pooling
- Add read replicas
- Implement database sharding

---

## Backup Strategy

### Automated Backups
```bash
# Schedule daily backups
heroku pg:backups:schedule DATABASE_URL --at '02:00 America/Los_Angeles'
```

### Manual Backups
```bash
# Before major changes
heroku pg:backups:capture
heroku pg:backups:download
```

---

## Support & Resources

- **Heroku Docs**: https://devcenter.heroku.com
- **Netlify Docs**: https://docs.netlify.com
- **Expo Docs**: https://docs.expo.dev
- **Django Docs**: https://docs.djangoproject.com

---

**Last Updated**: January 2025  
**Version**: 1.0.0
