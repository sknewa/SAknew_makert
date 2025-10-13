@echo off
echo Redeploying to Heroku...
cd /d "C:\Users\Madala Ronewa\Desktop\saknew_hybrid_app"
git add .
git commit -m "Configure Cloudinary for image storage"
git push heroku main
echo Deployment complete!
pause