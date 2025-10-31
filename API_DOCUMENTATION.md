# Saknew Market API Documentation

## Base URL
```
Production: https://saknew-makert-e7ac1361decc.herokuapp.com
Development: http://localhost:8000
```

## Authentication
All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Response Format
All responses follow this structure:
```json
{
  "success": true,
  "data": {},
  "message": "Success message"
}
```

Error responses:
```json
{
  "detail": "Error message",
  "errors": {}
}
```

---

## Authentication Endpoints

### Register User
```http
POST /api/auth/register/
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "Registration successful. Please verify your email."
}
```

### Login
```http
POST /api/auth/login/
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "profile": {
      "is_seller": false,
      "shop_slug": null
    }
  }
}
```

### Refresh Token
```http
POST /api/auth/token/refresh/
```

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response:** `200 OK`
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Get Profile
```http
GET /api/auth/profile/
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "profile": {
    "is_seller": true,
    "shop_slug": "johns-shop"
  }
}
```

---

## Product Endpoints

### List Products
```http
GET /api/products/
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `page_size` - Items per page (default: 20)

**Response:** `200 OK`
```json
{
  "count": 100,
  "next": "https://api.example.com/api/products/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Product Name",
      "description": "Product description",
      "price": "99.99",
      "display_price": "79.99",
      "stock": 50,
      "category": 1,
      "category_name": "Electronics",
      "category_slug": "electronics",
      "shop_name": "John's Shop",
      "main_image_url": "https://cloudinary.com/image.jpg",
      "images": [],
      "promotion": {
        "discount_percentage": 20,
        "end_date": "2024-12-31"
      },
      "average_rating": 4.5,
      "review_count": 10
    }
  ]
}
```

### Get Product Details
```http
GET /api/products/{id}/
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Product Name",
  "description": "Detailed product description",
  "price": "99.99",
  "display_price": "79.99",
  "stock": 50,
  "category": 1,
  "category_name": "Electronics",
  "shop": {
    "id": 1,
    "name": "John's Shop",
    "slug": "johns-shop"
  },
  "images": [
    {
      "id": 1,
      "image": "https://cloudinary.com/image1.jpg",
      "is_main": true
    }
  ],
  "promotion": {
    "discount_percentage": 20,
    "start_date": "2024-01-01",
    "end_date": "2024-12-31"
  },
  "reviews": []
}
```

### Search Products
```http
GET /api/products/search/?q=laptop
```

**Query Parameters:**
- `q` - Search query (required)
- `user_lat` - User latitude (optional)
- `user_lon` - User longitude (optional)

**Response:** `200 OK` (same format as List Products)

### Create Product
```http
POST /api/products/
```
**Auth Required:** Yes (Seller only)

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": "99.99",
  "stock": 100,
  "category": 1
}
```

**Response:** `201 Created`

### Update Product
```http
PUT /api/products/{id}/
PATCH /api/products/{id}/
```
**Auth Required:** Yes (Owner only)

### Delete Product
```http
DELETE /api/products/{id}/
```
**Auth Required:** Yes (Owner only)

**Response:** `204 No Content`

---

## Cart Endpoints

### Get Cart
```http
GET /api/cart/
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "id": 1,
  "user": 1,
  "items": [
    {
      "id": 1,
      "product": {
        "id": 1,
        "name": "Product Name",
        "price": "99.99",
        "display_price": "79.99",
        "main_image_url": "https://cloudinary.com/image.jpg"
      },
      "quantity": 2
    }
  ],
  "total": "159.98",
  "created_at": "2024-01-01T10:00:00Z"
}
```

### Add to Cart
```http
POST /api/cart/add/
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "product_id": 1,
  "quantity": 2
}
```

**Response:** `201 Created`

### Update Cart Item
```http
POST /api/cart/update/{product_id}/
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response:** `200 OK`

### Remove from Cart
```http
DELETE /api/cart/remove/{product_id}/
```
**Auth Required:** Yes

**Response:** `204 No Content`

### Clear Cart
```http
POST /api/cart/clear/
```
**Auth Required:** Yes

**Response:** `204 No Content`

---

## Order Endpoints

### List Orders
```http
GET /api/orders/
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "order_number": "ORD-20240101-001",
      "user": {
        "id": 1,
        "email": "user@example.com"
      },
      "items": [
        {
          "id": 1,
          "product": {
            "id": 1,
            "name": "Product Name"
          },
          "quantity": 2,
          "price": "79.99",
          "status": "completed"
        }
      ],
      "total": "159.98",
      "order_status": "completed",
      "payment_status": "paid",
      "shipping_address": {
        "street": "123 Main St",
        "city": "Johannesburg",
        "province": "Gauteng"
      },
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Create Order
```http
POST /api/orders/create/
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "shipping_address_id": 1,
  "contact_number": "+27123456789"
}
```

**Response:** `201 Created`

### Update Order Status
```http
PATCH /api/orders/{id}/
```
**Auth Required:** Yes (Seller only)

**Request Body:**
```json
{
  "action": "approve_order"
}
```

**Actions:**
- `approve_order` - Approve pending order
- `mark_ready` - Mark as ready for delivery
- `generate_delivery_code` - Generate delivery verification code
- `confirm_delivery` - Confirm delivery with code
- `cancel_order` - Cancel order
- `cancel_item` - Cancel specific item
- `verify_item_delivery` - Verify item delivery

**Response:** `200 OK`

---

## Shop Endpoints

### List Shops
```http
GET /api/shops/
```

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "name": "John's Shop",
      "slug": "johns-shop",
      "description": "Quality products",
      "town": "Johannesburg",
      "province": "Gauteng",
      "country": "South Africa",
      "phone_number": "+27123456789",
      "is_active": true
    }
  ]
}
```

### Get Shop Details
```http
GET /api/shops/{slug}/
```

**Response:** `200 OK`

### Get My Shop
```http
GET /api/shops/my_shop/
```
**Auth Required:** Yes (Seller only)

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "John's Shop",
  "slug": "johns-shop",
  "total_products": 25,
  "in_stock_products": 20,
  "out_of_stock_products": 5
}
```

### Create Shop
```http
POST /api/shops/
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "My Shop",
  "description": "Shop description",
  "town": "Johannesburg",
  "province": "Gauteng",
  "country": "South Africa",
  "phone_number": "+27123456789"
}
```

**Response:** `201 Created`

### Get Shop Products
```http
GET /api/shops/{slug}/products/
```

**Response:** `200 OK` (same format as List Products)

---

## Wallet Endpoints

### Get Wallet
```http
GET /api/wallet/
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "id": 1,
  "user": 1,
  "balance": "1500.00",
  "created_at": "2024-01-01T10:00:00Z"
}
```

### Get Transactions
```http
GET /api/wallet/transactions/
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "transaction_type": "DEPOSIT",
      "amount": "500.00",
      "description": "Wallet deposit",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Deposit Funds
```http
POST /api/wallet/deposit/
```
**Auth Required:** Yes

**Request Body:**
```json
{
  "amount": "500.00"
}
```

**Response:** `200 OK`

---

## Status Endpoints

### List Statuses
```http
GET /api/status/
```
**Auth Required:** Yes

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "username": "john"
      },
      "content": "Check out our new products!",
      "media_type": "image",
      "cloudinary_url": "https://cloudinary.com/status.jpg",
      "created_at": "2024-01-01T10:00:00Z",
      "expires_at": "2024-01-02T10:00:00Z"
    }
  ]
}
```

### Create Status
```http
POST /api/status/
```
**Auth Required:** Yes

**Request Body (multipart/form-data):**
```
content: "Status text"
media_file: <file>
media_type: "image"
background_color: "#25D366"
```

**Response:** `201 Created`

---

## Category Endpoints

### List Categories
```http
GET /api/categories/
```

**Response:** `200 OK`
```json
[
  {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "parent": null
  }
]
```

### Get Category Products
```http
GET /api/categories/{slug}/products/
```

**Response:** `200 OK` (same format as List Products)

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limiting
- 100 requests per minute per IP
- 1000 requests per hour per user

## Pagination
All list endpoints support pagination:
- `page` - Page number
- `page_size` - Items per page (max: 100)

## Filtering & Sorting
Products can be filtered by:
- `category` - Category ID
- `shop` - Shop slug
- `min_price` - Minimum price
- `max_price` - Maximum price

Sort by:
- `created_at` - Creation date
- `price` - Price
- `name` - Name
