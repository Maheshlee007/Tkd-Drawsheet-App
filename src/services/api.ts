const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

const TOKEN_KEY = 'tkd-access-token';
const REFRESH_KEY = 'tkd-refresh-token';

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_KEY),
  };
}

export function setStoredTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearStoredTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredTokens();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.data?.accessToken) {
      setStoredTokens(data.data.accessToken, data.data.refreshToken ?? refreshToken);
      return data.data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const buildConfig = (token?: string | null): RequestInit => {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
    if (!skipAuth && token) h['Authorization'] = `Bearer ${token}`;
    const config: RequestInit = { method, headers: h, credentials: 'include' };
    if (body) config.body = JSON.stringify(body);
    return config;
  };

  const { accessToken } = getStoredTokens();
  let res = await fetch(`${API_BASE_URL}${endpoint}`, buildConfig(accessToken));

  // If 401, try refreshing the token once
  if (res.status === 401 && !skipAuth && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(`${API_BASE_URL}${endpoint}`, buildConfig(newToken));
    }
  }

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export function isApiConfigured(): boolean {
  return !!API_BASE_URL;
}
