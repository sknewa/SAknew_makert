// saknew_frontend/services/publicApiClient.ts
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { safeLog, safeError, safeWarn } from '../utils/securityUtils';

// Create a separate Axios instance for public endpoints that don't require authentication
const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
  withCredentials: false,
  maxRedirects: 5,
  validateStatus: (status) => status < 500, // Only reject if server error
});

safeLog('Public API Client: Initializing with baseURL:', API_BASE_URL);

export default publicApiClient;