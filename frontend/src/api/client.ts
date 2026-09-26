import axios from 'axios';

export const USER_API_BASE = import.meta.env.VITE_USER_API_URL || 'http://localhost:8001/api/v1';
export const ASSIGN_API_BASE = import.meta.env.VITE_ASSIGN_API_URL || 'http://localhost:8002/api/v1';
export const DOCS_API_BASE = import.meta.env.VITE_DOCS_API_URL || 'http://localhost:8003/api/v1';

export const userClient = axios.create({
  baseURL: USER_API_BASE,
});

export const assignClient = axios.create({
  baseURL: ASSIGN_API_BASE,
});

export const docsClient = axios.create({
  baseURL: DOCS_API_BASE,
});

const attachAuthInterceptor = (instance: typeof axios.create extends (...args: any) => infer R ? R : never) => {
  instance.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
};

attachAuthInterceptor(userClient);
attachAuthInterceptor(assignClient);
attachAuthInterceptor(docsClient);
