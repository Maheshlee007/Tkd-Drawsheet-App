const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include' as RequestCredentials,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  // When no API_BASE_URL is configured, we're in mock mode
  if (!API_BASE_URL) {
    throw new Error('API not configured - using local storage');
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json();
}

export function isApiConfigured(): boolean {
  return !!API_BASE_URL;
}
