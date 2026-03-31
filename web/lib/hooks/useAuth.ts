"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api, setTokens, clearTokens, onTokenExpired } from "../api-client";
import type { User } from "../../../shared/src/types/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to restore session from localStorage on mount
    const access = localStorage.getItem("hd_access");
    const refresh = localStorage.getItem("hd_refresh");
    if (access && refresh) {
      setTokens(access, refresh);
      api.get<{ user: User }>("/auth/me")
        .then(({ user }) => setUser(user))
        .catch(() => { clearTokens(); localStorage.removeItem("hd_access"); localStorage.removeItem("hd_refresh"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    onTokenExpired(() => {
      setUser(null);
      localStorage.removeItem("hd_access");
      localStorage.removeItem("hd_refresh");
    });
  }, []);

  async function login(email: string, password: string) {
    const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>("/auth/login", { email, password });
    setTokens(data.accessToken, data.refreshToken);
    localStorage.setItem("hd_access", data.accessToken);
    localStorage.setItem("hd_refresh", data.refreshToken);
    setUser(data.user);
  }

  async function logout() {
    const refresh = localStorage.getItem("hd_refresh");
    await api.post("/auth/logout", { refreshToken: refresh }).catch(() => {});
    clearTokens();
    localStorage.removeItem("hd_access");
    localStorage.removeItem("hd_refresh");
    setUser(null);
  }

  return { user, loading, login, logout };
}
