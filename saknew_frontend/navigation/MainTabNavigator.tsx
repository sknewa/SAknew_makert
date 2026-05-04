import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigatorScreenParams } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, StyleSheet } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useBadges } from '../context/BadgeContext';
import CustomAlert from '../components/CustomAlert';

import HomeScreen from '../screens/Home/HomeScreen';
import CartScreen from '../screens/Sales/CartScreen';
import MyOrdersScreen from '../screens/Sales/MyOrdersScreen';
import WalletDashboardScreen from '../screens/Wallet/WalletDashboardScreen';
import ShopOwnerNavigator, { ShopOwnerStackParamList } from './ShopOwnerNavigator';
import CreateShopScreen from '../screens/ShopOwner/CreateShopScreen';

const colors = {
  primary:       '#007A4D',  // SA Green
  gold:          '#FFB81C',  // SA Gold
  card:          '#FFFFFF',
  textSecondary: '#333333',  // Dark grey inactive
  error:         '#DE3831',  // SA Red
  white:         '#FFFFFF',
  shadowColor:   '#000',
  border:        '#FFB81C',  // Gold top border
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
  const { isAuthenticated } = useAuth();
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', onConfirm: () => {} });
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
    <>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;
          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={20} color={color} />
                </View>
              );
            case 'CartTab':
              iconName = focused ? 'cart' : 'cart-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={20} color={color} />
                  <TabBarBadge count={cartCount} />
                </View>
              );
            case 'OrdersTab':
              iconName = focused ? 'receipt' : 'receipt-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={20} color={color} />
                  {isAuthenticated && <TabBarBadge count={orderCount} />}
                </View>
              );
            case 'WalletTab':
              iconName = focused ? 'wallet' : 'wallet-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={20} color={color} />
                  {isAuthenticated && (
                    <View style={styles.walletBadge}>
                      <Text style={styles.walletBadgeText}>R{walletBalance}</Text>
                    </View>
                  )}
                </View>
              );
            case 'ShopTab':
              iconName = focused ? 'storefront' : 'storefront-outline';
              return (
                <View style={styles.iconContainer}>
                  <Ionicons name={iconName} size={20} color={color} />
                  {isAuthenticated && <TabBarBadge count={orderCount} />}
                </View>
              );
            default:
              iconName = 'help-circle-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007A4D',
        tabBarInactiveTintColor: '#333333',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#FFB81C',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          height: Platform.OS === 'ios' ? 70 : 56,
          paddingBottom: Platform.OS === 'ios' ? 12 : 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          marginTop: -1,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'SAknew' }} />
      <Tab.Screen 
        name="CartTab" 
        component={CartScreen} 
        options={({ route }) => ({
          title: 'Cart',
          tabBarStyle: (route.params as any)?.hideTabBar
            ? { display: 'none' }
            : {
                backgroundColor: colors.card,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
                elevation: 4,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: -1 },
                shadowOpacity: 0.08,
                shadowRadius: 3,
                height: Platform.OS === 'ios' ? 70 : 56,
                paddingBottom: Platform.OS === 'ios' ? 12 : 6,
                paddingTop: 6,
              },
        })}
      />
      <Tab.Screen 
        name="OrdersTab" 
        component={MyOrdersScreen} 
        options={{ title: 'Orders' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthenticated) {
              e.preventDefault();
              setAlertConfig({
                visible: true,
                title: 'Login Required',
                message: 'Please login to view your orders',
                onConfirm: () => {
                  setAlertConfig({ ...alertConfig, visible: false });
                  navigation.getParent()?.navigate('Login' as any);
                },
              });
            }
          },
        })}
      />
      <Tab.Screen 
        name="WalletTab" 
        component={WalletDashboardScreen} 
        options={{ title: 'Wallet' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthenticated) {
              e.preventDefault();
              setAlertConfig({
                visible: true,
                title: 'Login Required',
                message: 'Please login to access your wallet',
                onConfirm: () => {
                  setAlertConfig({ ...alertConfig, visible: false });
                  navigation.getParent()?.navigate('Login' as any);
                },
              });
            }
          },
        })}
      />
      <Tab.Screen 
        name="ShopTab" 
        component={ShopTabContent} 
        options={{ title: 'Shop' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            if (!isAuthenticated) {
              e.preventDefault();
              setAlertConfig({
                visible: true,
                title: 'Login Required',
                message: 'Please login to manage your shop',
                onConfirm: () => {
                  setAlertConfig({ ...alertConfig, visible: false });
                  navigation.getParent()?.navigate('Login' as any);
                },
              });
            }
          },
        })}
      />
    </Tab.Navigator>
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onCancel={() => setAlertConfig({ ...alertConfig, visible: false })}
        onConfirm={alertConfig.onConfirm}
        confirmText="Login"
      />
    </>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletBadge: {
    position: 'absolute', right: -10, top: -5,
    backgroundColor: '#007A4D',
    borderRadius: 6, minWidth: 20, height: 14,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  walletBadgeText: { color: '#fff', fontSize: 7, fontWeight: 'bold' },
  badge: {
    position: 'absolute', right: -6, top: -3,
    backgroundColor: '#DE3831',
    borderRadius: 8, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});

export default MainTabNavigator;