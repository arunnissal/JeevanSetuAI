import apiClient from './axios';

export const getVaultRecords = async () => {
  const response = await apiClient.get('/vault/records');
  return response.data;
};

export const uploadReport = async (formData: FormData) => {
  const response = await apiClient.post('/vault/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
