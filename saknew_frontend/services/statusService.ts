import api from './apiClient';
import { Status, StatusView, UserStatus } from './status.types';
import { SecurityUtils } from '../utils/securityUtils';

class StatusService {
  async getUserStatuses(): Promise<UserStatus[]> {
    try {
      console.log('DEBUG: Fetching user statuses from /api/status/users/');
      const response = await api.get('/api/status/users/');
      console.log('DEBUG: Status response:', response.status, response.data);
      
      // Ensure we return an array even if the response is unexpected
      if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn('DEBUG: Expected array but got:', typeof response.data);
        return [];
      }
    } catch (error: any) {
      console.log('DEBUG: Status error:', error?.response?.status, error?.response?.data, error?.message);
      SecurityUtils.safeLog('error', 'Error fetching user statuses:', error?.message);
      return []; // Return empty array instead of throwing
    }
  }

  async getMyStatuses(): Promise<Status[]> {
    try {
      const response = await api.get('/api/status/my/');
      return response.data;
    } catch (error: any) {
      SecurityUtils.safeLog('error', 'Error fetching my statuses:', error?.message);
      throw error;
    }
  }

  async createStatus(content: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'text', backgroundColor?: string): Promise<Status> {
    try {
      const sanitizedContent = SecurityUtils.sanitizeInput(content);
      const response = await api.post('/api/status/', {
        content: sanitizedContent,
        media_url: mediaUrl,
        media_type: mediaType,
        background_color: backgroundColor
      });
      return response.data;
    } catch (error: any) {
      SecurityUtils.safeLog('error', 'Error creating status:', error?.message);
      throw error;
    }
  }

  async viewStatus(statusId: number): Promise<void> {
    try {
      await api.post(`/api/status/${statusId}/view/`);
    } catch (error: any) {
      SecurityUtils.safeLog('error', 'Error viewing status:', error?.message);
      throw error;
    }
  }

  async deleteStatus(statusId: number): Promise<void> {
    try {
      await api.delete(`/api/status/${statusId}/`);
    } catch (error: any) {
      SecurityUtils.safeLog('error', 'Error deleting status:', error?.message);
      throw error;
    }
  }
}

export default new StatusService();