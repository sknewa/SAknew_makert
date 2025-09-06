# Deployment Guide for PythonAnywhere

## Prerequisites
1. PythonAnywhere account (Beginner or higher plan for web apps)
2. Your project files uploaded to PythonAnywhere

## Step 1: Upload Your Project
1. Use the Files tab in PythonAnywhere dashboard
2. Upload your entire `saknew_hybrid_app` folder to `/home/yourusername/`
3. Or use git to clone your repository:
   ```bash
   git clone https://github.com/yourusername/saknew_hybrid_app.git
   ```

## Step 2: Set Up Environment Variables
1. In PythonAnywhere Files tab, create `.env` file in `/home/yourusername/saknew_hybrid_app/saknew_backend/`
2. Copy contents from `.env.production` and update with your actual values:
   - Replace `your-username` with your PythonAnywhere username
   - Set a strong `DJANGO_SECRET_KEY`
   - Configure email settings
   - Set Stripe keys if using payments

## Step 3: Install Dependencies
Open a Bash console in PythonAnywhere and run:
```bash
cd ~/saknew_hybrid_app/saknew_backend
pip3.10 install --user -r requirements.txt
```

## Step 4: Run Deployment Script
```bash
cd ~/saknew_hybrid_app
python3.10 deploy.py
```

## Step 5: Configure Web App
1. Go to Web tab in PythonAnywhere dashboard
2. Create a new web app (Python 3.10, Django)
3. Set configuration:
   - **Source code**: `/home/yourusername/saknew_hybrid_app/saknew_backend`
   - **WSGI file**: `/home/yourusername/saknew_hybrid_app/saknew_backend/core_api/wsgi.py`

## Step 6: Configure Static Files
In the Web tab, add static file mappings:
- **URL**: `/static/`
- **Directory**: `/home/yourusername/saknew_hybrid_app/saknew_backend/staticfiles/`

## Step 7: Set Environment Variables
In the Web tab, add these environment variables:
- `DJANGO_PRODUCTION=True`
- `DJANGO_SECRET_KEY=your-secret-key`
- `DJANGO_DEBUG=False`
- `DJANGO_ALLOWED_HOSTS=yourusername.pythonanywhere.com`

## Step 8: Database Setup (Optional - MySQL)
If using MySQL instead of SQLite:
1. Create MySQL database in Databases tab
2. Update `.env` with database credentials
3. Run migrations: `python3.10 manage.py migrate`

## Step 9: Create Superuser
```bash
cd ~/saknew_hybrid_app/saknew_backend
python3.10 manage.py createsuperuser
```

## Step 10: Reload Web App
Click "Reload" button in Web tab

## Testing
- Visit `https://yourusername.pythonanywhere.com`
- Test API endpoints: `https://yourusername.pythonanywhere.com/api/health-check/`
- Access admin: `https://yourusername.pythonanywhere.com/admin/`

## Troubleshooting
1. Check error logs in Web tab
2. Verify all environment variables are set
3. Ensure static files are collected: `python3.10 manage.py collectstatic`
4. Check file permissions and paths

## Updates
To update your deployed app:
1. Upload new files or pull from git
2. Run: `python3.10 manage.py collectstatic --noinput`
3. Reload web app

## Security Notes
- Never commit `.env` files to version control
- Use strong secret keys
- Keep DEBUG=False in production
- Regularly update dependencies