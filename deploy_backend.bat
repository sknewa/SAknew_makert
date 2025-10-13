@echo off
echo Deploying Backend to Heroku...

cd saknew_backend

echo Adding changes to git...
git add .
git commit -m "Fix NetInfo issues and improve error handling"

echo Pushing to Heroku...
git push heroku main

echo Backend deployment complete!
pause