'use client';

import { useEffect } from "react";
import { useState } from "react";
import { Clock3, LogOut, Network, ScanLine } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import useDiscovery from "@/hooks/useDiscovery";
import useRealtime from "@/hooks/useRealtime";

export default function Navbar({ onStartScan, scanState }) {
  const discovery = useDiscovery();
  const { user, logout, can } = useAuth();
  const { status: realtimeStatus } = useRealtime();
  const startScan = onStartScan || discovery.start;
  const currentScanState = scanState || discovery.status;
  const liveClock = () => {
    const now = new Date();

    let hours = now.getHours()
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours || 12;

    return `${hours}:${minutes}:${seconds} ${ampm}`;
  }

  const [time, setTime] = useState("");

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setTime(liveClock()), 0);
    const timer = window.setInterval(() => setTime(liveClock()), 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface-raised)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--navy-teal-900)] text-white shadow-sm">
            <Network className="h-5 w-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-lg font-bold text-[var(--navy-teal-900)]">Net Lens</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">network operations</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${realtimeStatus === "connected" ? "bg-[var(--online-bg)] text-[var(--online-text)]" : "bg-[var(--warning-bg)] text-[var(--warning-text)]"}`} role="status" aria-live="polite">
            <span className={`h-2.5 w-2.5 rounded-full ${realtimeStatus === "connected" ? "bg-[var(--online)] shadow-[0_0_0_3px_rgba(45,187,121,0.16)]" : "bg-[var(--warning)]"}`} />
            Live monitoring {realtimeStatus === "connected" ? "online" : realtimeStatus === "connecting" ? "connecting" : "offline"}
          </div>

          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
            <Clock3 className="h-3.5 w-3.5" />
            <span className="font-mono font-bold text-[var(--text-secondary)]">{ time }</span>
          </div>

          <span className="hidden text-xs text-[var(--text-secondary)] sm:inline">{user?.name || "User"} · {user?.role}</span>
          <button type="button" onClick={logout} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:bg-slate-50"><LogOut className="h-4 w-4" /> Sign out</button>
          <button type="button" onClick={startScan} disabled={!can("discovery:run") || currentScanState === "starting" || currentScanState === "discovering"} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--teal-800)] bg-[var(--teal-800)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--navy-teal-900)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal-700)]">
            <ScanLine className="h-4 w-4" />
            {currentScanState === "starting" || currentScanState === "discovering" ? `Working for ${discovery.formatElapsedTime(discovery.elapsedSeconds)}` : currentScanState === "failed" ? "Retry scan" : "Scan now"}
          </button>
        </div>
      </div>
    </header>
  );
}
