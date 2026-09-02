// In production, set VITE_API_URL to the deployed backend's URL (e.g.
// https://your-backend.onrender.com/api) in the frontend host's env vars.
// Falls back to localhost for local development.
// For local development and Vercel deployment, this uses a relative path '/api'.
// Vite (locally) and vercel.json (production) proxy this to the real backend.
const BASE_URL = '/api';

// The origin (no /api suffix) — kept for resolving any relative asset
// path the backend might return. Avatars are now hosted on Cloudinary
// and come back as full https:// URLs already, so resolveAssetUrl
// mainly just passes those through unchanged.
export const API_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

export function resolveAssetUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${API_ORIGIN}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

const headers = () => ({
  'Content-Type': 'application/json',
});

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// For multipart/form-data requests (file uploads) — no JSON content-type,
// the browser sets the correct multipart boundary automatically.
async function requestForm<T>(method: string, path: string, formData: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: 'include',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// Auth
export const authApi = {
  login: (email: string, password: string) => request<any>('POST', '/auth/login', { email, password }),
  register: (name: string, email: string, password: string) => request<any>('POST', '/auth/register', { name, email, password }),
  me: () => request<any>('GET', '/auth/me'),
  logout: () => request<any>('POST', '/auth/logout'),
};

// Products
export const productApi = {
  getAll: (search = '', category = '', stock = '') => request<any>('GET', `/products?search=${encodeURIComponent(search)}&category=${encodeURIComponent(category)}&stock=${encodeURIComponent(stock)}`),
  getById: (id: number) => request<any>('GET', `/products/${id}`),
  getCategories: () => request<any>('GET', '/products/categories'),
  create: (data: any) => request<any>('POST', '/products', data),
  update: (id: number, data: any) => request<any>('PUT', `/products/${id}`, data),
  restock: (id: number, quantity: number) => request<any>('PATCH', `/products/${id}/restock`, { quantity }),
  delete: (id: number) => request<any>('DELETE', `/products/${id}`),
};

// Customers
export const customerApi = {
  getAll: (search = '') => request<any>('GET', `/customers?search=${encodeURIComponent(search)}`),
  getById: (id: number) => request<any>('GET', `/customers/${id}`),
  create: (data: any) => request<any>('POST', '/customers', data),
  update: (id: number, data: any) => request<any>('PUT', `/customers/${id}`, data),
  delete: (id: number) => request<any>('DELETE', `/customers/${id}`),
  payCredit: (id: number, amount: number) => request<any>('PATCH', `/customers/${id}/pay`, { amount }),
};

// Bills
export const billApi = {
  getAll: () => request<any>('GET', '/bills'),
  getById: (id: number) => request<any>('GET', `/bills/${id}`),
  create: (data: any) => request<any>('POST', '/bills', data),
  payCredit: (id: number, amount: number) => request<any>('PATCH', `/bills/${id}/pay`, { amount }),
};

// Expenses
export const expenseApi = {
  getAll: () => request<any>('GET', '/expenses'),
  create: (data: any) => request<any>('POST', '/expenses', data),
  update: (id: number, data: any) => request<any>('PUT', `/expenses/${id}`, data),
  delete: (id: number) => request<any>('DELETE', `/expenses/${id}`),
};

// Dashboard
export const dashboardApi = {
  get: () => request<any>('GET', '/dashboard'),
};

// Sales
export const salesApi = {
  get: (filter?: string) => request<any>('GET', `/sales${filter ? `?filter=${encodeURIComponent(filter)}` : ''}`),
};

// Insights
export const insightsApi = {
  get: () => request<any>('GET', '/insights'),
};

// Reports
export const reportsApi = {
  get: (filter?: string) => request<any>('GET', `/reports${filter ? `?filter=${encodeURIComponent(filter)}` : ''}`),
  custom: (start: string, end: string) => request<any>('GET', `/reports/custom?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
};

// Notifications
export const notificationApi = {
  getAll: () => request<any>('GET', '/notifications'),
  markRead: (id: number) => request<any>('PUT', `/notifications/${id}/read`),
  markAllRead: () => request<any>('PUT', '/notifications/read-all'),
  subscribeToPush: (subscription: any) => request<any>('POST', '/notifications/subscribe', subscription),
};

// Settings
export const settingsApi = {
  get: () => request<any>('GET', '/settings'),
  update: (data: any) => request<any>('PUT', '/settings', data),
  updateProfile: (data: any) => request<any>('PUT', '/settings/profile', data),
  updatePassword: (data: any) => request<any>('PUT', '/settings/password', data),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return requestForm<any>('POST', '/settings/avatar', formData);
  },
};
