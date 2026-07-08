import apiClient from './axios';

export const getSOSTriggerData = async () => {
  const response = await apiClient.get('/emergency/sos');
  return response.data;
};
