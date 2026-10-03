"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import API from "@/config";
import { can, hasRole } from "@/lib/permissions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  const fetchMe = useCallback(async () => {
    try {
      const response = await fetch(API.routes.auth.me, { credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Unauthenticated");
      const payload = await response.json();
      setUser(payload.user || null);
      setStatus(payload.user ? "authenticated" : "unauthenticated");
      return payload.user || null;
    } catch {
      setUser(null);
      setStatus("unauthenticated");
      return null;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(fetchMe, 0);
    return () => window.clearTimeout(timer);
  }, [fetchMe]);

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/login") router.replace("/login");
    if (status === "authenticated" && pathname === "/login") router.replace("/");
  }, [pathname, router, status]);

  const login = useCallback(async (username, password) => {
    const response = await fetch(API.routes.auth.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || payload.error || "Unable to sign in");
    setUser(payload.user);
    setStatus("authenticated");
    router.replace("/");
    return payload.user;
  }, [router]);

  const logout = useCallback(async () => {
    await fetch(API.routes.auth.logout, { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const value = useMemo(() => ({
    user,
    status,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    login,
    logout,
    refresh: fetchMe,
    can: (permission) => can(user, permission),
    hasRole: (...roles) => hasRole(user, ...roles),
  }), [fetchMe, login, logout, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
