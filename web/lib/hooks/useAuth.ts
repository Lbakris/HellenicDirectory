"use client";

/**
 * AuthContext and useAuthState hook.
 *
 * Token storage strategy:
 *  - Access tokens are kept in the api-client's module-level memory.
 *    They are never written to localStorage (XSS-accessible and cross-session persistent).
 *  - Refresh tokens are stored in a Secure; SameSite=Strict cookie.
 *    Non-HttpOnly because they must be writable from client JS in this architecture
 *    (backend is cross-origin, so HttpOnly cookies cannot be set by the API server
 *    on the Next.js domain). A proxy route handler pattern (POST /api/auth/login)
 *    is the recommended upgrade path for full HttpOnly coverage.
 *  - SSR pages read the access token from the same cookie via lib/auth.ts.
 *
 * SSR safety: all document/window access is guarded by `typeof window !== 'undefined'`.
 */

import { createContext, useContext, useEffect, useState } from "react";
import {
  api,
  setTokens,
  clearTokens,
  onTokenExpired,
  onTokenRefreshed,
} from "../api-client";
import type { User } from "../../../shared/src/types/auth";

// ─── Cookie helpers ───────────────────────────────────────────────────────────

/** Writes a browser cookie with Secure and SameSite=Strict flags. */
function setCookie(name: string, value: string, maxAgeSeconds: number) {
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Strict${secure}; max-age=${maxAgeSeconds}`;
}

/** Reads a cookie value by name. Returns null if not present. */
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Expires a cookie immediately by setting max-age=0. */
function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; SameSite=Strict; max-age=0`;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** GDPR/CCPA right to erasure — soft-deletes the account and clears local session. */
  deleteAccount: () => Promise<void>;
  /** CCPA §1798.110 right-to-know — triggers a JSON download of all account data. */
  exportData: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  exportData: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ─── State provider hook ──────────────────────────────────────────────────────

/** Access token TTL matches the backend JWT_ACCESS_EXPIRES_IN of 15 minutes. */
const ACCESS_TOKEN_MAX_AGE = 15 * 60;
/** Refresh token TTL matches the backend JWT_REFRESH_EXPIRES_IN of 30 days. */
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Manages auth state for the AuthContext provider.
 * Restores the session on mount from persisted cookies; handles login/logout.
 */
export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Guard: this hook must only run in the browser.
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // Persist new tokens to cookies when the api-client rotates them.
    onTokenRefreshed((access, refresh) => {
      setCookie("hd_access", access, ACCESS_TOKEN_MAX_AGE);
      setCookie("hd_refresh", refresh, REFRESH_TOKEN_MAX_AGE);
    });

    // Expire session when refresh token rotation fails.
    onTokenExpired(() => {
      setUser(null);
      deleteCookie("hd_access");
      deleteCookie("hd_refresh");
    });

    // Attempt to restore the session from cookies. The api-client will
    // auto-rotate the access token if it is expired but the refresh token is valid.
    const access = getCookie("hd_access");
    const refresh = getCookie("hd_refresh");

    if (access || refresh) {
      setTokens(access ?? "", refresh ?? "");
      api
        .get<{ user: User }>("/auth/me")
        .then(({ user }) => setUser(user))
        .catch(() => {
          clearTokens();
          deleteCookie("hd_access");
          deleteCookie("hd_refresh");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
      "/auth/login",
      { email, password }
    );
    setTokens(data.accessToken, data.refreshToken);
    setCookie("hd_access", data.accessToken, ACCESS_TOKEN_MAX_AGE);
    setCookie("hd_refresh", data.refreshToken, REFRESH_TOKEN_MAX_AGE);
    setUser(data.user);
  }

  async function logout() {
    const refresh = getCookie("hd_refresh");
    await api.post("/auth/logout", { refreshToken: refresh ?? undefined }).catch(() => {});
    clearTokens();
    deleteCookie("hd_access");
    deleteCookie("hd_refresh");
    setUser(null);
  }

  /** Calls DELETE /auth/account then clears the local session. */
  async function deleteAccount() {
    await api.delete("/auth/account");
    clearTokens();
    deleteCookie("hd_access");
    deleteCookie("hd_refresh");
    setUser(null);
  }

  /**
   * Calls GET /account/data and triggers a browser download of the returned JSON.
   * Satisfies CCPA §1798.110 right-to-know and PIPEDA access requests.
   */
  async function exportData() {
    const data = await api.get<unknown>("/account/data");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hellenic-directory-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return { user, loading, login, logout, deleteAccount, exportData };
}
