import api from './apiClient';
import { Status, StatusView, UserStatus } from './status.types';
import { SecurityUtils } from '../utils/securityUtils';

class StatusService {
  async getUserStatuses(): Promise<UserStatus[]> {
    try {
      console.log('DEBUG: Fetching user statuses from /api/status/users/');
      const response = await api.get('/api/status/users/');
      console.log('DEBUG: Status response:', response.status, 'Data count:', Array.isArray(response.data) ? response.data.length : 'Not array');
      
      // Ensure we return an array even if the response is unexpected
      if (Array.isArray(response.data)) {
        console.log('DEBUG: User statuses data:', JSON.stringify(response.data, null, 2));
        console.log('DEBUG: Returning', response.data.length, 'user statuses');
        return response.data;
      } else {
        console.warn('DEBUG: Expected array but got:', typeof response.data);
        return [];
      }
    } catch (error: any) {
      console.log('DEBUG: Status fetch error:', error?.response?.status, error?.response?.data, error?.message);
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

  async createStatus(content: string, mediaUri?: string, mediaType?: 'image' | 'video' | 'text', backgroundColor?: string): Promise<Status> {
    try {
      console.log('DEBUG: StatusService.createStatus called with:', {
        contentLength: content.length,
        hasMediaUri: !!mediaUri,
        mediaType,
        backgroundColor
      });
      
      const sanitizedContent = SecurityUtils.sanitizeInput(content);
      console.log('DEBUG: Content sanitized, length:', sanitizedContent.length);
      
      if (mediaUri && (mediaType === 'image' || mediaType === 'video')) {
        console.log('DEBUG: Creating FormData for media upload');
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('content', sanitizedContent);
        formData.append('media_type', mediaType);
        if (backgroundColor) {
          formData.append('background_color', backgroundColor);
        }
        
        // Add the media file
        const filename = mediaUri.split('/').pop() || 'media';
        const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
        console.log('DEBUG: Media file details:', { filename, fileType, mediaUri });
        
        formData.append('media_file', {
          uri: mediaUri,
          type: fileType,
          name: filename,
        } as any);
        
        console.log('DEBUG: Sending FormData to /api/status/');
        const response = await api.post('/api/status/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('DEBUG: Media status created successfully:', response.status, response.data);
        return response.data;
      } else {
        console.log('DEBUG: Creating text-only status');
        const payload = {
          content: sanitizedContent,
          media_type: mediaType || 'text',
          background_color: backgroundColor
        };
        console.log('DEBUG: Text status payload:', payload);
        
        const response = await api.post('/api/status/', payload);
        console.log('DEBUG: Text status created successfully:', response.status, response.data);
        return response.data;
      }
    } catch (error: any) {
      console.log('DEBUG: Status creation error:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        config: error?.config
      });
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