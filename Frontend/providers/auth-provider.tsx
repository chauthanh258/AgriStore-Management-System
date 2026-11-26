"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { changePassword as changePasswordRequest, login as loginRequest, logout as logoutRequest, refreshSession, register as registerRequest } from "../services/auth/auth.service";
import { getCurrentPermissions } from "../services/roles/permission.service";
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
  hasPermission: (permissionCode: string) => boolean;
  permissionError: string | null;
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
  const [permissionCodes, setPermissionCodes] = useState<string[]>([]);
  const [permissionUserId, setPermissionUserId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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

  useEffect(() => {
    const userId = session?.userId;
    const accessToken = session?.accessToken;
    if (!userId || !accessToken) return;
    let active = true;
    void getCurrentPermissions()
      .then((codes) => {
        if (!active) return;
        setPermissionCodes(codes);
        setPermissionUserId(userId);
        setPermissionError(null);
      })
      .catch(() => {
        if (!active) return;
        setPermissionCodes([]);
        setPermissionUserId(userId);
        setPermissionError("Không thể tải danh sách permission hiện tại.");
      });
    return () => { active = false; };
  }, [session?.accessToken, session?.userId]);

  const login = useCallback(async (email: string, password: string) => {
    const nextSession = await loginRequest(email, password);
    setPermissionCodes([]);
    setPermissionUserId(null);
    setPermissionError(null);
    setSession(nextSession);
    return nextSession;
  }, []);

  const register = useCallback((request: RegisterRequest) => registerRequest(request), []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setPermissionCodes([]);
    setPermissionUserId(null);
    setPermissionError(null);
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
  const hasPermission = useCallback(
    (permissionCode: string) => Boolean(
      session &&
      permissionUserId === session.userId &&
      permissionCodes.includes(permissionCode)
    ),
    [permissionCodes, permissionUserId, session]
  );
  const value = useMemo(() => ({
    session,
    loading,
    login,
    register,
    logout,
    changePassword,
    updateSession,
    hasRole,
    hasPermission,
    permissionError
  }), [changePassword, hasPermission, hasRole, loading, login, logout, permissionError, register, session, updateSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải được sử dụng bên trong AuthProvider.");
  return context;
}
