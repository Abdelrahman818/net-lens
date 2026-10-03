"use client";

import { Router, Server, Wifi } from "lucide-react";
import Link from "next/link";

const icons = {
  router: Router,
  switch: Server,
  "access-point": Wifi,
  firewall: Server,
  server: Server,
};

function formatDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export default function TopologyInspector({ node, device, path = [] }) {
  const Icon = icons[node?.type] || Server;
  const status = device?.status || node?.status || "unknown";
  const statusColor = status === "online" ? "bg-emerald-500" : status === "offline" ? "bg-red-500" : "bg-amber-500";

  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Device inspector</p>
      {node ? (
        <>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--mint-100)] text-[var(--teal-800)]"><Icon className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold">{device?.name || node.label || "Unknown device"}</h2>
              <p className="text-xs text-[var(--text-muted)]">{device?.type || node.type || "Unknown type"} · {device?.vendor || "Unknown vendor"}</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />{status}</div>
          <dl className="mt-5 space-y-3 border-t border-[var(--border)] pt-4 text-xs">
            <div><dt className="uppercase tracking-wide text-[var(--text-muted)]">IP address</dt><dd className="mt-1 font-mono">{device?.ip || node.ip || "Not available"}</dd></div>
            <div><dt className="uppercase tracking-wide text-[var(--text-muted)]">MAC address</dt><dd className="mt-1 font-mono">{device?.mac || node.mac || "Not available"}</dd></div>
            <div><dt className="uppercase tracking-wide text-[var(--text-muted)]">Last seen</dt><dd className="mt-1">{formatDate(device?.lastSeen)}</dd></div>
          </dl>
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Connection path</p>
            {path.length > 1 ? <p className="mt-2 text-xs leading-6">{path.map((item) => item.label).join(" → ")}</p> : <p className="mt-2 text-xs text-[var(--text-muted)]">No connection path available</p>}
          </div>
          {device?.id && <Link href={`/devices/${encodeURIComponent(device.id)}`} className="mt-4 inline-flex rounded-lg bg-[var(--teal-800)] px-3 py-2 text-xs font-semibold text-white">Open full device details</Link>}
        </>
      ) : <p className="mt-5 text-sm text-[var(--text-muted)]">Select a device to inspect its details.</p>}
    </aside>
  );
}
