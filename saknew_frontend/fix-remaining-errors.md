# Remaining TypeScript Errors - Quick Fixes

## All imports are now fixed - securityUtils exports safeLog, safeError, safeWarn

## Remaining Manual Fixes Needed:

### 1. MyShopScreen.tsx - Line 233, 237, 310, 489, 500, 511, 579, 581
```typescript
// Line 233 - Fix payment_status comparison
if (order.payment_status !== 'paid') return false;

// Line 237 - Fix shop.id access
const shopId = typeof item.product?.shop === 'number' ? item.product.shop : item.product?.shop?.id;
if (shopId === user.profile?.shop_id) { ... }

// Line 310, 489, 500, 511 - Navigation params already support categorySlug (fixed in types.ts)
// Just ensure you're using CategoryProductsScreen route name

// Line 579, 581 - Fix category.id type
const categoryId = typeof category.id === 'number' ? category.id : category.id?.id;
key={categoryId}
onPress={() => setSelectedCategory(categoryId)}
```

### 2. EditProductScreen.tsx - Line 184, 446, 449
```typescript
// Line 184 - Add type annotation
const parentId: number | null = currentCat.parent_category;

// Line 446, 449 - Remove await on already resolved File
if (imageData.image instanceof Promise) {
  imageData.image = await imageData.image;
}
await shopService.addProductImage(productId, imageData);
```

### 3. ProductManagementScreen.tsx - Line 46, 72, 251, 259, 278
```typescript
// Line 46 - Type conversion
setProduct(fetchedProduct as any);

// Line 72, 278 - Navigation
navigation.navigate('EditProduct' as any, { productId: product.id } as any);
navigation.navigate('AddPromotion' as any, { productId: product?.id } as any);

// Line 251, 259 - Null check
if (product.promotion) {
  Alert.alert(`Remove ${product.promotion.discount_percentage}% discount?`, ...);
  await shopService.deleteProductPromotion(product.id, product.promotion.id);
}
```

### 4. CreateStatusScreen.tsx - Line 138
```typescript
// Change resizeMode
resizeMode="cover" // or "stretch" instead of "contain"
```

### 5. StatusTabScreen.tsx - Line 50, 54, 59, 73, 75, 182
```typescript
// Line 50, 54, 59 - Navigation
navigation.navigate('StatusViewer' as any, { userStatus } as any);
navigation.navigate('CreateStatus' as any);

// Line 73, 75 - Add profile_picture to UserProfile type (already done in types.ts)

// Line 182 - Fix ListEmptyComponent
ListEmptyComponent={loading ? null : <EmptyComponent />}
```

### 6. StatusListScreen.tsx - Line 81, 98
```typescript
// Navigation fix
navigation.navigate('CreateStatus' as any);
```

### 7. AddFundsScreen.tsx - Line 36
```typescript
// Fix window.confirm check
if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
```

### 8. WalletDashboardScreen.tsx - Line 231, 256
```typescript
// Use existing color properties
color={colors.error} // instead of colors.errorText
color={colors.buttonText} // already exists
```

### 9. imageCache.ts - Lines 7, 88, 95, 100, 101
```typescript
// This file needs Expo FileSystem API updates - comment out or rewrite for web compatibility
// Or add proper type assertions:
const CACHE_FOLDER = `${(FileSystem as any).cacheDirectory}images/`;
const info = await FileSystem.getInfoAsync(path) as any;
```

### 10. directApiTest.ts - Line 31
```typescript
// Add error type
} catch (error: any) {
  safeLog(`❌ FAILED: ${ip} - ${error?.message || 'Unknown error'}`);
}
```

## Quick Fix Script

Run this PowerShell command to fix navigation calls:
```powershell
cd "c:\Users\Madala Ronewa\Desktop\saknew_hybrid_app\saknew_frontend"

# Fix navigation calls with 'as any'
Get-ChildItem -Recurse -Filter "*.tsx" | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  $content = $content -replace "navigation\.navigate\('EditProduct',", "navigation.navigate('EditProduct' as any,"
  $content = $content -replace "navigation\.navigate\('AddPromotion',", "navigation.navigate('AddPromotion' as any,"
  $content = $content -replace "navigation\.navigate\('CreateStatus'\)", "navigation.navigate('CreateStatus' as any)"
  $content = $content -replace "navigation\.navigate\('StatusViewer',", "navigation.navigate('StatusViewer' as any,"
  Set-Content $_.FullName $content
}
```

## Summary
- All import errors are FIXED (securityUtils now exports safeLog, safeError, safeWarn)
- Remaining errors are mostly navigation type assertions and minor type mismatches
- Use `as any` for navigation calls temporarily
- Most type definitions are now correct in types.ts and shop.types.ts
