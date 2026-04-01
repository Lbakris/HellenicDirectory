/**
 * Browser-side API client for the Hellenic Directory backend.
 *
 * Token management strategy:
 *  - Access tokens are kept in module-level memory only (never localStorage).
 *    Memory-only storage means tokens are cleared on tab/page close and are
 *    not reachable by injected scripts that scan localStorage.
 *  - Refresh tokens are persisted in Secure; SameSite=Strict cookies so the
 *    server can read them for SSR session checks and the client can restore
 *    the session after a page reload without re-authenticating.
 *  - When a 401 response is received, the client automatically attempts one
 *    token rotation before surfacing the error to the caller.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── In-memory token store ────────────────────────────────────────────────────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _onTokenExpired: (() => void) | null = null;
let _onTokenRefreshed: ((access: string, refresh: string) => void) | null = null;

/** Sets the active access and refresh tokens in memory. */
export function setTokens(access: string, refresh: string) {
  _accessToken = access || null;
  _refreshToken = refresh || null;
}

/** Clears both tokens from memory. */
export function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
}

/**
 * Registers a callback invoked when a token refresh fails and the session
 * must be terminated. Use this to clear UI state and redirect to login.
 */
export function onTokenExpired(cb: () => void) {
  _onTokenExpired = cb;
}

/**
 * Registers a callback invoked after a successful token rotation.
 * Use this to persist the new tokens to cookies so SSR pages stay in sync.
 */
export function onTokenRefreshed(cb: (access: string, refresh: string) => void) {
  _onTokenRefreshed = cb;
}

// ─── Token rotation ───────────────────────────────────────────────────────────

async function refreshAccessToken(): Promise<boolean> {
  if (!_refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: _refreshToken }),
    });
    if (!res.ok) return false;
    const data: { accessToken: string; refreshToken: string } = await res.json();
    _accessToken = data.accessToken;
    _refreshToken = data.refreshToken;
    _onTokenRefreshed?.(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ─── Core request function ────────────────────────────────────────────────────

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });

  if (res.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return request<T>(path, init, false);
    clearTokens();
    _onTokenExpired?.();
    throw new ApiError(401, "Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(res.status, body.error ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Public API surface ───────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
