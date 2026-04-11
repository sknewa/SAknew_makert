# Saknew Market - Hybrid E-Commerce Platform

## Overview
Saknew Market is a full-stack hybrid e-commerce platform that connects buyers and sellers in South Africa. Built with React Native (Expo) for mobile/web and Django REST Framework for the backend.

## 🚀 Live Deployments
- **Frontend (Web)**: https://samakert.netlify.app
- **Backend API**: https://saknew-market-backend-f8738ecec7fa.herokuapp.com
- **Admin Panel**: https://saknew-market-backend-f8738ecec7fa.herokuapp.com/admin

## 📱 Key Features

### For Buyers
- Browse products by categories with search functionality
- View product details with image galleries and promotions
- Add products to cart with quantity management
- Real-time location-based product recommendations
- Place orders with delivery address management
- Track order status (pending → processing → approved → ready for delivery → completed)
- Per-item order cancellation within 12 hours
- Per-item delivery verification with unique codes
- Product reviews and ratings
- Wallet system for payments and refunds
- Status updates from shops (24-hour stories)
- Shop discovery and navigation

### For Sellers
- Create and manage shop profile
- Add/edit/delete products with multiple images
- Set product promotions and discounts
- Manage inventory and stock levels
- Receive and process orders
- Generate delivery verification codes
- Track sales and order history
- Create shop status updates (stories)
- Share shop link for marketing
- View shop analytics

### Admin Features
- User management
- Shop approval and moderation
- Category management
- Order oversight
- System-wide analytics

## 🛠️ Technology Stack

### Frontend
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: React Navigation 6
- **State Management**: React Context API
- **HTTP Client**: Axios
- **UI Components**: React Native core components, Expo Vector Icons
- **Image Handling**: Expo Image Picker
- **Location Services**: Expo Location
- **Media**: Expo AV for video playback
- **Deployment**: Netlify (Web), Expo Go (Mobile)

### Backend
- **Framework**: Django 5.0 + Django REST Framework
- **Language**: Python 3.11
- **Database**: PostgreSQL (Production), SQLite (Development)
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Media Storage**: Cloudinary
- **Email**: Django Email Backend
- **Deployment**: Heroku
- **CORS**: django-cors-headers

## 📂 Project Structure

```
saknew_hybrid_app/
├── saknew_frontend/          # React Native frontend
│   ├── components/           # Reusable UI components
│   ├── context/             # React Context providers
│   ├── navigation/          # Navigation configuration
│   ├── screens/             # App screens
│   │   ├── Auth/           # Authentication screens
│   │   ├── Home/           # Home and product screens
│   │   ├── Sales/          # Cart, orders, checkout
│   │   ├── ShopOwner/      # Seller dashboard
│   │   ├── Status/         # Status/stories feature
│   │   └── Wallet/         # Wallet management
│   ├── services/           # API service layer
│   ├── styles/             # Global styles
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
│
└── saknew_backend/          # Django backend
    ├── accounts/           # User authentication
    ├── shop/              # Shop and product management
    ├── sales/             # Orders and cart
    ├── wallet/            # Wallet and transactions
    ├── status/            # Status updates
    ├── shipping/          # Delivery addresses
    └── core_api/          # Main settings and URLs
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL (for production)
- Git

### Frontend Setup
```bash
cd saknew_frontend
npm install
npm start
```

### Backend Setup
```bash
cd saknew_backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Environment Variables

**Frontend (.env)**
```
SERVER_IP=saknew-market-backend-f8738ecec7fa.herokuapp.com
SERVER_PORT=443

# API configuration - New Heroku Backend
API_BASE_URL=https://saknew-market-backend-f8738ecec7fa.herokuapp.com/
IMAGE_BASE_URL=https://saknew-market-backend-f8738ecec7fa.herokuapp.com
DEBUG=false
APP_ENV=production
```

**Backend (.env)**
```
SECRET_KEY=your-secret-key
DEBUG=False
DATABASE_URL=postgresql://user:pass@host:port/dbname
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
EMAIL_HOST_USER=your-email
EMAIL_HOST_PASSWORD=your-password
```

## 📱 Running the App

### Web
```bash
cd saknew_frontend
npm run web
```

### Mobile (Development)
```bash
cd saknew_frontend
npm start
# Scan QR code with Expo Go app
```

### Build for Production
```bash
# Web
npm run build

# Android APK
expo build:android

# iOS IPA
expo build:ios
```

## 🔐 Authentication Flow
1. User registers with email/password
2. Email verification sent
3. User verifies email via link
4. User logs in and receives JWT tokens
5. Tokens stored in AsyncStorage
6. Auto-refresh on token expiry

## 🛒 Order Flow
1. Buyer adds products to cart
2. Buyer proceeds to checkout
3. Buyer enters shipping address
4. Order created with "pending" status
5. Seller approves order → "processing"
6. Seller marks ready → "ready_for_delivery"
7. Seller generates delivery code
8. Buyer receives item and enters code
9. Order marked "completed"
10. Funds released to seller's wallet

## 💳 Payment System
- Wallet-based transactions
- Users deposit funds to wallet
- Payments deducted from wallet balance
- Refunds credited back to wallet
- Transaction history tracking

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register/` - User registration
- `POST /api/auth/login/` - User login
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `GET /api/auth/profile/` - Get user profile

### Products
- `GET /api/products/` - List all products
- `GET /api/products/{id}/` - Product details
- `GET /api/products/search/?q=query` - Search products
- `POST /api/products/` - Create product (seller)
- `PUT /api/products/{id}/` - Update product (seller)

### Cart & Orders
- `GET /api/cart/` - Get user's cart
- `POST /api/cart/add/` - Add item to cart
- `POST /api/cart/update/{id}/` - Update quantity
- `DELETE /api/cart/remove/{id}/` - Remove item
- `POST /api/orders/create/` - Create order
- `GET /api/orders/` - List user's orders

### Shop
- `GET /api/shops/` - List all shops
- `GET /api/shops/{slug}/` - Shop details
- `POST /api/shops/` - Create shop (seller)
- `GET /api/shops/my_shop/` - Get seller's shop

### Wallet
- `GET /api/wallet/` - Get wallet balance
- `GET /api/wallet/transactions/` - Transaction history
- `POST /api/wallet/deposit/` - Deposit funds

## 🎨 Design System
- **Primary Color**: #667eea (Purple)
- **Success Color**: #10B981 (Green)
- **Error Color**: #FF4444 (Red)
- **Background**: #F5F5F5 (Light Gray)
- **Card**: #FFFFFF (White)
- **Text Primary**: #222222
- **Text Secondary**: #999999

## 🚀 Deployment

### Frontend (Netlify)
```bash
cd saknew_frontend
netlify deploy --prod --dir=dist
```

### Backend (Heroku)
```bash
cd saknew_backend
git push heroku main
heroku run python manage.py migrate
```

## 📝 Version History
- **v1.0.0** (Current) - MVP Release
  - User authentication and profiles
  - Product browsing and search
  - Shopping cart and checkout
  - Order management with per-item operations
  - Wallet system
  - Shop management
  - Status updates (stories)
  - Review system

## 🤝 Contributing
This is a private project. For questions or issues, contact the development team.

## 📄 License
Proprietary - All rights reserved

## 👥 Team
- **Developer**: Madala Ronewa
- **Project**: Saknew Market
- **Version**: 1.0.0

## 📞 Support
For support, email: support@saknew.com
