import { BASE_URL, URL_PATHS } from '@/api/config';
import { webPlatformAdapter, type PlatformAdapter } from '@/api/platform';

// The active platform adapter used for token storage. Defaults to the web
// adapter (localStorage-backed) so existing behavior is unchanged; a native
// client can call `setClientPlatformAdapter()` to swap it out.
let platformAdapter: PlatformAdapter = webPlatformAdapter;

export function setClientPlatformAdapter(adapter: PlatformAdapter): void {
  platformAdapter = adapter;
}

export interface ApiResponse<T = unknown> {
  data: T;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

async function performTokenRefresh(): Promise<string | null> {
  const refreshToken = platformAdapter.storage.get('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error('Refresh token request failed');
    }

    const data = await response.json();
    if (data.accessToken) {
      platformAdapter.storage.set('auth_token', data.accessToken);
      if (data.refreshToken) {
        platformAdapter.storage.set('refresh_token', data.refreshToken);
      }
      return data.accessToken;
    }
  } catch (error) {
    console.error('Error during token refresh:', error);
  }
  return null;
}

export interface RequestConfig {
  params?: Record<string, unknown>;
  signal?: AbortSignal;
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  const fullUrl = `${BASE_URL}${path}`;
  const url =
    URL_PATHS.HOST === '' || URL_PATHS.HOST === '/'
      ? new URL(fullUrl, window.location.origin)
      : new URL(fullUrl);

  if (config?.params) {
    Object.keys(config.params).forEach((key) => {
      if (config.params![key] !== null && config.params![key] !== undefined) {
        url.searchParams.append(key, String(config.params![key]));
      }
    });
  }

  const makeRequest = async (tokenToUse: string | null): Promise<Response> => {
    const headers: Record<string, string> = {};
    if (tokenToUse) {
      headers['Authorization'] = `Bearer ${tokenToUse}`;
    }
    if (body) {
    if (body instanceof FormData) {
      // DO NOT set Content-Type header manually here!
      // Fetch will automatically inject dynamic boundary tokens
    } else {
      headers['Content-Type'] = 'application/json';
    }
  }

    return fetch(url.toString(), {
      method,
      signal: config?.signal,
      headers,
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  };

  const token = platformAdapter.storage.get('auth_token');
  let response = await makeRequest(token);

  if (response.status === 401) {
    // If the request was actually an auth request, don't try to refresh
    if (path.startsWith('/auth/')) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // not JSON
      }
      const err = new Error(
        (errorData.error as string) || `Auth failed: ${response.status}`
      ) as Error & { response?: { data: Record<string, unknown>; status: number } };
      err.response = { data: errorData, status: response.status };
      throw err;
    }

    if (isRefreshing) {
      // Queue this request until refresh is done
      return new Promise<ApiResponse<T>>((resolve, reject) => {
        refreshQueue.push((newToken) => {
          makeRequest(newToken)
            .then(async (retryRes) => {
              if (!retryRes.ok) {
                reject(new Error(`Retry failed: ${retryRes.status}`));
              } else {
                resolve({ data: await retryRes.json() });
              }
            })
            .catch(reject);
        });
      });
    }

    isRefreshing = true;
    const newAccessToken = await performTokenRefresh();
    isRefreshing = false;

    if (newAccessToken) {
      // Process queue
      refreshQueue.forEach((cb) => cb(newAccessToken));
      refreshQueue = [];

      // Retry the current request
      response = await makeRequest(newAccessToken);
    } else {
      // Refresh failed, logout
      refreshQueue = [];
      platformAdapter.storage.remove('auth_token');
      platformAdapter.storage.remove('refresh_token');
      platformAdapter.storage.remove('auth_user');
      window.dispatchEvent(new Event('auth-expired'));
      throw new Error('Session expired');
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);

    // Try to parse JSON error body so callers can read server messages
    let errorData: Record<string, unknown> = {};
    try {
      errorData = JSON.parse(errorText);
    } catch {
      // response wasn't JSON — keep errorData empty
    }

    const err = new Error(
      (errorData.error as string) || `Request failed: ${response.status} ${response.statusText}`
    ) as Error & { response?: { data: Record<string, unknown>; status: number } };
    err.response = { data: errorData, status: response.status };
    throw err;
  }

  const data = await response.json();
  return { data };
}

export const api = {
  get: <T = unknown>(path: string, config?: RequestConfig) => request<T>('GET', path, undefined, config),
  post: <T = unknown>(path: string, body?: unknown, config?: RequestConfig) => request<T>('POST', path, body, config),
  put: <T = unknown>(path: string, body?: unknown, config?: RequestConfig) => request<T>('PUT', path, body, config),
  delete: <T = unknown>(path: string, config?: RequestConfig) => request<T>('DELETE', path, undefined, config),
};

/**
 * Lower-level escape hatch for call sites that need the raw `Response`
 * instead of parsed-JSON-or-throw semantics (e.g. probing an arbitrary
 * stream URL for a 404, or hitting an endpoint whose response isn't always
 * JSON). Still attaches the bearer token and — unlike a bare `fetch()` —
 * performs the same 401-refresh-and-retry-once flow as `api.*`.
 *
 * NOTE: this is the one behavior-adjacent piece of this refactor. Call
 * sites that used to call `fetch()` directly (VideoContext's subtitle
 * search/probe and stream 404-check) had no 401-refresh handling at all;
 * routing them through `authFetch` gives them that behavior for free. See
 * migration notes in VideoContext.tsx.
 */
export async function authFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const makeRequest = async (tokenToUse: string | null): Promise<Response> => {
    const headers = new Headers(init?.headers);
    if (tokenToUse) {
      headers.set('Authorization', `Bearer ${tokenToUse}`);
    }
    return fetch(url, { ...init, headers });
  };

  const token = platformAdapter.storage.get('auth_token');
  let response = await makeRequest(token);

  if (response.status === 401 && !url.includes('/auth/')) {
    if (isRefreshing) {
      return new Promise<Response>((resolve, reject) => {
        refreshQueue.push((newToken) => {
          makeRequest(newToken).then(resolve).catch(reject);
        });
      });
    }

    isRefreshing = true;
    const newAccessToken = await performTokenRefresh();
    isRefreshing = false;

    if (newAccessToken) {
      refreshQueue.forEach((cb) => cb(newAccessToken));
      refreshQueue = [];
      response = await makeRequest(newAccessToken);
    } else {
      refreshQueue = [];
      platformAdapter.storage.remove('auth_token');
      platformAdapter.storage.remove('refresh_token');
      platformAdapter.storage.remove('auth_user');
      window.dispatchEvent(new Event('auth-expired'));
    }
  }

  return response;
}
