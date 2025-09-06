// saknew_frontend/config.ts

// Use static configuration to avoid Constants issues
const getConfigValue = (key: string, fallback: string): string => {
  // For now, use static values to avoid PlatformConstants error
  const staticConfig: Record<string, string> = {
    SERVER_IP: '192.168.8.101',
    SERVER_PORT: '8000',
    API_BASE_URL: 'http://192.168.8.101:8000/',
    IMAGE_BASE_URL: 'http://192.168.8.101:8000',
    DJOSER_FRONTEND_DOMAIN: '192.168.8.101:8081',
    DEBUG: 'true',
    APP_ENV: 'development'
  };
  
  return staticConfig[key] || fallback;
};

export const SERVER_IP = getConfigValue('SERVER_IP', '192.168.8.101');
export const SERVER_PORT = getConfigValue('SERVER_PORT', '8000');

export const API_BASE_URL = getConfigValue('API_BASE_URL', `http://${SERVER_IP}:${SERVER_PORT}/`);
export const IMAGE_BASE_URL = getConfigValue('IMAGE_BASE_URL', `http://${SERVER_IP}:${SERVER_PORT}`);
export const DJOSER_FRONTEND_DOMAIN = getConfigValue('DJOSER_FRONTEND_DOMAIN', `${SERVER_IP}:8081`);


export const DEBUG = getConfigValue('DEBUG', 'true') === 'true';
export const APP_ENV = getConfigValue('APP_ENV', 'development');

// Log configuration in development
if (DEBUG) {
  console.log('App Environment:', APP_ENV);
  console.log('SERVER_IP (from config.ts):', SERVER_IP);
  console.log('SERVER_PORT (from config.ts):', SERVER_PORT);
  console.log('API_BASE_URL (from config.ts):', API_BASE_URL);
  console.log('IMAGE_BASE_URL (from config.ts):', IMAGE_BASE_URL);
}
