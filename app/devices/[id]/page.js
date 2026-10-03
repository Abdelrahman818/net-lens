"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Pencil, X } from "lucide-react";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import { useAuth } from "@/components/AuthProvider";
import API from "@/config";
import formatThroughput from "@/lib/formatThroughput";
import useRealtime from "@/hooks/useRealtime";

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function formatMemorySize(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "Unavailable";

  const gigabyte = 1024 ** 3;
  const amount = value >= gigabyte ? value / gigabyte : value / (1024 ** 2);
  const unit = value >= gigabyte ? "GB" : "MB";
  return `${amount.toFixed(2)} ${unit}`;
}

export default function DeviceDetailsPage() {
  const { id } = useParams();
  const { can } = useAuth();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  const loadDetails = useCallback(async () => {
    const response = await API.fetch(API.routes.network.device(id), { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to load device details");
    setDetails(payload);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const initialLoad = window.setTimeout(() => {
      loadDetails().catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(initialLoad);
    };
  }, [loadDetails]);

  useRealtime(useCallback((event) => {
    if (
      event?.eventType !== "device.health.updated" &&
      event?.eventType !== "device.system.info.updated"
    ) return;
    const data = event.data;
    if (String(data?.deviceId) !== String(id)) return;

    setDetails((current) => current?.device
      ? {
          ...current,
          device: {
            ...current.device,
            ...(event.eventType === "device.health.updated"
              ? {
                  status: data.status,
                  ping: data.ping,
                  lastChecked: data.lastChecked,
                  ...(data.systemInfo
                    ? { systemInfo: { ...current.device.systemInfo, ...data.systemInfo } }
                    : {})
                }
              : {
                  systemInfo: {
                    ...current.device.systemInfo,
                    ...(data.resources ? { resources: data.resources } : {}),
                    cpuPercent: data.cpuPercent,
                    memoryUsedBytes: data.memoryUsedBytes,
                    memoryFreeBytes: data.memoryFreeBytes,
                    updatedAt: data.updatedAt
                  }
                })
          }
        }
      : current);
  }, [id]));

  async function updateDevice() {
    setUpdating(true);
    setError("");
    try {
      const response = await API.fetch(API.routes.network.updateDevice(id), { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to update device");
      setDetails((current) => current ? { ...current, ...payload } : payload);
      await loadDetails();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdating(false);
    }
  }

  function beginNameEdit() {
    setNameDraft(device?.customName || "");
    setNameError("");
    setEditingName(true);
  }

  async function saveDeviceName(event) {
    event.preventDefault();
    const customName = nameDraft.trim();
    if (!customName) {
      setNameError("Enter a name for this device.");
      return;
    }
    if (customName.length > 200) {
      setNameError("Device name must be 200 characters or fewer.");
      return;
    }

    setSavingName(true);
    setNameError("");
    try {
      const response = await API.fetch(API.routes.network.renameDevice(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customName }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to rename device.");
      setDetails((current) => current
        ? { ...current, device: { ...current.device, ...payload.device } }
        : current);
      setEditingName(false);
    } catch (saveError) {
      setNameError(saveError.message);
    } finally {
      setSavingName(false);
    }
  }

  const device = details?.device;
  const systemInfo = details?.systemInfo || device?.systemInfo;
  const resourceValues = systemInfo?.resources || {
    cpu: {
      usage: systemInfo?.cpuPercent ?? null,
      status: systemInfo?.cpuPercent == null ? "unsupported" : "available"
    },
    memory: {
      used: systemInfo?.memoryUsedBytes ?? null,
      free: systemInfo?.memoryFreeBytes ?? null,
      status: systemInfo?.memoryUsedBytes == null ? "unsupported" : "available"
    },
    uptime: {
      ticks: systemInfo?.uptimeTicks ?? null,
      status: systemInfo?.uptimeTicks == null ? "unsupported" : "available"
    }
  };
  const formatUptime = (seconds) => {
    if (seconds === null || seconds === undefined || !Number.isFinite(Number(seconds)) || Number(seconds) < 0) return "—";
    let remaining = Math.floor(Number(seconds));
    const days = Math.floor(remaining / 86400);
    remaining %= 86400;
    const hours = Math.floor(remaining / 3600);
    remaining %= 3600;
    const minutes = Math.floor(remaining / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />
        <main className="min-w-0 flex-1 xl:ml-[106px]">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm md:p-8">
            <Link href="/devices" className="text-sm font-semibold text-[var(--teal-700)]">← Back to devices</Link>
            {loading ? <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading device details...</p> : null}
            {error ? <p role="alert" className="mt-5 rounded-lg bg-[var(--critical-bg)] px-3 py-2 text-sm text-[var(--critical-text)]">{error}</p> : null}
            {device ? <>
              <header className="mt-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{device.type || "Device"} details</p>
                  <h1 className="mt-1 text-3xl font-bold">{device.name || device.hostname || device.ip || device.mac}</h1>
                  <p className="mt-2 font-mono text-sm text-[var(--text-secondary)]">{device.ip || "No IP"} · {device.mac || "No MAC"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {can("devices:rename") && device.entityType !== "endpoint" && !editingName && <button type="button" onClick={beginNameEdit} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-slate-50"><Pencil className="h-4 w-4" />Change name</button>}
                  {can("devices:manage") && device.entityType !== "endpoint" && <button type="button" onClick={updateDevice} disabled={updating || !device.ip} className="rounded-lg bg-[var(--teal-800)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{updating ? "Updating via SNMP..." : "Update device"}</button>}
                </div>
              </header>
              {editingName && <form onSubmit={saveDeviceName} className="mt-5 max-w-xl rounded-xl border border-[var(--border)] bg-slate-50 p-4">
                <label htmlFor="device-custom-name" className="text-sm font-semibold">Device name</label>
                <p className="mt-1 text-xs text-[var(--text-muted)]">Set a custom name for this device. Leave the original hostname unchanged.</p>
                <input
                  id="device-custom-name"
                  type="text"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={200}
                  required
                  autoFocus
                  className="mt-3 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--teal-700)]"
                  placeholder={device.hostname || device.ip || "Enter device name"}
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? "device-name-error" : undefined}
                />
                {nameError && <p id="device-name-error" role="alert" className="mt-2 text-sm text-[var(--critical-text)]">{nameError}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="submit" disabled={savingName} className="rounded-lg bg-[var(--teal-800)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingName ? "Saving..." : "Save name"}</button>
                  <button type="button" disabled={savingName} onClick={() => setEditingName(false)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] disabled:opacity-50"><X className="h-4 w-4" />Cancel</button>
                </div>
              </form>}
              <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Status", device.status || "unknown"],
                  ["Last seen", formatDate(device.lastSeen)],
                  ["Last checked", formatDate(device.lastChecked)],
                  ["Groups", device.groupNames?.join(", ") || "Ungrouped"]
                ].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{label}</p><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>)}
              </section>
              {device.parent && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">Connected to parent switch: <strong>{device.parent.name}</strong> ({device.parent.ip})</p>}
              {systemInfo && <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
                <h2 className="text-lg font-bold">System information</h2>
                <p className="mt-2 break-words text-sm text-[var(--text-secondary)]">{systemInfo.systemDescription || device.os || "Waiting for the next successful SNMP system poll."}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <p className="text-sm">System name: <strong>{systemInfo.systemName || device.hostname || "Unavailable"}</strong></p>
                  <p className="text-sm">CPU: <strong>{resourceValues.cpu.usage == null ? "—" : `${Number(resourceValues.cpu.usage).toFixed(2)}%`}</strong></p>
                  <p className="text-sm">Memory: <strong>{resourceValues.memory.used == null ? "—" : `${formatMemorySize(resourceValues.memory.used)} used / ${formatMemorySize(resourceValues.memory.free)} free`}</strong></p>
                  <p className="text-sm">Uptime: <strong>{formatUptime(resourceValues.uptime.seconds ?? (resourceValues.uptime.ticks == null ? null : resourceValues.uptime.ticks / 100))}</strong></p>
                </div>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Last refreshed: {formatDate(systemInfo.updatedAt)}</p>
              </section>}
              <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
                <h2 className="text-lg font-bold">Interfaces / ports <span className="text-sm font-normal text-[var(--text-muted)]">({details.interfaces?.length || 0})</span></h2>
                {details.interfaces?.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs uppercase text-[var(--text-muted)]"><tr><th className="px-2 py-2">Index</th><th className="px-2 py-2">Name</th><th className="px-2 py-2">Admin</th><th className="px-2 py-2">Operational</th><th className="px-2 py-2">Speed</th><th className="px-2 py-2">Last checked</th></tr></thead><tbody>{details.interfaces.map((item) => <tr key={item._id || item.ifIndex} className="border-b border-slate-100"><td className="px-2 py-2">{item.ifIndex}</td><td className="px-2 py-2">{item.name || item.description || `ifIndex ${item.ifIndex}`}</td><td className="px-2 py-2">{item.adminStatus === 1 ? "Up" : item.adminStatus === 2 ? "Down" : "Unknown"}</td><td className="px-2 py-2">{item.operStatus === 1 ? "Up" : item.operStatus === 2 ? "Down" : "Unknown"}</td><td className="px-2 py-2" title="The device did not report this interface speed through SNMP.">{item.speed == null || Number(item.speed) <= 0 ? "Not reported" : formatThroughput(item.speed)}</td><td className="px-2 py-2">{formatDate(item.lastChecked)}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-sm text-[var(--text-secondary)]">No interface records have been collected yet. An authorized administrator or operator can use Update device to poll supported SNMP data.</p>}
              </section>
              {systemInfo?.vlans && <section className="mt-6 rounded-xl border border-[var(--border)] p-4"><h2 className="text-lg font-bold">VLANs ({systemInfo.vlans.length})</h2>{systemInfo.vlans.length ? <div className="mt-3 flex flex-wrap gap-2">{systemInfo.vlans.map((vlan) => <span key={vlan.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs">VLAN {vlan.id}{vlan.name ? ` · ${vlan.name}` : ""}</span>)}</div> : <p className="mt-2 text-sm text-[var(--text-secondary)]">No VLAN entries returned by the device.</p>}</section>}
              <section className="mt-6 rounded-xl border border-[var(--border)] p-4">
                <h2 className="text-lg font-bold">Discovered neighbors</h2>
                {details.neighbors?.length ? <div className="mt-3 space-y-2">{details.neighbors.map((neighbor) => <a key={neighbor.linkId || neighbor.id} href={`/devices/${encodeURIComponent(neighbor.id)}`} className="flex justify-between rounded-lg border px-3 py-2 text-sm hover:bg-slate-50"><span>{neighbor.name} · {neighbor.ip || "No IP"}</span><span>{neighbor.protocol?.toUpperCase()} · {neighbor.status}</span></a>)}</div> : <p className="mt-2 text-sm text-[var(--text-secondary)]">No persisted LLDP/CDP neighbors.</p>}
              </section>
            </> : null}
          </div>
        </main>
      </div>
    </div>
  );
}
