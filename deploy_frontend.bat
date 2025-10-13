@echo off
echo Deploying Frontend to Netlify...

cd saknew_frontend

echo Installing dependencies...
npm install

echo Building for web...
npx expo export --platform web

echo Adding changes to git...
git add .
git commit -m "Fix NetInfo issues and update dependencies"

echo Pushing to main branch (Netlify auto-deploys)...
git push origin main

echo Frontend deployment complete!
pause