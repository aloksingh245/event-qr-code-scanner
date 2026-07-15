import axios from 'axios';

// Dynamically determine the backend URL based on the window's hostname or environment variables.
// If accessing from phone via 192.168.x.x, it will use that IP instead of localhost.
const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5001/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add a request interceptor to inject the JWT token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('scannerToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
