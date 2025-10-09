// Emergency fix for PlatformConstants TurboModule error
import { Platform } from 'react-native';

// Safely define constants without overriding read-only properties
const createPlatformConstants = () => {
  try {
    return {
      OS: Platform.OS || 'unknown',
      Version: Platform.Version || '0',
      isPad: Platform.isPad || false,
      isTesting: false,
    };
  } catch (error) {
    return {
      OS: 'unknown',
      Version: '0',
      isPad: false,
      isTesting: false,
    };
  }
};

const platformConstants = createPlatformConstants();

// Mock TurboModuleRegistry if not available
if (typeof global !== 'undefined' && !global.__turboModuleProxy) {
  try {
    global.__turboModuleProxy = new Proxy({}, {
      get(target, name) {
        if (name === 'PlatformConstants') {
          return {
            getConstants: () => ({ ...platformConstants })
          };
        }
        return undefined;
      }
    });
  } catch (error) {
    console.warn('Could not set __turboModuleProxy:', error.message);
  }
}

// Also set global PlatformConstants as fallback, but safely
if (typeof global !== 'undefined' && !global.PlatformConstants) {
  try {
    Object.defineProperty(global, 'PlatformConstants', {
      value: Object.freeze({ ...platformConstants }),
      writable: false,
      configurable: false
    });
  } catch (error) {
    console.warn('Could not set PlatformConstants:', error.message);
  }
}

export default {};