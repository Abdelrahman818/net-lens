"use client";

import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { DiscoveryProvider } from "@/components/DiscoveryProvider";

function AuthenticatedContent({ children }) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, can } = useAuth();

  if (pathname === "/login") return children;
  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-[var(--text-secondary)]">Checking your session…</div>;
  }
  if (!isAuthenticated) return null;
  if (pathname === "/users" && !can("users:manage")) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-[var(--critical-text)]">You do not have permission to manage users.</div>;
  }
  if (pathname === "/settings" && !can("settings:manage")) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] text-sm text-[var(--critical-text)]">You do not have permission to manage settings.</div>;
  }
  return <DiscoveryProvider>{children}</DiscoveryProvider>;
}

export default function AppProviders({ children }) {
  return <AuthProvider><AuthenticatedContent>{children}</AuthenticatedContent></AuthProvider>;
}
