# Saknew Market Admin Dashboard

## Overview
Web-based admin dashboard for monitoring Saknew Market app growth and performance.

## Features
- **Overview**: Total users, shops, transactions, and revenue
- **Users**: List all registered users with details
- **Shops**: Monitor all shops and their products
- **Transactions**: View all orders and payment status
- **Feedback**: User reviews and ratings

## Setup

### Local Development
1. Open `index.html` in a web browser
2. Dashboard will automatically fetch data from the API

### Deploy to Netlify
1. Create a new site on Netlify
2. Drag and drop the `admin_dashboard` folder
3. Site will be live instantly

### Deploy to Heroku (Static)
```bash
cd admin_dashboard
echo "web: python -m http.server $PORT" > Procfile
git init
git add .
git commit -m "Initial commit"
heroku create saknew-admin-dashboard
git push heroku main
```

## API Endpoints Used
- `/api/accounts/users/` - User data
- `/api/shops/` - Shop data
- `/api/orders/` - Transaction data
- `/api/reviews/` - Feedback data

## Security Note
This dashboard should be protected with authentication in production. Add:
1. Login page
2. Admin user verification
3. JWT token authentication
4. IP whitelist

## Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge
