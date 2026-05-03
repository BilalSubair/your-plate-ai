const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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
  if (!res.ok) {
    const errText = await res.text();
    try {
      const errJson = JSON.parse(errText);
      const firstKey = Object.keys(errJson)[0];
      const firstError = Array.isArray(errJson[firstKey]) ? errJson[firstKey][0] : errJson[firstKey];
      throw new Error(firstError || 'Registration failed');
    } catch (e) {
      if (e instanceof Error && e.message !== 'Registration failed') throw e;
      throw new Error('Registration failed');
    }
  }
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
  searchFood: (query: string) =>
    apiFetch(`/food/search/?q=${encodeURIComponent(query)}`),
  searchRecipes: (query: string, filters: any = {}) => {
    const params = new URLSearchParams({ q: query });
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.append(k, String(v));
    });
    return apiFetch(`/food/recipes/search/?${params.toString()}`);
  },
  getMealPlan: (data: any) =>
    apiFetch('/food/meal-planner/', { method: 'POST', body: JSON.stringify(data) }),
  analyzeIngredients: (imageBase64: string) =>
    apiFetch('/food/analyze-ingredients/', { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
  analyzePlate: (imageBase64: string) =>
    apiFetch('/food/analyze-plate/', { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
  quickNutritionLookup: (query: string) =>
    apiFetch('/food/quick-nutrition-lookup/', { method: 'POST', body: JSON.stringify({ query }) }),
  getBudgetMeals: (params: { budget: number, location: string, max_calories: number, min_protein: number, dietary_preferences: string }) =>
    apiFetch("/food/budget-meals/", { method: "POST", body: JSON.stringify(params) }),
  generateGroceryList: (data: Record<string, unknown>) =>
    apiFetch('/food/grocery-optimizer/', { method: 'POST', body: JSON.stringify(data) }),
  snipMenu: (imageBase64: string) =>
    apiFetch('/food/menu-sniper/', { method: 'POST', body: JSON.stringify({ imageBase64 }) }),
  aiCoach: (message: string, imageBase64?: string) =>
    apiFetch('/food/ai-coach/', { method: 'POST', body: JSON.stringify({ message, imageBase64 }) }),
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
  patchGoals: (data: Record<string, unknown>) =>
    apiFetch('/goals/nutrition/', { method: 'PATCH', body: JSON.stringify(data) }),
  getCravingsBank: () => apiFetch('/goals/cravings_bank/'),
  consumeCheatMeal: (data: { name: string, calories: number }) =>
    apiFetch('/goals/cravings_bank/', { method: 'POST', body: JSON.stringify(data) }),
  getCravings: () => apiFetch('/goals/cravings/'),
  logCraving: (data: Record<string, unknown>) =>
    apiFetch('/goals/cravings/', { method: 'POST', body: JSON.stringify(data) }),
  predictCrash: () => apiFetch('/goals/predict-crash/'),
  getDailyTracking: () => apiFetch('/goals/tracking/today/'),
  updateDailyTracking: (data: Record<string, unknown>) =>
    apiFetch('/goals/tracking/today/', { method: 'PATCH', body: JSON.stringify(data) }),
  generateInsight: (data: Record<string, unknown>) =>
    apiFetch('/goals/insight/generate/', { method: 'POST', body: JSON.stringify(data) }),
  calculateMaintenance: () =>
    apiFetch('/calculate-maintenance/', { method: 'POST' }),
  getTrackingHistory: (days: number = 30) =>
    apiFetch(`/goals/tracking/history/?days=${days}`),
  generateMealPlan: (dietary_preferences: string) =>
    apiFetch('/goals/plan/generate/', {
      method: 'POST',
      body: JSON.stringify({ dietary_preferences })
    }),
};
