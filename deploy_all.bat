@echo off
echo ========================================
echo   Deploying Saknew Hybrid App
echo ========================================
echo.

REM Deploy Backend
echo [1/2] Deploying Backend to Heroku...
cd saknew_backend
git add .
git commit -m "Enhanced wallet transaction display for earnings"
git push heroku main
if %errorlevel% neq 0 (
    echo Backend deployment failed!
    pause
    exit /b 1
)
echo Backend deployed successfully!
echo.

REM Deploy Frontend
cd ..
echo [2/2] Deploying Frontend to Netlify...
cd saknew_frontend
call npm install
call npx expo export --platform web
git add .
git commit -m "Enhanced wallet transaction display for earnings"
git push origin main
if %errorlevel% neq 0 (
    echo Frontend deployment failed!
    pause
    exit /b 1
)
echo Frontend deployed successfully!
echo.

cd ..
echo ========================================
echo   Deployment Complete!
echo ========================================
echo Backend: https://saknew-makert-e7ac1361decc.herokuapp.com
echo Frontend: https://saknew-makert.netlify.app
echo.
pause
