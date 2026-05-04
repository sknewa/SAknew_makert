# Simple Wallet System - Launch Ready

## Overview
This is a simplified wallet system designed for immediate launch. Users can load money via bank transfers, and admins manually approve deposits.

## How It Works

### For Users:
1. **Request Deposit**: User enters amount and optional bank reference
2. **Get Bank Details**: System provides bank account details and unique reference
3. **Make Transfer**: User transfers money to provided bank account
4. **Wait for Approval**: Admin verifies payment and approves deposit
5. **Wallet Credited**: Balance reflects in user's wallet

### For Admins:
1. **Monitor Deposits**: Check `/admin/wallet/transaction/` for pending deposits
2. **Verify Payment**: Check bank account for incoming transfers
3. **Approve/Reject**: Click approve or reject buttons in admin panel
4. **User Notified**: System sends email confirmation to user

## API Endpoints

### User Endpoints:
- `GET /api/wallet/quick-wallet/` - Get wallet balance and recent transactions
- `POST /api/wallet/simple-deposit/` - Request a deposit
- `GET /api/wallet/wallets/my-wallet/` - Full wallet details
- `GET /api/wallet/wallets/transactions/` - All transactions

### Admin Endpoints:
- `GET /api/wallet/admin/pending-deposits/` - List pending deposits
- `POST /api/wallet/admin/approve-deposit/<id>/` - Approve deposit
- `POST /api/wallet/admin/reject-deposit/<id>/` - Reject deposit
- `POST /api/wallet/admin/manual-credit/` - Manually credit user wallet

## Bank Details (Update these in production)
```
Bank: FNB
Account Name: SAknew Market
Account Number: 62847291847
Branch Code: 250655
```

## Frontend Integration

### Request Deposit:
```typescript
import { requestDeposit } from '../services/walletService';

const handleDeposit = async () => {
  try {
    const result = await requestDeposit(100, 'MY_REF_123');
    // Show bank details to user
    console.log(result.bank_details);
  } catch (error) {
    console.error('Deposit request failed:', error);
  }
};
```

### Check Balance:
```typescript
import { getQuickWallet } from '../services/walletService';

const checkBalance = async () => {
  try {
    const wallet = await getQuickWallet();
    console.log('Balance:', wallet.balance);
  } catch (error) {
    console.error('Failed to get balance:', error);
  }
};
```

## Admin Management

1. **Access Admin Panel**: Go to `/admin/wallet/transaction/`
2. **Filter Pending**: Filter by status "PENDING_VERIFICATION"
3. **Verify Payment**: Check your bank account for the transfer
4. **Approve/Reject**: Click the action buttons
5. **User Notified**: System automatically sends email to user

## Email Notifications

The system automatically sends emails for:
- Deposit request confirmation (with bank details)
- Deposit approval confirmation
- Deposit rejection notification

## Security Features

- All transactions are logged
- Admin actions are tracked
- Email notifications for transparency
- Atomic database operations
- User authentication required

## Launch Checklist

- [ ] Update bank details in `simple_wallet_views.py`
- [ ] Test deposit request flow
- [ ] Test admin approval flow
- [ ] Verify email notifications work
- [ ] Set up admin user account
- [ ] Test with real bank transfer (small amount)

## Future Enhancements

After launch, you can add:
- Automated payment verification (bank API integration)
- PayFast/Yoco integration for instant deposits
- Mobile money integration (EFT, etc.)
- Bulk deposit processing
- Advanced reporting and analytics

## Support

For any issues:
1. Check Django admin logs
2. Check Heroku logs: `heroku logs --tail`
3. Verify database transactions in admin panel
4. Contact technical support if needed