/**
 * api.ts
 * Central Axios instance for all backend communication.
 * Base URL is read from environment variables — never hardcoded.
 */

import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';

const rawApiUrl = (import.meta.env.VITE_API_URL || '/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Request Interceptor ───────────────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ─── Response Interceptor ──────────────────────────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: any) => {
    // Normalise error messages for UI consumption
    const message =
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default api;
