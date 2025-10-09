// saknew_frontend/config.ts

import Constants from 'expo-constants';

// Access environment variables from extra config in app.json/app.config.js
// Example app.config.js: { "expo": { "extra": { "SERVER_IP": "192.168.0.101" } } }
const extra = Constants.expoConfig?.extra ?? {};

export const SERVER_IP = extra.SERVER_IP || '192.168.0.102'; // Fallback for safety
export const SERVER_PORT = extra.SERVER_PORT || '8000';

export const API_BASE_URL = extra.API_BASE_URL || 'https://saknew-makert-e7ac1361decc.herokuapp.com/';
export const IMAGE_BASE_URL = extra.IMAGE_BASE_URL || 'https://saknew-makert-e7ac1361decc.herokuapp.com';
export const DJOSER_FRONTEND_DOMAIN = extra.DJOSER_FRONTEND_DOMAIN || `${SERVER_IP}:8081`;

export const DEBUG = __DEV__;
export const APP_ENV = DEBUG ? 'development' : 'production';

// Log configuration in development
if (DEBUG) {
  console.log('App Environment:', APP_ENV);
  console.log('SERVER_IP (from config.ts):', SERVER_IP);
  console.log('SERVER_PORT (from config.ts):', SERVER_PORT);
  console.log('API_BASE_URL (from config.ts):', API_BASE_URL);
  console.log('IMAGE_BASE_URL (from config.ts):', IMAGE_BASE_URL);
}
