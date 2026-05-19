import { registerRootComponent } from 'expo';

// Silence console output in development to remove logs
if (typeof __DEV__ !== 'undefined' && __DEV__) {
	const _noop = () => {};
	// Replace common console methods with no-ops
	console.log = _noop as any;
	console.warn = _noop as any;
	console.error = _noop as any;
	console.debug = _noop as any;
	console.info = _noop as any;
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
