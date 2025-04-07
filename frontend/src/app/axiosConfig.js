import axios from 'axios';

// Create an instance of axios
const axiosInstance = axios.create();

// Request interceptor to add authorization token
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If error is 401 (Unauthorized) and we haven't already tried to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh');
        
        if (refreshToken) {
          // Get a new token using the refresh token
          const response = await axios.post('/api/token/refresh/', {
            refresh: refreshToken
          });
          
          const newToken = response.data.access;
          
          // Store the new token
          localStorage.setItem('token', newToken);
          
          // Update the authorization header
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Retry the original request
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        localStorage.removeItem('user');
        
        // Redirect to login
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Set up global default axios
// Use environment variable for API URL, fallback to window.location.origin
axios.defaults.baseURL = process.env.REACT_APP_API_URL || '';

console.log('API URL:', axios.defaults.baseURL || 'Using relative URLs');

// Apply interceptors to global axios
axios.interceptors.request.use(
  axiosInstance.interceptors.request.handlers[0].fulfilled,
  axiosInstance.interceptors.request.handlers[0].rejected
);

axios.interceptors.response.use(
  axiosInstance.interceptors.response.handlers[0].fulfilled,
  axiosInstance.interceptors.response.handlers[0].rejected
);

export default axiosInstance; 