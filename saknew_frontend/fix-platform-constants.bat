@echo off
echo Fixing PlatformConstants error...
echo.

echo 1. Clearing node_modules and package-lock...
rmdir /s /q node_modules
del package-lock.json

echo.
echo 2. Installing with legacy peer deps...
npm install --legacy-peer-deps

echo.
echo 3. Clearing Metro cache...
npx expo start --clear

echo.
echo Fix complete! Try running your app again.
pause