import apiClient from './axios';

export const getDashboardData = async () => {
  const response = await apiClient.get('/dashboard/');
  return response.data;
};
