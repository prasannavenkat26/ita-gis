import { demoRequest, LOCAL_DEMO_TOKEN } from '@/lib/demoApi';
import { ApiError } from '@/lib/apiError';

export const AUTH_TOKEN_KEY = 'farm-gis-access-token';

export { ApiError } from '@/lib/apiError';

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token === LOCAL_DEMO_TOKEN) {
    return demoRequest<T>(path, init);
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Cannot reach the Farm GIS backend. Start the Python API and try again.', 0);
  }

  if (response.status === 204) {
    if (!response.ok) throw new ApiError('The request could not be completed.', response.status);
    return undefined as T;
  }

  const result = await response.json().catch(() => null) as { detail?: string } | null;
  if (!response.ok) {
    throw new ApiError(result?.detail || `Request failed (${response.status}).`, response.status);
  }
  return result as T;
}
