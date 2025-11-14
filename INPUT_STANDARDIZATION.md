# Input Field Standardization

## Changes Made:
1. All placeholder text colors changed to light grey (#B0B0B0)
2. Removed border color changes on focus - inputs maintain same border whether focused or not
3. Users can clearly see they're in the input field by cursor position, not border changes

## Files Updated:
- LoginScreen.tsx
- RegisterScreen.tsx  
- PasswordResetRequestScreen.tsx
- PasswordResetConfirmScreen.tsx
- CreateShopScreen.tsx
- EditShopScreen.tsx
- AddProductScreen.tsx
- EditProductScreen.tsx
- ShippingScreen.tsx
- AddFundsScreen.tsx
- FeedbackScreen.tsx
- DeliveryVerificationScreen.tsx
- CreateStatusScreen.tsx

## Standard Input Style:
```typescript
placeholderTextColor="#B0B0B0"
borderColor: colors.border (no change on focus)
```
