const API_BASE = 'http://localhost:8000';

export interface SpatialQueryRequest {
  latitude: number;
  longitude: number;
  radius: number;
  query?: string;
  session_id?: string;
}

export interface SpatialQueryResponse {
  type: string;
  features: Array<{
    type: string;
    geometry: { type: string; coordinates: number[] | number[][] | number[][][] };
    properties: Record<string, unknown>;
  }>;
  execution_time_ms: number;
  query_type: string;
}

export interface GeocodeResult {
  display_name: string;
  lat: number;
  lng: number;
  place_type: string;
}

export interface ChatRequest {
  message: string;
  session_id: string;
  location_lat?: number;
  location_lng?: number;
  location_name?: string;
  context?: Record<string, unknown>;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

function adminRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('bizby_admin_token');
  return request<T>(endpoint, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...options?.headers },
  });
}

// ── Spatial ──────────────────────────────────────────────
export const spatialApi = {
  bufferZone: (req: SpatialQueryRequest) =>
    request<SpatialQueryResponse>('/spatial/buffer-zone', { method: 'POST', body: JSON.stringify(req) }),
  within: (req: SpatialQueryRequest) =>
    request<SpatialQueryResponse>('/spatial/within', { method: 'POST', body: JSON.stringify(req) }),
  contains: (req: SpatialQueryRequest) =>
    request<SpatialQueryResponse>('/spatial/contains', { method: 'POST', body: JSON.stringify(req) }),
  intersects: (req: SpatialQueryRequest) =>
    request<SpatialQueryResponse>('/spatial/intersects', { method: 'POST', body: JSON.stringify(req) }),
  supplyChain: (req: SpatialQueryRequest) =>
    request<SpatialQueryResponse>('/spatial/supply-chain', { method: 'POST', body: JSON.stringify(req) }),
  history: (limit = 20) => request<unknown[]>(`/spatial/history?limit=${limit}`),
};

// ── Overpass ──────────────────────────────────────────────
export interface OverpassFetchRequest {
  latitude: number;
  longitude: number;
  radius: number;
  categories?: string[];
}
export interface OverpassFetchResponse {
  fetched: number;
  inserted: number;
  updated: number;
  message: string;
}
export const overpassApi = {
  fetch: (req: OverpassFetchRequest) =>
    request<OverpassFetchResponse>('/overpass/fetch', { method: 'POST', body: JSON.stringify(req) }),
  categories: () => request<{ categories: { id: string; label: string; icon: string }[] }>('/overpass/categories'),
};

// ── Geocode ───────────────────────────────────────────────
export const geocodeApi = {
  search: (q: string) => request<GeocodeResult[]>(`/geocode?q=${encodeURIComponent(q)}`),
};

// ── AI ────────────────────────────────────────────────────
export const aiApi = {
  chat: (data: ChatRequest) =>
    request<{ response: string; session_id: string }>('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
  history: (sessionId: string) => request<unknown[]>(`/ai/history/${sessionId}`),
};

// ── Admin ─────────────────────────────────────────────────
export const adminApi = {
  login: (username: string, password: string) =>
    request<{ access_token: string; token_type: string }>('/admin/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    }),
  stats: () => adminRequest<Record<string, unknown>>('/admin/stats'),
  searches: (page = 1) => adminRequest<Record<string, unknown>>(`/admin/searches?page=${page}`),
  aiLogs: (page = 1) => adminRequest<Record<string, unknown>>(`/admin/ai-logs?page=${page}`),
  heatmap: () => adminRequest<Array<{ lat: number; lng: number }>>('/admin/heatmap'),
  reset: () => adminRequest<{ message: string }>('/admin/reset', { method: 'DELETE' }),
};