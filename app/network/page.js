"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, BellRing, Info, Network, Wifi } from "lucide-react";

import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import API from "@/config";

import useDiscovery from "@/hooks/useDiscovery";
import useRealtime from "@/hooks/useRealtime";
import { combineDeviceInventory } from "@/lib/deviceInventory";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";

const defaultNetworkData = {
  overview: {
    onlineDevices: 0,
    networkHealth: "0%",
    bandwidth: "0 Gbps",
    alerts: 0,
  },
  devices: [],
  alerts: [],
};

function formatAlertDate(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

function formatAlertMetric(value) {
  return value ? String(value).replace(/([A-Z])/g, " $1") : "Alert";
}

export default function NetworkPage() {
  const [network, setNetwork] = useState(defaultNetworkData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [refreshVersion, setRefreshVersion] = useState(0);
  useDiscovery(() => setRefreshVersion((value) => value + 1));
  useDiscovery(() => setRefreshVersion((value) => value + 1));
  useRealtime(useCallback((event) => {
    if (event?.eventType !== "device.health.updated") return;
    const data = event.data;
    setNetwork((current) => ({
      ...current,
      devices: current.devices.map((device) => (
        String(device.id || device._id) === String(data.deviceId)
          ? { ...device, status: data.status, ping: data.ping, lastChecked: data.lastChecked }
          : device
      ))
    }));
  }, []));

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [refreshVersion]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [alerts, devices] = await Promise.all([
          API.fetch(API.routes.network.alerts, { signal: controller.signal }).then((response) => response.json()).then((payload) => (Array.isArray(payload) ? payload : [])),
          Promise.all([
            API.fetch(API.routes.network.devices, { signal: controller.signal }).then((response) => response.json()).then((payload) => (Array.isArray(payload) ? payload : payload?.devices || [])),
            API.fetch(API.routes.network.endpoints, { signal: controller.signal }).then((response) => response.json()).then((payload) => (Array.isArray(payload) ? payload : payload?.endpoints || []))
          ]).then(([networkDevices, endpoints]) => [
            ...networkDevices,
            ...endpoints.map((endpoint) => ({ ...endpoint, status: endpoint.status || "unknown" }))
          ]),
        ]);
        const data = {
          ...defaultNetworkData,
          devices,
          alerts,
          overview: { ...defaultNetworkData.overview, alerts: alerts.length },
        };
        if (!ignore) {
          setNetwork(data || defaultNetworkData);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to fetch network data:", err);
          setError(err.message);
          setNetwork(defaultNetworkData);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [refreshVersion]);

  const inventory = combineDeviceInventory(network.devices, []);
  const onlineCount = inventory.filter((d) => d.status === "online").length;
  const warningCount = inventory.filter((d) => d.status === "warning").length;
  const offlineCount = inventory.filter((d) => d.status === "offline").length;
  const unknownCount = inventory.filter((d) => !d.status || d.status === "unknown").length;
  const totalCount = inventory.length;
  const criticalAlerts = network.alerts.filter((a) => a.severity === "critical").length;
  const warningAlerts = network.alerts.filter((a) => a.severity === "warning").length;

  const severityStyles = {
    critical: "border-[var(--critical)] bg-[var(--critical-bg)]",
    warning: "border-[var(--warning)] bg-[var(--warning-bg)]",
    info: "border-[var(--border)] bg-[var(--surface-raised)]",
  };

  const severityIcons = {
    critical: <AlertTriangle className="h-4 w-4" />,
    warning: <BellRing className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />

        <main className="flex-1 xl:ml-[106px]">
          { false && (
            <EmptyState
              title="No API configured — network overview"
              message="Network overview will be empty until a backend is connected or mock mode is enabled."
              details={"Use Settings to configure NETLENS API or enable mock mode for development."}
            />
          ) }

          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_30px_rgba(23,63,67,0.04)]">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">network status</p>
                <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Network overview</h1>
                <p className="mt-3 max-w-prose text-[var(--text-secondary)]">Real-time view of all network devices, health metrics, and system alerts.</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} disabled={loading} className="rounded-lg border border-[var(--teal-700)] bg-[var(--mint-100)] px-3 py-2 text-sm font-semibold text-[var(--teal-800)] disabled:opacity-50">Refresh</button>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                  Last updated: {currentTime.toLocaleTimeString()}
                </div>

                {error ? (
                  <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    Unable to load network data: {error}
                    <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="ml-3 font-semibold underline">Retry</button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                <SkeletonLoader lines={4} />
              ) : (
                <>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Discovered Devices</p>
                        <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{totalCount}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--online-bg)] text-[var(--online-text)]">
                        <Network className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Online</p>
                        <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{onlineCount}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning-text)]">
                        <Activity className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Unknown</p>
                        <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{unknownCount}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--offline-bg)] text-[var(--offline-text)]">
                        <Wifi className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Offline</p>
                        <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{offlineCount}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--critical-bg)] text-[var(--critical-text)]">
                        <AlertTriangle className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_30px_rgba(23,63,67,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">devices by status</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Online", count: onlineCount, color: "bg-[var(--online)]" },
                  { label: "Unknown", count: unknownCount, color: "bg-[var(--warning)]" },
                  { label: "Offline", count: offlineCount, color: "bg-[var(--offline)]" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${item.color}`} />
                      <span className="text-sm font-medium text-[var(--text-secondary)]">{item.label}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_30px_rgba(23,63,67,0.04)]">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">alerts by severity</p>
              <div className="mt-4 space-y-3">
                {[
                  { label: "Critical", count: criticalAlerts, color: "bg-[var(--critical)]" },
                  { label: "Warning", count: warningAlerts, color: "bg-[var(--warning)]" },
                  { label: "Info", count: network.alerts.filter((a) => a.severity === "info").length, color: "bg-[var(--info-bg)]" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${item.color}`} />
                      <span className="text-sm font-medium text-[var(--text-secondary)]">{item.label}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--text-primary)]">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_30px_rgba(23,63,67,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">recent alerts</p>
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-[var(--text-muted)]">Loading alerts...</p>
              ) : network.alerts.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No alerts at this time</p>
              ) : (
                network.alerts.slice(0, 5).map((alert) => (
                  <div key={alert._id || alert.id || `${alert.ruleId}-${alert.lastTriggeredAt}`} className={`rounded-lg border p-4 ${severityStyles[alert.severity] || severityStyles.info}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="mt-1 text-[var(--text-secondary)]">{severityIcons[alert.severity] || severityIcons.info}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--text-primary)]">{alert.message || alert.title || formatAlertMetric(alert.metric)}</div>
                          <div className="text-xs text-[var(--text-muted)]">{formatAlertDate(alert.lastTriggeredAt || alert.createdAt || alert.time)}</div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
                            {alert.metric ? <span>Metric: {formatAlertMetric(alert.metric)}</span> : null}
                            {alert.condition && alert.threshold !== undefined ? <span>Threshold: {alert.condition} {alert.threshold}</span> : null}
                            {alert.sourceType || alert.deviceId ? <span>Source: {[alert.sourceType, alert.deviceId].filter(Boolean).join(" · ")}</span> : null}
                            {alert.interfaceId ? <span>Interface: {alert.interfaceId}</span> : null}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs font-semibold uppercase text-[var(--text-muted)]">{alert.status || "Unknown"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <Link href="/alerts" className="mt-4 inline-block text-sm font-semibold text-[var(--teal-800)] underline">
              View all alerts
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
