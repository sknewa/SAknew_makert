import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { BadgeProvider } from './context/BadgeContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    // Inter — body, prices, data, filter chips, admin tables
    'Inter-Regular':   Inter_400Regular,
    'Inter-Medium':    Inter_500Medium,
    'Inter-SemiBold':  Inter_600SemiBold,
    'Inter-Bold':      Inter_700Bold,
    'Inter-ExtraBold': Inter_800ExtraBold,
    // Poppins — display, headings, shop banners, nav labels, buttons
    'Poppins-Regular':   require('./assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Medium':    require('./assets/fonts/Poppins-Medium.ttf'),
    'Poppins-SemiBold':  require('./assets/fonts/Poppins-SemiBold.ttf'),
    'Poppins-Bold':      require('./assets/fonts/Poppins-Bold.ttf'),
    'Poppins-ExtraBold': require('./assets/fonts/Poppins-ExtraBold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0D1B2A' }}>
        <ActivityIndicator size="large" color="#FFB81C" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BadgeProvider>
          <View style={{ flex: 1 }}>
            <AppNavigator />
            <StatusBar style="auto" />
          </View>
        </BadgeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
