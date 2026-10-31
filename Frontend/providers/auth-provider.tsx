"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { changePassword as changePasswordRequest, login as loginRequest, logout as logoutRequest, refreshSession, register as registerRequest } from "../services/auth/auth.service";
import type { AuthResponse, RegisterRequest, RegisterResponse } from "../types/api";

interface AuthContextValue {
  session: AuthResponse | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (request: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateSession: (patch: Partial<AuthResponse>) => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("agristore_auth_session");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    window.localStorage.removeItem("agristore_auth_session");
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const stored = readStoredSession();
      if (stored) {
        if (active) setSession(stored);
        if (active) setLoading(false);
        return;
      }
      try {
        const refreshed = await refreshSession();
        if (active) setSession(refreshed);
      } catch {
        if (active) setSession(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void restore();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await loginRequest(email, password);
    setSession(nextSession);
    return nextSession;
  }, []);

  const register = useCallback((request: RegisterRequest) => registerRequest(request), []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setSession(null);
  }, []);
  const changePassword = useCallback((currentPassword: string, newPassword: string) => changePasswordRequest({ currentPassword, newPassword }), []);
  const updateSession = useCallback((patch: Partial<AuthResponse>) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      window.localStorage.setItem("agristore_auth_session", JSON.stringify(next));
      return next;
    });
  }, []);

  const hasRole = useCallback((...roles: string[]) => Boolean(session?.roles.some((role) => roles.includes(role))), [session]);
  const value = useMemo(() => ({ session, loading, login, register, logout, changePassword, updateSession, hasRole }), [changePassword, hasRole, loading, login, logout, register, session, updateSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được sử dụng bên trong AuthProvider.");
  return context;
}
