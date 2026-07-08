import apiClient from './axios';

export const getChatHistory = async () => {
  const response = await apiClient.get('/health-assistant/chat');
  return response.data;
};

export const sendMessageToAssistant = async (message: string, recordId?: string) => {
  const response = await apiClient.post('/health-assistant/chat', { message, record_id: recordId });
  return response.data;
};

export const clearChatHistory = async () => {
  const response = await apiClient.delete('/health-assistant/chat');
  return response.data;
};
