import api from './apiClient';
import { Status, StatusView, UserStatus } from './status.types';
import { safeLog, safeWarn } from '../utils/securityUtils';

class StatusService {
  async getUserStatuses(): Promise<UserStatus[]> {
    try {
      safeLog('DEBUG: Fetching user statuses from /api/status/users/');
      const response = await api.get('/api/status/users/');
      safeLog('DEBUG: Status response:', response.status, 'Data count:', Array.isArray(response.data) ? response.data.length : 'Not array');
      
      // Ensure we return an array even if the response is unexpected
      if (Array.isArray(response.data)) {
        // Log media URLs for debugging
        response.data.forEach((userStatus: any) => {
          userStatus.statuses?.forEach((status: any) => {
            if (status.media_url) {
              safeLog('DEBUG: Status media_url:', status.id, status.media_type, status.media_url);
            }
          });
        });
        safeLog('DEBUG: Returning', response.data.length, 'user statuses');
        return response.data;
      } else {
        safeWarn('DEBUG: Expected array but got:', typeof response.data);
        return [];
      }
    } catch (error: any) {
      safeLog('DEBUG: Status fetch error:', error?.response?.status, error?.response?.data, error?.message);
      safeLog('Error fetching user statuses:', error?.message);
      return []; // Return empty array instead of throwing
    }
  }

  async getMyStatuses(): Promise<Status[]> {
    try {
      const response = await api.get('/api/status/my/');
      return response.data;
    } catch (error: any) {
      safeLog('Error fetching my statuses:', error?.message);
      throw error;
    }
  }

  async createStatus(content: string, mediaUri?: string, mediaType?: 'image' | 'video' | 'text', backgroundColor?: string): Promise<Status> {
    try {
      console.log('DEBUG statusService: createStatus called with:', { hasMediaUri: !!mediaUri, mediaType, backgroundColor });
      
      if (mediaUri && (mediaType === 'image' || mediaType === 'video')) {
        console.log('DEBUG statusService: Creating FormData for', mediaType);
        const formData = new FormData();
        formData.append('content', content || '');
        formData.append('media_type', mediaType);
        if (backgroundColor) formData.append('background_color', backgroundColor);
        
        const filename = `status_${Date.now()}${mediaType === 'image' ? '.jpg' : '.mp4'}`;
        const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
        console.log('DEBUG statusService: Filename:', filename, 'Type:', fileType);
        
        console.log('DEBUG statusService: Fetching blob from:', mediaUri);
        const blob = await fetch(mediaUri).then(r => r.blob());
        console.log('DEBUG statusService: Blob size:', blob.size, 'Type:', blob.type);
        
        formData.append('media_file', new File([blob], filename, { type: fileType }));
        console.log('DEBUG statusService: FormData prepared, sending to API...');
        
        const response = await api.post('/api/status/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            console.log('DEBUG statusService: Upload progress:', percentCompleted + '%');
          }
        });
        console.log('DEBUG statusService: API response:', response.status, response.data);
        return response.data;
      } else {
        console.log('DEBUG statusService: Creating text status');
        const response = await api.post('/api/status/', {
          content,
          media_type: mediaType || 'text',
          background_color: backgroundColor
        });
        console.log('DEBUG statusService: Text status created:', response.data);
        return response.data;
      }
    } catch (error: any) {
      console.log('DEBUG statusService: Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      safeLog('Status creation error:', error?.response?.data || error?.message);
      throw error;
    }
  }

  async viewStatus(statusId: number): Promise<void> {
    try {
      await api.post(`/api/status/${statusId}/view/`);
    } catch (error: any) {
      safeLog('Error viewing status:', error?.message);
      throw error;
    }
  }

  async deleteStatus(statusId: number): Promise<void> {
    try {
      safeLog('DEBUG: Deleting status with ID:', statusId);
      const response = await api.delete(`/api/status/${statusId}/`);
      safeLog('DEBUG: Delete response:', response.status, response.data);
    } catch (error: any) {
      safeLog('DEBUG: Delete error:', error?.response?.status, error?.response?.data, error?.message);
      safeLog('Error deleting status:', error?.message);
      throw error;
    }
  }
}

export default new StatusService();