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

  console.log("========== INSIDE uploadReport ==========");

  for (const pair of formData.entries()) {
    console.log("FormData:", pair[0], pair[1]);
  }

  console.log("Platform:", Platform.OS);

  console.log("========================================");

  const response = await apiClient.post('/vault/upload', formData, { headers });
  return response.data;
};

export const getRecordDetail = async (id: string) => {
  const response = await apiClient.get(`/vault/records/${id}`);
  return response.data;
};
