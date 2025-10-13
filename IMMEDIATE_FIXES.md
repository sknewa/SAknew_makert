# Immediate Fixes Required

## 1. Fix Package Dependencies

### Update package.json with compatible versions:

```json
{
  "dependencies": {
    "@expo-google-fonts/inter": "^0.4.1",
    "@expo/metro-runtime": "~6.1.2",
    "@react-native-async-storage/async-storage": "1.24.0",
    "@react-native-community/datetimepicker": "8.4.4",
    "@react-navigation/bottom-tabs": "^6.5.8",
    "@react-navigation/native": "^6.1.7",
    "@react-navigation/native-stack": "^6.9.13",
    "@react-navigation/stack": "^6.3.17",
    "axios": "^1.10.0",
    "expo": "54.0.12",
    "expo-av": "~16.0.7",
    "expo-constants": "~18.0.9",
    "expo-device": "~8.0.9",
    "expo-file-system": "~19.0.16",
    "expo-font": "~14.0.8",
    "expo-image-picker": "~17.0.8",
    "expo-linear-gradient": "~15.0.7",
    "expo-location": "~19.0.7",
    "expo-status-bar": "~3.0.8",
    "firebase": "^10.12.5",
    "jwt-decode": "^4.0.0",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.4",
    "react-native-safe-area-context": "~5.6.0",
    "react-native-screens": "~4.16.0",
    "react-native-web": "^0.21.0"
  }
}
```

## 2. Create Better Network Handling

### Replace NetInfo with custom network checker:

```typescript
// utils/networkManager.ts
export class NetworkManager {
  private static instance: NetworkManager;
  private isOnline: boolean = true;
  private listeners: ((isOnline: boolean) => void)[] = [];

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        timeout: 5000,
      });
      this.isOnline = response.ok;
    } catch {
      this.isOnline = false;
    }
    
    this.notifyListeners();
    return this.isOnline;
  }

  addListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (isOnline: boolean) => void) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }
}
```

## 3. Improve Error Handling

### Create comprehensive error boundary:

```typescript
// components/GlobalErrorBoundary.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Global Error Boundary caught an error:', error, errorInfo);
    // Log to crash reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
```

## 4. Fix App.tsx Structure

```typescript
// App.tsx
import './expo-fix';
import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import { AuthProvider } from './context/AuthContext.minimal';
import { BadgeProvider } from './context/BadgeContext';
import { NetworkProvider } from './context/NetworkContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <GlobalErrorBoundary>
      <NetworkProvider>
        <AuthProvider>
          <BadgeProvider>
            <View style={{ flex: 1 }}>
              <AppNavigator />
              <StatusBar style="auto" />
            </View>
          </BadgeProvider>
        </AuthProvider>
      </NetworkProvider>
    </GlobalErrorBoundary>
  );
}
```

## 5. Commands to Run

```bash
# 1. Clean and reinstall dependencies
cd saknew_frontend
rm -rf node_modules package-lock.json
npm install

# 2. Clear Expo cache
npx expo start --clear

# 3. If still having issues, reset Metro cache
npx react-native start --reset-cache

# 4. For Android, clean build
cd android && ./gradlew clean && cd ..
```

## 6. Environment Configuration

### Update .env file:
```env
SERVER_IP=saknew-makert-e7ac1361decc.herokuapp.com
SERVER_PORT=443
API_BASE_URL=https://saknew-makert-e7ac1361decc.herokuapp.com/
IMAGE_BASE_URL=https://saknew-makert-e7ac1361decc.herokuapp.com
DEBUG=false
APP_ENV=production
```

## 7. Test the Fixes

1. Start the development server: `npm start`
2. Open in Android Studio emulator
3. Check console for any remaining errors
4. Test basic navigation and API calls
5. Verify image loading works correctly

## Next Steps After Fixes

1. Implement proper logging system
2. Add crash reporting (Sentry)
3. Set up automated testing
4. Optimize performance
5. Add offline capabilities