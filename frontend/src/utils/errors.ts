export const getErrorMessage = (err: any, defaultMsg: string): string => {
  if (err.response) {
    const data = err.response.data;
    if (data) {
      if (data.errors) {
        const keys = Object.keys(data.errors);
        if (keys.length > 0) {
          const firstKey = keys[0];
          const firstError = data.errors[firstKey];
          if (Array.isArray(firstError) && firstError.length > 0) {
            return firstError[0];
          }
          if (typeof firstError === 'string') {
            return firstError;
          }
        }
      }
      if (data.message && data.message !== 'Registration failed' && data.message !== 'Validation failed' && data.message !== 'Error occurred') {
        return data.message;
      }
      if (data.detail) {
        return data.detail;
      }
    }
    return `${defaultMsg} (${err.response.status})`;
  }
  if (err.message) {
    if (err.message.toLowerCase().includes('network error') || err.message.toLowerCase().includes('timeout')) {
      return 'Connection error. Please check if the backend server is running and accessible.';
    }
    return err.message;
  }
  return defaultMsg;
};
