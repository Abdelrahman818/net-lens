"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, CheckCircle2, CircleHelp, RefreshCw, XCircle } from "lucide-react";

import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import API from "@/config";
import useRealtime from "@/hooks/useRealtime";

const EMPTY = {
  checkedAt: null,
  summary: { total: 0, online: 0, offline: 0, unknown: 0 },
  devices: []
};

const statusStyles = {
  online: "border-emerald-200 bg-emerald-50 text-emerald-800",
  offline: "border-red-200 bg-red-50 text-red-800",
  unknown: "border-amber-200 bg-amber-50 text-amber-800"
};

function formatCheckedAt(value) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function formatHealthScore(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : "—";
}

function formatPacketLoss(value) {
  return Number.isFinite(value) ? `${Math.round(value)}%` : "Unavailable";
}

export default function HealthPage() {
  const router = useRouter();
  const [health, setHealth] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const healthResult = health.networkHealth || {};

  const loadHealth = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const response = await API.fetch(API.routes.health.snapshot);
      if (!response.ok) throw new Error(`Health request failed (${response.status})`);
      const payload = await response.json();
      setHealth({
        ...EMPTY,
        ...payload,
        summary: { ...EMPTY.summary, ...(payload?.summary || {}) },
        devices: Array.isArray(payload?.devices) ? payload.devices : []
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => loadHealth(), 0);
    const timer = window.setInterval(() => loadHealth({ showLoading: false }), 30000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [loadHealth]);

  useRealtime(useCallback((event) => {
    if (event?.eventType !== "device.health.updated") return;
    const data = event.data;
    setHealth((current) => {
      const devices = current.devices.map((device) => (
        String(device.id || device._id) === String(data.deviceId)
          ? { ...device, status: data.status, ping: data.ping, lastChecked: data.lastChecked }
          : device
      ));
      const summary = devices.reduce((result, device) => {
        const status = device.status || "unknown";
        result[status] = (result[status] || 0) + 1;
        return result;
      }, { online: 0, offline: 0, unknown: 0 });
      return { ...current, devices, summary: { ...summary, total: devices.length }, checkedAt: data.lastChecked };
    });
  }, []));

  const requestCheck = async () => {
    setRefreshing(true);
    try {
      const response = await API.fetch(API.routes.health.check, { method: "POST" });
      if (!response.ok) throw new Error(`Health check request failed (${response.status})`);
      await loadHealth({ showLoading: false });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRefreshing(false);
    }
  };

  const healthPercentage = useMemo(() => {
    return Number.isFinite(healthResult.score) ? healthResult.score : null;
  }, [healthResult.score]);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />
        <main className="flex-1 xl:ml-[106px]">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_30px_rgba(23,63,67,0.04)]">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">health manager</p>
                <h1 className="mt-2 text-3xl font-bold">Device health</h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Ping and SNMP health updates independently from topology discovery.</p>
              </div>
              <button type="button" onClick={requestCheck} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--teal-800)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Check now
              </button>
            </div>

            {error ? <div role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Total devices", health.summary.total, <Activity key="total" className="h-5 w-5" />],
                ["Checked up", healthResult.devices?.up ?? 0, <CheckCircle2 key="up" className="h-5 w-5 text-emerald-600" />],
                ["Unknown", healthResult.devices?.unknown ?? 0, <CircleHelp key="unknown" className="h-5 w-5 text-amber-600" />],
                ["Availability", healthResult.components?.availability?.score ?? healthResult.devices?.score],
                ["Latency", healthResult.components?.latency?.score ?? healthResult.latency?.score],
                ["Packet loss", formatPacketLoss(healthResult.packetLoss?.average ?? healthResult.components?.packetLoss?.values?.average)],
                ["Interfaces", healthResult.components?.interfaces?.score ?? healthResult.interfaces?.score],
                ["Critical devices", healthResult.components?.criticalDevices?.score ?? healthResult.criticalDevices?.score],
                ["Network health", healthPercentage === null ? "—" : `${healthPercentage}%`, <CheckCircle2 key="network-health" className="h-5 w-5 text-teal-700" />]
              ].map(([label, value, icon]) => (
                <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                    <span>{label}</span>
                    {icon || <CheckCircle2 className="h-5 w-5 text-teal-700" />}
                  </div>
                  <div className="mt-3 text-2xl font-bold">{icon || label === "Packet loss" ? value : formatHealthScore(value)}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 overflow-x-auto">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold">Device checks</h2>
                <span className="text-xs text-[var(--text-muted)]">Last update: {formatCheckedAt(health.checkedAt)}</span>
              </div>
              {loading ? <div className="animate-pulse rounded-lg bg-slate-100 p-8 text-sm text-slate-500">Loading health data...</div> : (
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <tr><th className="px-3 py-3">Device</th><th className="px-3 py-3">IP</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Ping</th><th className="px-3 py-3">Packet loss</th><th className="px-3 py-3">Packets</th><th className="px-3 py-3">Last checked</th></tr>
                  </thead>
                  <tbody>
                    {health.devices.map((device) => (
                      <tr key={device.id || device._id || device.mac} role="link" tabIndex={0} onClick={() => device.id && router.push(`/devices/${encodeURIComponent(device.id)}`)} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === " ") && device.id) { event.preventDefault(); router.push(`/devices/${encodeURIComponent(device.id)}`); } }} className="cursor-pointer border-b border-[var(--border)] hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
                        <td className="px-3 py-3 font-medium">{device.name || device.hostname || device.mac}</td>
                        <td className="px-3 py-3 font-mono text-xs">{device.ip || "—"}</td>
                        <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize ${statusStyles[device.status] || statusStyles.unknown}`}>{device.status || "unknown"}</span></td>
                        <td className="px-3 py-3">
                          {!device.ip
                            ? <span className="text-slate-500">No IP address</span>
                            : Number.isFinite(device.ping?.latency)
                              ? `${device.ping.latency} ms`
                              : device.ping
                                ? <span className="inline-flex items-center gap-1 text-amber-700"><XCircle className="h-3.5 w-3.5" /> ICMP unavailable</span>
                                : "Checking..."}
                        </td>
                        <td className="px-3 py-3">
                          {!device.ip
                            ? <span className="text-slate-500">Not measurable</span>
                            : Number.isFinite(device.ping?.packetLoss)
                              ? `${device.ping.packetLoss}%`
                              : device.ping?.packetsSent ? "Checking..." : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--text-muted)]">
                          {!device.ip
                            ? "No IP address"
                            : Number.isFinite(device.ping?.packetsSent)
                            ? `${device.ping.packetsReceived}/${device.ping.packetsSent} received (${device.ping.packetsLost} lost)`
                            : device.ping?.packetsSent ? "Checking..." : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-[var(--text-muted)]">{formatCheckedAt(device.lastChecked || device.ping?.lastChecked)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!loading && health.devices.length === 0 ? <p className="py-8 text-center text-sm text-[var(--text-muted)]">No discovered devices are available for health checks.</p> : null}
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}
