// API utility functions
import axios from 'axios';
import axiosInstance from '../../../app/axiosConfig';

// Get axios instance with fallback
export const getAxiosInstance = () => {
  if (axiosInstance) {
    return axiosInstance;
  }
  
  console.warn('Using fallback axios instance - axiosInstance import may have failed');
  
  // Create a basic axios instance with auth token
  const fallbackInstance = axios.create();
  
  // Add auth header to all requests
  fallbackInstance.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  
  return fallbackInstance;
}; 