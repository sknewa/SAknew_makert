import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { BadgeProvider } from './context/BadgeContext';
import AppNavigator from './navigation/AppNavigator';

console.log('🚀 App.tsx: Starting app initialization');

export default function App() {
  console.log('🚀 App.tsx: App component rendering');
  
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
