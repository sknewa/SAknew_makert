// saknew_frontend/screens/Shop/ShopRedirectScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext.minimal';

const ShopRedirectScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    // Only attempt navigation once authentication status is loaded
    if (!authLoading) {
      if (user?.profile?.is_seller) {
        // If user is a seller, navigate to their shop owner dashboard (ShopOwnerNavigator)
        // Use reset to ensure it's the root of the ShopOwner stack,
        // or simply navigate if you want to allow back button to previous tabs.
        // For a tab, a direct navigate is usually fine.
        navigation.dispatch(
          CommonActions.navigate({
            name: 'ShopOwner', // Name of the Stack.Screen in AppNavigator
            params: {
              screen: 'MyShop', // Initial screen within ShopOwnerNavigator
            },
          })
        );
      } else {
        // If user is not a seller, navigate to the create shop screen
        navigation.dispatch(
          CommonActions.navigate({
            name: 'CreateShop', // Name of the Stack.Screen in AppNavigator
          })
        );
      }
    }
  }, [user, authLoading, navigation]);

  // While redirecting or loading auth, show a loading indicator
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading shop experience...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333333',
  },
});

export default ShopRedirectScreen;
