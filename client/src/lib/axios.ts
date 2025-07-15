import axios from 'axios';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      if (status === 401) {
        // Unauthorized - redirect to login
        localStorage.removeItem('auth_token');
        window.location.href = '/auth';
      }
      
      // Create standardized error message
      const message = data?.message || data?.error || error.message || 'An error occurred';
      throw new Error(`${status}: ${message}`);
    } else if (error.request) {
      // Network error
      throw new Error('Network error - please check your connection');
    } else {
      // Other error
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
);

export default apiClient;

// Convenience methods
export const api = {
  get: <T>(url: string, config?: any) => apiClient.get<T>(url, config),
  post: <T>(url: string, data?: any, config?: any) => apiClient.post<T>(url, data, config),
  put: <T>(url: string, data?: any, config?: any) => apiClient.put<T>(url, data, config),
  delete: <T>(url: string, config?: any) => apiClient.delete<T>(url, config),
  patch: <T>(url: string, data?: any, config?: any) => apiClient.patch<T>(url, data, config),
};

// File upload helper
export const uploadFile = async (file: File, parentPath?: string) => {
  const formData = new FormData();
  formData.append('file', file);
  if (parentPath) {
    formData.append('parentPath', parentPath);
  }

  return apiClient.post('/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// Multiple file upload helper
export const uploadFiles = async (files: File[], parentPath?: string) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  if (parentPath) {
    formData.append('parentPath', parentPath);
  }

  return apiClient.post('/files/upload-multiple', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};