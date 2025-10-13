# Cloudinary Setup Guide

## 1. Create Cloudinary Account
1. Go to https://cloudinary.com/
2. Sign up for a free account
3. Get your credentials from the dashboard

## 2. Add Environment Variables
Add these to your `.env` file:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 3. Deploy to Heroku
Add the environment variables to Heroku:

```bash
heroku config:set CLOUDINARY_CLOUD_NAME=your_cloud_name
heroku config:set CLOUDINARY_API_KEY=your_api_key
heroku config:set CLOUDINARY_API_SECRET=your_api_secret
```

## 4. Install Dependencies
```bash
pip install -r requirements.txt
```

## 5. Deploy
```bash
git add .
git commit -m "Add Cloudinary image storage"
git push heroku main
```

## What This Does
- Images uploaded in production will be stored on Cloudinary
- Images will persist across Heroku dyno restarts
- Automatic image optimization and CDN delivery
- Free tier includes 25GB storage and 25GB bandwidth