import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyCart, getMyOrders } from '../services/salesService';
import { getMyWallet, refreshWallet } from '../services/walletService';
import { useAuth } from './AuthContext.minimal';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

interface BadgeContextType {
  cartCount: number;
  orderCount: number;
  walletBalance: string;
  refreshBadges: () => Promise<void>;
}

const BadgeContext = createContext<BadgeContextType | undefined>(undefined);

export const useBadges = () => {
  const context = useContext(BadgeContext);
  if (!context) {
    throw new Error('useBadges must be used within a BadgeProvider');
  }
  return context;
};

interface BadgeProviderProps {
  children: ReactNode;
}

export const BadgeProvider: React.FC<BadgeProviderProps> = ({ children }) => {
  const [cartCount, setCartCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState('0.00');
  const { user, handleUnauthorized } = useAuth();

  const refreshBadges = async (isRetry = false) => {
    if (!user) {
      // No user, clear all badges and stop.
      setCartCount(0);
      setOrderCount(0);
      setWalletBalance('0.00');
      return;
    }

    try {
      safeLog('Refreshing badges for user:', user.id);
      
      // Fetch cart and orders first. These might also fail, but the wallet is the one logging errors.
      const [cart, orders] = await Promise.all([
        getMyCart().catch(() => ({ items: [] })),
        getMyOrders().catch(() => [])
      ]);
      
      // Now, fetch the wallet data, which is causing the token error
      let wallet = { balance: '0.00' };
      try {
        safeLog('Fetching wallet data...');
        wallet = await refreshWallet();
        safeLog('Wallet data received:', wallet);
      } catch (error: any) {
        safeError('Wallet service error:', error);

        // Check if the error is a 401 Unauthorized from an expired token
        const isTokenError = error?.response?.data?.code === 'token_not_valid';

        if (isTokenError && !isRetry) {
          safeLog('Access token expired. Attempting to refresh...');
          const refreshedSuccessfully = await handleUnauthorized();
          if (refreshedSuccessfully) {
            safeLog('Token refresh successful. Retrying badge fetch.');
            return refreshBadges(true); // Retry the entire function
          }
          // If refresh fails, the user is logged out by handleUnauthorized, and this function will exit.
          return;
        }
      }

      const count = cart?.items?.length || 0;
      safeLog('Cart count updated:', count);
      setCartCount(count);
      
      if (user?.profile?.is_seller) {
        const unshippedOrders = (orders || []).filter(order => 
          (order.order_status === 'processing' || order.order_status === 'pending') && 
          order.items.some(item => item.product.shop?.user?.id === user.id) &&
          order.user.id !== user.id // Exclude orders where seller is also the buyer
        );
        safeLog('Seller unshipped orders count:', unshippedOrders.length);
        setOrderCount(unshippedOrders.length);
      } else {
        setOrderCount(0);
      }
      
      const balance = wallet?.balance ? parseFloat(wallet.balance).toFixed(2) : '0.00';
      if (balance !== walletBalance) {
        safeLog('Wallet balance updated from', walletBalance, 'to', balance);
        setWalletBalance(balance);
      }
    } catch (error) {
      safeError('Error refreshing badges:', error);
    }
  };

  useEffect(() => {
    // This effect handles the case where the user logs in or out.
    // The 'user' dependency will trigger a re-run. If the user logs out,
    // the initial check `if (!user)` will clear the badges.
    if (user) {
      refreshBadges();
      const interval = setInterval(refreshBadges, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <BadgeContext.Provider value={{ cartCount, orderCount, walletBalance, refreshBadges }}>
      {children}
    </BadgeContext.Provider>
  );
};