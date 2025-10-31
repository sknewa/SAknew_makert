import apiClient from './apiClient';

export const submitFeedback = async (feedback: string) => {
  const response = await apiClient.post('/api/feedback/submit/', { feedback });
  return response.data;
};
