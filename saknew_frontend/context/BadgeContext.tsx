import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMyCart, getMyOrders } from '../services/salesService';
import { getMyWallet } from '../services/walletService';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();

  const refreshBadges = async () => {
    if (!user) return;

    try {
      const [cart, orders, wallet] = await Promise.all([
        getMyCart(),
        getMyOrders(),
        getMyWallet()
      ]);

      const count = cart.items?.length || 0;
      console.log('Cart count updated:', count);
      setCartCount(count);
      
      if (user?.profile?.is_seller) {
        const unshippedOrders = orders.filter(order => 
          (order.order_status === 'processing' || order.order_status === 'pending') && 
          order.items.some(item => item.product.shop?.user?.id === user.id) &&
          order.user.id !== user.id // Exclude orders where seller is also the buyer
        );
        console.log('Seller unshipped orders count:', unshippedOrders.length);
        setOrderCount(unshippedOrders.length);
      } else {
        setOrderCount(0);
      }
      
      const balance = parseFloat(wallet.balance).toFixed(2);
      console.log('Wallet balance updated:', balance);
      setWalletBalance(balance);
    } catch (error) {
      console.log('Error refreshing badges:', error);
    }
  };

  useEffect(() => {
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