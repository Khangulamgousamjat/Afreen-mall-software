import axios from 'axios';

const getSanitizedApiHost = (): string => {
  if (typeof window !== 'undefined') {
    const customHost = localStorage.getItem('afreen_api_url');
    if (customHost && customHost.trim()) {
      return customHost.trim().replace(/\/$/, '').replace(/\/api\/v1$/, '');
    }
  }

  let url = import.meta.env.VITE_API_URL;
  if (!url || url.trim() === '') {
    // Default to localhost:4000 in dev and desktop, fallback to render cloud
    if (import.meta.env.DEV || (typeof window !== 'undefined' && Boolean((window as any).desktopAPI?.isDesktop))) {
      return 'http://localhost:4000';
    }
    return 'https://afreen-mall.onrender.com';
  }
  url = url.trim().replace(/\/$/, '');
  url = url.replace(/\/api\/v1$/, '');
  return url;
};

const API_HOST = getSanitizedApiHost();
const API_BASE = `${API_HOST}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60s — tolerates a Render free-tier cold start (~30-50s)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Pre-warm backend connection asynchronously on app mount
if (typeof window !== 'undefined') {
  axios.get(`${API_HOST.replace(/\/$/, '')}/health`, { timeout: 60000 }).catch(() => {});
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('afreen_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      sessionStorage.removeItem('afreen_token');
      sessionStorage.removeItem('afreen_user');
      sessionStorage.removeItem('afreen_session_expires');
      localStorage.removeItem('afreen_token');
      localStorage.removeItem('afreen_user');
      localStorage.removeItem('afreen_user_passwords');
    }
    return Promise.reject(error);
  }
);

