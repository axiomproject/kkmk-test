import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

console.log('API URL:', API_URL); // Debug log

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // Enable sending cookies
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', { 
      url: config.url, 
      method: config.method,
      baseURL: config.baseURL
    }); // Debug log
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.data); // Debug log
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message); // Debug log
    return Promise.reject(error);
  }
);

export default api;
