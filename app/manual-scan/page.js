"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import { useAuth } from "@/components/AuthProvider";
import API from "@/config";

export default function ManualScanPage() {
  const router = useRouter();
  const { can } = useAuth();
  const canManageDevices = can("devices:manage");
  const [range, setRange] = useState("");
  const [scan, setScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState([]);
  const [importing, setImporting] = useState(false);
  const [scanStartedAt, setScanStartedAt] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!scanning || !scanStartedAt) return undefined;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - scanStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [scanning, scanStartedAt]);

  async function startScan(event) {
    event.preventDefault();
    setScanning(true);
    const startedAt = Date.now();
    setScanStartedAt(startedAt);
    setElapsedSeconds(0);
    setError("");
    setScan(null);
    setSelected([]);
    try {
      const response = await API.fetch(API.routes.discovery.manualScan, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error || "Unable to scan range");
        return;
      }
      if (!payload || !payload.summary || !payload.range || !Array.isArray(payload.devices)) {
        setError("The scan returned an invalid response");
        return;
      }
      setScan(payload);
    } catch (scanError) {
      setError(scanError.message || "Unable to scan range");
    } finally {
      setScanning(false);
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }
  }

  async function importSelected() {
    const devices = Array.isArray(scan?.devices)
      ? scan.devices.filter((device) => selected.includes(device.ip))
      : [];
    if (!devices.length) {
      setError("Select at least one new device to add");
      return;
    }
    setImporting(true);
    setError("");
    const response = await API.fetch(API.routes.deviceImport, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ devices }),
    });
    const payload = await response.json().catch(() => ({}));
    setImporting(false);
    if (!response.ok) {
      setError(payload.error || "Unable to add devices");
      return;
    }
    const created = new Set((payload.results || []).filter((item) => item.status === "created").map((item) => item.ip));
    setScan((current) => {
      if (!current || !Array.isArray(current.devices) || !current.summary) return current;
      return {
        ...current,
        devices: current.devices.map((device) => created.has(device.ip) ? { ...device, status: "existing" } : device),
        summary: {
          ...current.summary,
          existing: current.summary.existing + created.size,
          new: Math.max(0, current.summary.new - created.size)
        }
      };
    });
    setSelected([]);
  }

  const newDevices = useMemo(() => scan?.devices?.filter((device) => device.status === "new") || [], [scan]);
  const existingDevices = useMemo(() => scan?.devices?.filter((device) => device.status === "existing") || [], [scan]);
  const allNewSelected = newDevices.length > 0 && newDevices.every((device) => selected.includes(device.ip));

  function toggleAllNew() {
    setSelected(allNewSelected ? [] : newDevices.map((device) => device.ip));
  }

  if (!can("discovery:run")) {
    return <div className="min-h-screen bg-[var(--canvas)]"><Navbar /><div className="p-8 text-sm text-[var(--critical-text)]">You do not have permission to run manual scans.</div></div>;
  }

  return <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]"><Navbar /><div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6"><Aside /><main className="flex-1 xl:ml-[106px]"><div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm md:p-8"><button type="button" onClick={() => router.push("/")} className="text-sm font-semibold text-[var(--teal-700)]">← Back to dashboard</button><h1 className="mt-6 text-3xl font-bold">Manual network scan</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Scan a user-defined IP range without automatically adding devices to inventory.</p><form onSubmit={startScan} className="mt-6 flex flex-col gap-3 md:flex-row md:items-end"><label className="flex-1 text-sm font-semibold">IP range<input required value={range} onChange={(event) => setRange(event.target.value)} placeholder="192.168.1.1-254" className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label><button disabled={scanning} className="rounded-lg bg-[var(--teal-800)] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{scanning ? `Working for ${Math.floor(elapsedSeconds / 60)}m ${String(elapsedSeconds % 60).padStart(2, "0")}s` : "Start scan"}</button></form>{error && <p role="alert" className="mt-4 rounded-lg bg-[var(--critical-bg)] px-3 py-2 text-sm text-[var(--critical-text)]">{error}</p>}{scanning && <p className="mt-6 text-sm text-[var(--text-secondary)]" role="status" aria-live="polite">Scanning {range} · elapsed {Math.floor(elapsedSeconds / 60)}m {String(elapsedSeconds % 60).padStart(2, "0")}s</p>}{scan && <><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{Object.entries({ Scanned: scan.summary.scanned, Reachable: scan.summary.reachable, Existing: scan.summary.existing, New: scan.summary.new, Unreachable: scan.summary.unreachable }).map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-slate-50 p-4"><p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>)}</div><section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Scan results</h2><p className="text-sm text-[var(--text-secondary)]">Each reachable device is marked as already in inventory or new.</p>{!canManageDevices && <p className="mt-1 text-xs font-semibold text-[var(--critical-text)]">Viewers can scan, but only administrators and operators can add devices to inventory.</p>}</div><button type="button" disabled={!newDevices.length || importing || !canManageDevices} onClick={toggleAllNew} className="rounded-lg border border-[var(--teal-700)] px-4 py-2 text-sm font-semibold text-[var(--teal-800)] disabled:cursor-not-allowed disabled:opacity-50">{allNewSelected ? "Clear selection" : "Select all new"}</button><button type="button" disabled={!selected.length || importing || !canManageDevices} onClick={importSelected} className="rounded-lg bg-[var(--teal-800)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{importing ? "Adding..." : "Add selected to inventory"}</button></div><div className="mt-3 space-y-2">{scan.devices?.length ? scan.devices.filter((device) => device.status !== "unreachable").map((device) => { const isNew = device.status === "new"; return <label key={device.ip} className={`flex items-center gap-3 rounded-lg border p-3 ${isNew ? "cursor-pointer border-[var(--border)]" : "border-emerald-200 bg-emerald-50"}`}><input type="checkbox" disabled={!isNew || importing || !canManageDevices} checked={isNew && selected.includes(device.ip)} onChange={() => isNew && setSelected((current) => current.includes(device.ip) ? current.filter((ip) => ip !== device.ip) : [...current, device.ip])} /><span className="flex-1"><span className="block font-medium">{device.ip}</span><span className="text-xs text-[var(--text-muted)]">{device.mac || "MAC unavailable"} · {device.type || "unknown"}</span></span><span className={`rounded-full px-2 py-1 text-xs font-semibold ${isNew ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{isNew ? "New device" : "Already in inventory"}</span></label>; }) : <p className="rounded-lg bg-slate-50 p-4 text-sm text-[var(--text-secondary)]">No reachable devices found.</p>}</div><div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]"><span><strong className="text-emerald-700">{existingDevices.length}</strong> already in inventory</span><span><strong className="text-amber-700">{newDevices.length}</strong> new devices</span></div></section></>}</div></main></div></div>;
}
