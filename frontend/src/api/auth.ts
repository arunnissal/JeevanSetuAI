import apiClient from './axios';

// To be populated in Phase 2
export const login = async (data: any) => {
  const response = await apiClient.post('/auth/login', data);
  return response.data;
};

export const register = async (data: any) => {
  const response = await apiClient.post('/auth/register', data);
  return response.data;
};
export const getProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};

export const updateProfile = async (data: any) => {
  const response = await apiClient.put('/users/profile', data);
  return response.data;
};
