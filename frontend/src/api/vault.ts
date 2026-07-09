import { Platform } from 'react-native';
import apiClient from './axios';

export const getVaultRecords = async () => {
  const response = await apiClient.get('/vault/records');
  return response.data;
};

export const uploadReport = async (formData: FormData) => {
  const headers: any = {};
  if (Platform.OS !== 'web') {
    headers['Content-Type'] = 'multipart/form-data';
  }
  const response = await apiClient.post('/vault/upload', formData, { headers });
  return response.data;
};

export const getRecordDetail = async (id: string) => {
  const response = await apiClient.get(`/vault/records/${id}`);
  return response.data;
};
