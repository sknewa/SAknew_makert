@echo off
echo Deploying cart fix to Heroku...

cd saknew_backend

echo.
echo Step 1: Committing changes...
git add sales/models.py
git commit -m "Fix: Add line_total property to CartItem model"

echo.
echo Step 2: Pushing to Heroku...
git push heroku main

echo.
echo Step 3: Running migrations on Heroku...
heroku run python manage.py migrate

echo.
echo Deployment complete!
pause
