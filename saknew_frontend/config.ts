// saknew_frontend/config.ts

import Constants from 'expo-constants';

// Access environment variables from extra config in app.json/app.config.js
// Example app.config.js: { "expo": { "extra": { "SERVER_IP": "192.168.0.101" } } }
const extra = Constants.expoConfig?.extra ?? {};

// New Heroku Backend with Business Email
export const SERVER_IP = extra.SERVER_IP || 'saknew-market-backend-f8738ecec7fa.herokuapp.com';
export const SERVER_PORT = extra.SERVER_PORT || '443';

export const API_BASE_URL = extra.API_BASE_URL || 'https://saknew-market-backend-f8738ecec7fa.herokuapp.com/';
export const IMAGE_BASE_URL = extra.IMAGE_BASE_URL || 'https://saknew-market-backend-f8738ecec7fa.herokuapp.com';
export const DJOSER_FRONTEND_DOMAIN = extra.DJOSER_FRONTEND_DOMAIN || 'samakert.netlify.app';

export const DEBUG = __DEV__;
export const APP_ENV = DEBUG ? 'development' : 'production';

// Avoid console logging here; logging is handled globally in `index.ts`.
