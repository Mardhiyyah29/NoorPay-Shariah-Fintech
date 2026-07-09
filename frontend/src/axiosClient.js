import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach access token from localStorage on every request
client.interceptors.request.use((config) => {
  const access = localStorage.getItem('np_access');
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
}, (err) => Promise.reject(err));

// Response interceptor: attempt refresh on 401
client.interceptors.response.use((res) => res, async (error) => {
  const original = error.config;
  if (!original || original._retry) return Promise.reject(error);

  if (error.response && error.response.status === 401) {
    const refresh = localStorage.getItem('np_refresh');
    if (refresh) {
      original._retry = true;
      try {
        const r = await axios.post(`${BASE}/token/refresh/`, { refresh }, { headers: { 'Content-Type': 'application/json' } });
        if (r.data && r.data.access) {
          localStorage.setItem('np_access', r.data.access);
          original.headers.Authorization = `Bearer ${r.data.access}`;
          return client(original);
        }
      } catch (e) {
        // fall-through
      }
    }
    // If refresh failed, clear tokens and broadcast logout
    localStorage.removeItem('np_access');
    localStorage.removeItem('np_refresh');
    window.dispatchEvent(new Event('noorpay:logout'));
  }

  return Promise.reject(error);
});

export default client;
