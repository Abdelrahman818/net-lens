export default function TopologySummary({ nodes, links, devices, endpoints = [], lastDiscovery, inventoryCount }) {
  const allDevices = [...devices, ...endpoints];
  const reachable = allDevices.filter((device) => device.status === "online").length;
  const reachability = allDevices.length ? `${Math.round((reachable / allDevices.length) * 100)}%` : "—";
  const segments = new Set(devices.map((device) => device.zone).filter(Boolean)).size;
  const discovery = lastDiscovery ? new Date(lastDiscovery).toLocaleString() : "—";
  const cards = [
    ["Inventory", inventoryCount ?? (allDevices.length || "—"), "unique devices"],
    ["Topology nodes", nodes.length || "—", "including mapped endpoints"],
    ["Reachability", reachability, "reachable"],
    ["Segments", segments || "—", "network segments"],
    ["Last discovery", discovery, "from discovery state"],
  ];
  return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, suffix]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p><p className="mt-2 truncate text-xl font-bold text-[var(--text-primary)]">{value}</p><p className="text-xs text-[var(--text-muted)]">{suffix}</p></div>)}</div>;
}
