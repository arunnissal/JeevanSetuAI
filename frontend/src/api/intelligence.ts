import apiClient from './axios';

export const getProcessingStatus = async (recordId: string) => {
  const response = await apiClient.get(`/intelligence/status/${recordId}`);
  return response.data;
};

export const getAIInsights = async () => {
  const response = await apiClient.get('/intelligence/insights');
  return response.data;
};
