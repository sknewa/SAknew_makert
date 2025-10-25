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
        // Log media URLs for debugging
        response.data.forEach((userStatus: any) => {
          userStatus.statuses?.forEach((status: any) => {
            if (status.media_url) {
              console.log('DEBUG: Status media_url:', status.id, status.media_type, status.media_url);
            }
          });
        });
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
        
        // Add the media file - fetch blob and convert to File
        const baseFilename = mediaUri.split('/').pop() || 'media';
        const fileType = mediaType === 'image' ? 'image/jpeg' : 'video/mp4';
        const extension = mediaType === 'image' ? '.jpg' : '.mp4';
        const filename = baseFilename.includes('.') ? baseFilename : `${baseFilename}${extension}`;
        console.log('DEBUG: Media file details:', { filename, fileType, mediaUri });
        
        // Fetch the blob from the blob URL
        const fetchResponse = await fetch(mediaUri);
        const blob = await fetchResponse.blob();
        const file = new File([blob], filename, { type: fileType });
        console.log('DEBUG: File created:', { size: file.size, type: file.type, name: file.name });
        
        formData.append('media_file', file);
        
        // Debug: Log FormData contents
        console.log('DEBUG: FormData entries:');
        for (const [key, value] of (formData as any).entries()) {
          if (value instanceof File) {
            console.log(`  ${key}: File(name=${value.name}, size=${value.size}, type=${value.type})`);
          } else {
            console.log(`  ${key}: ${value}`);
          }
        }
        
        console.log('DEBUG: Sending FormData to /api/status/');
        const response = await api.post('/api/status/', formData, {
          headers: {
            'Content-Type': undefined, // Let browser set multipart/form-data with boundary
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
      console.log('DEBUG: Deleting status with ID:', statusId);
      const response = await api.delete(`/api/status/${statusId}/`);
      console.log('DEBUG: Delete response:', response.status, response.data);
    } catch (error: any) {
      console.log('DEBUG: Delete error:', error?.response?.status, error?.response?.data, error?.message);
      SecurityUtils.safeLog('error', 'Error deleting status:', error?.message);
      throw error;
    }
  }
}

export default new StatusService();