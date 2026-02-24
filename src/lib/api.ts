const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

let accessToken: string | null = localStorage.getItem('access_token');
let refreshToken: string | null = localStorage.getItem('refresh_token');

const setTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = () => {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    accessToken = data.access;
    localStorage.setItem('access_token', data.access);
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    }
  }

  return res;
};

// Auth helpers
export const login = async (username: string, password: string) => {
  const res = await fetch(`${API_BASE_URL}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  setTokens(data.access, data.refresh);
  return data;
};

export const register = async (username: string, email: string, password: string) => {
  const res = await fetch(`${API_BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
};

export const isAuthenticated = () => !!accessToken;

// Food API
export const foodApi = {
  logEntry: (data: Record<string, unknown>) =>
    apiFetch('/food/entries/', { method: 'POST', body: JSON.stringify(data) }),
  getEntries: (date?: string) =>
    apiFetch(`/food/entries/${date ? `?date=${date}` : ''}`),
  getToday: () => apiFetch('/food/entries/today/'),
  getDailySummary: (days = 7) => apiFetch(`/food/entries/daily_summary/?days=${days}`),
  updateEntry: (id: number, data: Record<string, unknown>) =>
    apiFetch(`/food/entries/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEntry: (id: number) =>
    apiFetch(`/food/entries/${id}/`, { method: 'DELETE' }),
  getFavorites: () => apiFetch('/food/favorites/'),
  addFavorite: (data: Record<string, unknown>) =>
    apiFetch('/food/favorites/', { method: 'POST', body: JSON.stringify(data) }),
  deleteFavorite: (id: number) =>
    apiFetch(`/food/favorites/${id}/`, { method: 'DELETE' }),
};

// Supplements API
export const supplementsApi = {
  getAll: (search?: string) =>
    apiFetch(`/supplements/${search ? `?search=${search}` : ''}`),
  getById: (id: number) => apiFetch(`/supplements/${id}/`),
  getReviews: (id: number) => apiFetch(`/supplements/${id}/reviews/`),
  addReview: (id: number, data: { rating: number; comment: string }) =>
    apiFetch(`/supplements/${id}/review/`, { method: 'POST', body: JSON.stringify(data) }),
};

// Goals API
export const goalsApi = {
  getGoals: () => apiFetch('/goals/nutrition/'),
  updateGoals: (data: Record<string, unknown>) =>
    apiFetch('/goals/nutrition/', { method: 'PUT', body: JSON.stringify(data) }),
  getCravings: () => apiFetch('/goals/cravings/'),
  logCraving: (data: Record<string, unknown>) =>
    apiFetch('/goals/cravings/', { method: 'POST', body: JSON.stringify(data) }),
};
