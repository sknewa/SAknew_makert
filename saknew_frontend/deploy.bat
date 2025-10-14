@echo off
echo ========================================
echo   Deploying Frontend to Netlify
echo ========================================
echo.

echo [Step 1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo [Step 2/4] Building for web...
call npx expo export --platform web
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo.

echo [Step 3/4] Committing changes...
git add .
git commit -m "Deploy: Enhanced wallet transaction display"
echo.

echo [Step 4/4] Pushing to GitHub (triggers Netlify)...
git push origin main
if %errorlevel% neq 0 (
    echo Push failed!
    pause
    exit /b 1
)
echo.

echo ========================================
echo   Deployment Initiated!
echo ========================================
echo.
echo Netlify will now build and deploy your app.
echo.
echo Live URL: https://saknew-makert.netlify.app
echo Monitor: https://app.netlify.com/sites/saknew-makert/deploys
echo.
echo Wait 2-3 minutes for build to complete.
echo Then clear browser cache (Ctrl+Shift+R) to see changes.
echo.
pause
