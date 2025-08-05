import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgeContext';

import HomeScreen from '../screens/Home/HomeScreen';
import CartScreen from '../screens/Sales/CartScreen';
import MyOrdersScreen from '../screens/Sales/MyOrdersScreen';
import WalletDashboardScreen from '../screens/Wallet/WalletDashboardScreen';
import ShopOwnerNavigator, { ShopOwnerStackParamList } from './ShopOwnerNavigator';
import CreateShopScreen from '../screens/ShopOwner/CreateShopScreen';

const colors = {
  primary: '#27AE60',
  card: '#FFFFFF',
  textSecondary: '#7F8C8D',
  error: '#E74C3C',
  white: '#FFFFFF',
  shadowColor: '#000',
  border: '#D0D3D4',
};

export type BottomTabParamList = {
  HomeTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
  WalletTab: undefined;
  ShopTab: NavigatorScreenParams<ShopOwnerStackParamList> | undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

const ShopTabContent = () => {
  const { user } = useAuth();
  return user?.profile?.is_seller ? <ShopOwnerNavigator /> : <CreateShopScreen />;
};

const MainTabNavigator = () => {
  const { cartCount, orderCount, walletBalance } = useBadges();
  console.log('MainTabNavigator - cartCount:', cartCount, 'orderCount:', orderCount, 'walletBalance:', walletBalance);

  const TabBarBadge = ({ count }: { count: number }) => {
    if (count === 0) return null;
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    );
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={size} color={color} />
                </View>
              );
            case 'CartTab':
              iconName = focused ? 'cart' : 'cart-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={size} color={color} />
                  <TabBarBadge count={cartCount} />
                </View>
              );
            case 'OrdersTab':
              iconName = focused ? 'receipt' : 'receipt-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={size} color={color} />
                  <TabBarBadge count={orderCount} />
                </View>
              );
            case 'WalletTab':
              iconName = focused ? 'wallet' : 'wallet-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={size} color={color} />
                  <View style={styles.walletBadge}>
                    <Text style={styles.walletBadgeText}>R{walletBalance}</Text>
                  </View>
                </View>
              );
            case 'ShopTab':
              iconName = focused ? 'storefront' : 'storefront-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={size} color={color} />
                  <TabBarBadge count={orderCount} />
                </View>
              );
            default:
              iconName = 'help-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 8,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: -2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="CartTab" component={CartScreen} options={{ title: 'Cart' }} />
      <Tab.Screen name="OrdersTab" component={MyOrdersScreen} options={{ title: 'Orders' }} />
      <Tab.Screen name="WalletTab" component={WalletDashboardScreen} options={{ title: '' }} />
      <Tab.Screen name="ShopTab" component={ShopTabContent} options={{ title: 'Shop' }} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBadge: {
    position: 'absolute',
    right: -12,
    top: -6,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 24,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  walletBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    right: -8,
    top: -4,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default MainTabNavigator;