@echo off
echo Fixing TypeScript errors...

REM Fix UserProfileResponse interface
powershell -Command "(Get-Content services\authService.ts) -replace 'interface UserProfileResponse extends User', 'interface UserProfileResponse' | Set-Content services\authService.ts"

echo TypeScript fixes applied!
pause
