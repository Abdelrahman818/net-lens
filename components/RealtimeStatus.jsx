"use client";

import useRealtime from "@/hooks/useRealtime";

const labels = {
  connecting: "Connecting",
  connected: "Connected",
  disconnected: "Disconnected",
};

export default function RealtimeStatus() {
  const { status } = useRealtime();
  const label = labels[status] || labels.disconnected;

  return (
    <span
      className="text-xs font-semibold text-slate-500"
      role="status"
      aria-live="polite"
    >
      Realtime: {label}
    </span>
  );
}
