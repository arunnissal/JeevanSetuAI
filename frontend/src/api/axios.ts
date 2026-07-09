import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Axios Diagnostics (Development Only)
if (__DEV__ || process.env.EXPO_PUBLIC_ENV === 'development') {
  console.log(`[Axios Client] Initialized Base URL: ${API_URL}`);

  apiClient.interceptors.request.use(
    (config) => {
      const contentType = config.headers ? config.headers['Content-Type'] : undefined;
      const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
      
      console.log(`[Axios Request] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`);
      console.log(`[Axios Content-Type]`, contentType);
      console.log(`[Axios Is FormData]`, isFormData);
      console.log(`[Axios Headers]`, config.headers);
      
      if (config.data && !isFormData) {
        console.log(`[Axios Request Body]`, config.data);
      }
      return config;
    },
    (error) => {
      console.error(`[Axios Request Error]`, error);
      return Promise.reject(error);
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      console.log(`[Axios Response] ${response.status} <- ${response.config.url}`);
      return response;
    },
    (error) => {
      if (error.response) {
        console.error(`[Axios Response Error Status] ${error.response.status} <- ${error.config?.url}`);
        console.error(`[Axios Response Error Data]`, error.response.data);
      } else {
        console.error(`[Axios Network/Timeout Error]`, error.message);
      }
      return Promise.reject(error);
    }
  );
}

export default apiClient;
