import apiClient from './axios';

export const sendMessageToAssistant = async (message: string) => {
  const response = await apiClient.post('/companion/chat', { message });
  return response.data;
};
