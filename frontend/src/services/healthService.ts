import api from './api';

/**
 * healthService.ts
 * Calls the backend health endpoint.
 * Used by the app to verify the backend is reachable.
 */

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment: string;
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await api.get<HealthResponse>('/health');
  return res.data;
}
