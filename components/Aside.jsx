"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Activity, BellRing, ClipboardList, Database, Gauge, Home, LayoutGrid, ScanSearch, Settings, ShieldCheck, TerminalSquare, Users, Zap } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const menuItems = [
  { label: "Dashboard", href: "/", icon: <Home className="h-4 w-4" /> },
  { label: "Topology map", href: "/topology", icon: <LayoutGrid className="h-4 w-4" /> },
  { label: "Devices", href: "/devices", icon: <Database className="h-4 w-4" /> },
  { label: "Health", href: "/health", icon: <Activity className="h-4 w-4" /> },
  { label: "Network", href: "/network", icon: <Gauge className="h-4 w-4" /> },
  { label: "Speed test", href: "/speed-test", icon: <Zap className="h-4 w-4" /> },
  { label: "Alerts", href: "/alerts", icon: <BellRing className="h-4 w-4" /> },
  { label: "Requests", href: "/requests", icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Groups", href: "/groups", icon: <ShieldCheck className="h-4 w-4" /> },
  { label: "Manual scan", href: "/manual-scan", icon: <ScanSearch className="h-4 w-4" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];

export default function Aside() {
  const pathname = usePathname();
  const { hasRole, can } = useAuth();
  const roleItems = hasRole("admin")
    ? [...menuItems, { label: "Users", href: "/users", icon: <Users className="h-4 w-4" /> }]
    : menuItems.filter((item) => item.href !== "/settings");
  const visibleItems = can("terminal:use")
    ? [...roleItems, { label: "Terminal", href: "/terminal", icon: <TerminalSquare className="h-4 w-4" /> }]
    : roleItems;

  return (
    <aside className="group hidden h-[calc(100vh-7rem)] w-[76px] shrink-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm transition-[width] duration-200 hover:w-[220px] xl:fixed xl:left-5 xl:top-24 xl:z-20 xl:block">
      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const isActive = item.href === pathname;

          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={`flex h-10 w-full items-center justify-between rounded-2xl px-3 text-left text-sm font-medium transition ${
                isActive
                  ? "bg-[#DFF7ED] text-[#173F43] ring-1 ring-[#2DBB79]/20"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="flex items-center justify-center gap-3 group-hover:justify-start">
                <span className={isActive ? "text-[#205951]" : "text-slate-500"}>{item.icon}</span>
                <span className="hidden whitespace-nowrap group-hover:inline">{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
