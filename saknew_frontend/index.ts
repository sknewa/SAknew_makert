import { registerRootComponent } from 'expo';

// Keep console output enabled so logs and errors are visible during development.
// This is important for debugging backend/API status and email flows.
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('App starting in development mode. Console logging is enabled.');
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
