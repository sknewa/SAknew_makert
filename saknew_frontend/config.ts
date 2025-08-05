// saknew_frontend/config.ts
import Constants from 'expo-constants';

// Access variables directly from Constants.expoConfig.extra
// We use non-null assertions (!) here because we expect these to be defined
// in app.json's 'extra' field. If they are truly missing,
// the app will crash early, indicating a configuration error.
export const SERVER_IP = Constants.expoConfig?.extra?.SERVER_IP || '192.168.8.101';
export const SERVER_PORT = Constants.expoConfig?.extra?.SERVER_PORT || '8000';

export const API_BASE_URL = Constants.expoConfig?.extra?.API_BASE_URL || `http://${SERVER_IP}:${SERVER_PORT}/`;
export const IMAGE_BASE_URL = Constants.expoConfig?.extra?.IMAGE_BASE_URL || `http://${SERVER_IP}:${SERVER_PORT}`;
export const DJOSER_FRONTEND_DOMAIN = Constants.expoConfig?.extra?.DJOSER_FRONTEND_DOMAIN || `${SERVER_IP}:8081`;


export const DEBUG = Constants.expoConfig?.extra?.DEBUG === 'true';
export const APP_ENV = Constants.expoConfig?.extra?.APP_ENV as string || 'development';

// Log configuration in development
if (DEBUG) {
  console.log('App Environment:', APP_ENV);
  console.log('SERVER_IP (from config.ts):', SERVER_IP);
  console.log('SERVER_PORT (from config.ts):', SERVER_PORT);
  console.log('API_BASE_URL (from config.ts):', API_BASE_URL);
  console.log('IMAGE_BASE_URL (from config.ts):', IMAGE_BASE_URL);
}
