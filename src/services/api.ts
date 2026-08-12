const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
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

function fallbackStatusMessage(status: number): string {
  if (status === 400) return 'Invalid request. Please check and try again.';
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'Requested record was not found.';
  if (status === 409) return 'This action conflicts with current data state.';
  if (status === 429) return 'Too many requests. Please wait and try again.';
  if (status >= 500) return 'Server error. Please try again shortly.';
  return 'Request failed. Please try again.';
}

async function parseErrorResponse(res: Response): Promise<{ message: string; details?: unknown }> {
  const fallback = fallbackStatusMessage(res.status);
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const json = await res.json() as Record<string, unknown>;
      const message =
        (typeof json.message === 'string' && json.message.trim())
        || (typeof json.error === 'string' && json.error.trim())
        || fallback;
      return { message, details: json };
    } catch {
      return { message: fallback };
    }
  }

  try {
    const text = (await res.text()).trim();
    return { message: text || fallback };
  } catch {
    return { message: fallback };
  }
}

/** Routes that anonymous visitors legitimately use — never bounce them to /login. */
const PUBLIC_PATH_PREFIXES = [
  '/login', '/forgot-password', '/logout', '/guest', '/register',
  '/coach-register', '/board', '/jury', '/public-tournaments',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`));
}

function handleSessionExpiry() {
  clearStoredTokens();
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent('tkd:session-expired'));
  // On public pages a stale token just gets cleared — no redirect, the page
  // works anonymously (registration kiosks, board displays, jury portal).
  if (isPublicPath(window.location.pathname)) return;

  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, skipAuth = false } = options;

  const buildConfig = (token?: string | null): RequestInit => {
    const h: Record<string, string> = { ...headers };
    if (body) h['Content-Type'] = 'application/json';
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
    } else {
      handleSessionExpiry();
    }
  }

  if (!res.ok) {
    // Only a 401 on a request that actually carried a token means an expired
    // session; an anonymous 401 must not hijack the page with a redirect.
    if (res.status === 401 && !skipAuth && accessToken) {
      handleSessionExpiry();
    }
    const parsed = await parseErrorResponse(res);
    throw new ApiError(res.status, parsed.message, parsed.details);
  }

  return res.json();
}

export function isApiConfigured(): boolean {
  return !!API_BASE_URL;
}

// --- Silent token refresh (runs every 50 minutes for 1hr sessions) ---
let silentRefreshTimer: ReturnType<typeof setInterval> | null = null;

export function startSilentRefresh() {
  stopSilentRefresh();
  silentRefreshTimer = setInterval(async () => {
    const { refreshToken } = getStoredTokens();
    if (!refreshToken) { stopSilentRefresh(); return; }
    try {
      await refreshAccessToken();
    } catch {
      // If refresh fails, user will be prompted to login on next request
    }
  }, 50 * 60 * 1000); // 50 minutes
}

export function stopSilentRefresh() {
  if (silentRefreshTimer) {
    clearInterval(silentRefreshTimer);
    silentRefreshTimer = null;
  }
}
