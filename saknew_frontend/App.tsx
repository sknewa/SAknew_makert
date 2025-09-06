import React from 'react';
import { View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext.minimal';
import AppNavigator from './navigation/AppNavigator';

console.log('🚀 App.tsx: Starting app initialization');

export default function App() {
  console.log('🚀 App.tsx: App component rendering');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <View style={{ flex: 1 }}>
          <AppNavigator />
          <StatusBar style="auto" />
        </View>
      </AuthProvider>
    </ErrorBoundary>
  );
}
