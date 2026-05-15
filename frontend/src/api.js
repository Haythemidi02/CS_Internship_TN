// Central API base URL — set VITE_API_URL in your .env file for production
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Authenticated fetch wrapper.
 * Automatically attaches the JWT Bearer token from localStorage.
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    // Token expired or invalid — force logout
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
  return res;
}
