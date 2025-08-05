// saknew_frontend/App.tsx
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './navigation/AppNavigator';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { View, ActivityIndicator, Text } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import { BadgeProvider } from './context/BadgeContext';
import ErrorBoundary from './components/ErrorBoundary';
import NetworkStatus from './components/NetworkStatus';
// Only import essential network check
import './utils/networkCheck';
import { API_BASE_URL } from './config';
import { useState, useEffect } from 'react';

export default function App() {
  // Load your chosen fonts
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    // Show a loading indicator or splash screen while fonts are loading
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 20 }}>Loading...</Text>
        <Text style={{ marginTop: 10, fontSize: 12, color: '#666' }}>API: {API_BASE_URL}</Text>
      </View>
    );
  }

  return (
    // Wrap your entire application with ErrorBoundary and AuthProvider
    <ErrorBoundary>
      <AuthProvider>
        <BadgeProvider>
          <View style={{ flex: 1 }}>
            <NetworkStatus />
            <AppNavigator />
            <StatusBar style="auto" />
          </View>
        </BadgeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
