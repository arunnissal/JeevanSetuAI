import apiClient from './axios';

export const getTimelineEvents = async () => {
  const response = await apiClient.get('/timeline/');
  return response.data;
};
