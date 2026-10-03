import { Network } from "lucide-react";
import { formatRelativeMinutes } from "@/lib/format";

export default function SelectedDeviceSide({ device }) {
  if (!device) {
    return (
      <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[0_12px_30px_rgba(23,63,67,0.05)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">selected device</p>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">Select a discovered device to view its available details.</p>
      </aside>
    );
  }

  const safeDevice = device;

  const statusStyles = {
    online: "bg-[var(--online-bg)] text-[var(--online-text)]",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-text)]",
    offline: "bg-[var(--offline-bg)] text-[var(--offline-text)]",
  };

  return (
    <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-[0_12px_30px_rgba(23,63,67,0.05)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">selected device</p>
          <h3 className="mt-2 text-xl font-bold text-[var(--text-primary)]">{safeDevice.name}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusStyles[safeDevice.status] || statusStyles.online}`}>
          {safeDevice.status}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-lg bg-[var(--surface)] p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--mint-100)] text-[var(--teal-800)]">
          <Network className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">{safeDevice?.name || "Unknown"}</p>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">{safeDevice?.type || "unknown"} / {safeDevice?.segment?.split("/")?.[0]?.trim()?.toLowerCase() || "unknown"}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">ip address</p>
            <p className="mt-2 font-mono text-sm font-bold text-[var(--text-primary)]">{safeDevice?.ip || "N/A"}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">mac</p>
            <p className="mt-2 font-mono text-sm font-bold text-[var(--text-primary)]">{safeDevice?.mac?.slice(0, 8) || "N/A"}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">vendor</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{safeDevice?.vendor || "N/A"}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">segment</p>
            <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{safeDevice?.segment || "N/A"}</p>
          </div>
        </div>

        <div className="space-y-3">
          {[
            ["Uptime", safeDevice.uptime],
            ["Latency", safeDevice.latency],
            ["Last seen", safeDevice.lastSeenMinutes === undefined ? null : formatRelativeMinutes(safeDevice.lastSeenMinutes)],
          ].filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5">
              <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
              <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
