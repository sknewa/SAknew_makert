# PayFast Test Integration Guide

## Overview
The wallet system now uses PayFast sandbox for testing payments. Users can add funds to their wallet using test credit cards.

## Test Credentials
- **Merchant ID**: 10000100
- **Merchant Key**: 46f0cd694581a  
- **Passphrase**: jt7NOE43FZPn
- **Environment**: Sandbox (https://sandbox.payfast.co.za)

## Test Credit Cards

### Visa Test Cards
- **Card Number**: 4000 0000 0000 0002
- **CVV**: Any 3 digits (e.g., 123)
- **Expiry**: Any future date (e.g., 12/25)
- **Name**: Any name

### Mastercard Test Cards  
- **Card Number**: 5200 0000 0000 0007
- **CVV**: Any 3 digits (e.g., 456)
- **Expiry**: Any future date (e.g., 12/25)
- **Name**: Any name

## How to Test

1. **Register/Login** to your account on https://samakert.com
2. **Navigate to Wallet** from the main menu
3. **Click "Add Funds"** 
4. **Select "Pay with Card"**
5. **Enter amount** (minimum R10, maximum R10,000)
6. **Click "Pay with PayFast"** - you'll be redirected to PayFast sandbox
7. **Use test card details** from above
8. **Complete payment** - you'll be redirected back to the wallet
9. **Check wallet balance** - funds should be added automatically

## Payment Flow

1. User initiates deposit → Creates pending transaction
2. Redirects to PayFast sandbox → User enters test card details  
3. PayFast processes payment → Sends webhook notification
4. Backend verifies webhook → Updates transaction status to completed
5. Wallet balance updated → User sees new balance

## Webhook Endpoint
- **URL**: `https://saknew-market-backend-f8738ecec7fa.herokuapp.com/api/wallet/payfast-webhook/`
- **Method**: POST
- **Purpose**: Receives payment notifications from PayFast

## Environment Variables

Set these in your Heroku config vars or .env file:

```bash
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f0cd694581a
PAYFAST_PASSPHRASE=jt7NOE43FZPn
PAYFAST_SANDBOX=True
```

## Security Features

- ✅ Signature verification for all webhooks
- ✅ Duplicate payment prevention  
- ✅ Secure transaction logging
- ✅ PCI-DSS compliant (PayFast handles card data)
- ✅ HTTPS-only communication

## Troubleshooting

### Payment Not Completing
- Check webhook logs in Heroku: `heroku logs --tail -a saknew-market-backend`
- Verify webhook URL is accessible
- Ensure test card details are correct

### Signature Verification Fails
- Check passphrase matches in settings
- Verify merchant credentials are correct
- Ensure webhook data is not modified in transit

### Transaction Not Found
- Check custom_str1 parameter contains valid transaction ID
- Verify transaction exists in database before payment

## Production Setup

To switch to live PayFast:

1. Get live merchant credentials from PayFast
2. Set `PAYFAST_SANDBOX=False`
3. Update merchant ID and key with live credentials
4. Test with small amounts first
5. Monitor webhook logs carefully

## Support

For PayFast integration issues:
- PayFast Documentation: https://developers.payfast.co.za/
- PayFast Support: support@payfast.co.za
- Test Environment: https://sandbox.payfast.co.za/