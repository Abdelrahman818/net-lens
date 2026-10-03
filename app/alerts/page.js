"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, RefreshCw, X } from "lucide-react";

import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import API from "@/config";

import useRealtime from "@/hooks/useRealtime";
import RealtimeStatus from "@/components/RealtimeStatus";

const PAGE_SIZE = 25;
const REALTIME_REFRESH_COALESCE_MS = 100;
const initialFilters = {
  status: "all",
  severity: "all",
  sourceType: "all",
  metric: "all",
  deviceId: "",
  interfaceId: "",
  ruleId: "",
};

const severityStyles = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
};

const statusStyles = {
  active: "bg-red-100 text-red-800",
  acknowledged: "bg-amber-100 text-amber-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function label(value) {
  return value ? String(value).replace(/([A-Z])/g, " $1") : "—";
}

function displayLabel(value) {
  return value ? label(value).replace(/\b\w/g, (character) => character.toUpperCase()) : "—";
}

function displayStatus(value) {
  return value === "acknowledged" ? "Seen" : displayLabel(value);
}

async function parseAlertResponse(response) {
  if (!response.ok) {
    let message = `Alerts request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      // Keep the HTTP status message when the API does not return JSON.
    }
    throw new Error(message);
  }
  return response.json();
}

async function fetchAlertsFromApi(filters, options = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== "all") query.set(key, value);
  });
  query.set("limit", String(filters.limit || PAGE_SIZE));
  query.set("offset", String(filters.offset || 0));
  const response = await API.fetch(`${API.routes.alerts.list}?${query.toString()}`, options);
  return parseAlertResponse(response);
}

async function acknowledgeAlert(alertId) {
  const response = await API.fetch(API.routes.alerts.acknowledge(alertId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  return parseAlertResponse(response);
}

async function resolveAlert(alertId) {
  const response = await API.fetch(API.routes.alerts.resolve(alertId), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  return parseAlertResponse(response);
}

function matchesFilters(alert, filters) {
  return Object.entries(filters).every(([key, value]) => {
    if (!value || value === "all") return true;
    return String(alert[key] ?? "").toLowerCase().includes(String(value).toLowerCase());
  });
}

function Badge({ children, className = "" }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}>{children}</span>;
}

function FilterSelect({ labelText, value, onChange, options }) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
      {labelText}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export default function AlertsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const realtimeRefreshTimer = useRef(null);
  useRealtime(useCallback((realtimeEvent) => {
    if (["alert.created", "alert.acknowledged", "alert.resolved"].includes(realtimeEvent.eventType)) {
      if (!realtimeRefreshTimer.current) {
        realtimeRefreshTimer.current = setTimeout(() => {
          realtimeRefreshTimer.current = null;
          setRefreshVersion((value) => value + 1);
        }, REALTIME_REFRESH_COALESCE_MS);
      }
    }
  }, []));

  useEffect(() => () => {
    if (realtimeRefreshTimer.current) {
      clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchAlerts() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAlertsFromApi({
          ...filters,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        }, { signal: controller.signal });
        const nextAlerts = Array.isArray(data) ? data : [];
        setAlerts(nextAlerts);
        setSelectedAlert((current) => nextAlerts.find((alert) => String(alert._id) === String(current?._id)) || nextAlerts[0] || null);
      } catch (loadError) {
        if (loadError?.name !== "AbortError") {
          setError(loadError.message || "Unable to load alerts.");
          setAlerts([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchAlerts();
    return () => controller.abort();
  }, [filters, page, refreshVersion]);

  const counts = useMemo(() => ({
    active: alerts.filter((alert) => alert.status === "active").length,
    acknowledged: alerts.filter((alert) => alert.status === "acknowledged").length,
    resolved: alerts.filter((alert) => alert.status === "resolved").length,
  }), [alerts]);

  async function performAction(alert, action) {
    if (actionId) return;
    setActionId(alert._id);
    setActionError(null);
    try {
      const updated = action === "acknowledge"
        ? await acknowledgeAlert(alert._id)
        : await resolveAlert(alert._id);
      setAlerts((current) => current
        .map((item) => item._id === updated._id ? updated : item)
        .filter((item) => matchesFilters(item, filters)));
      setSelectedAlert(updated);
    } catch (actionRequestError) {
      setActionError(actionRequestError.message || "The alert action could not be completed.");
    } finally {
      setActionId(null);
    }
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(0);
    setAlerts([]);
    setSelectedAlert(null);
  }

  function changePage(nextPage) {
    setPage(nextPage);
    setAlerts([]);
    setSelectedAlert(null);
  }

  return (
    <div className="min-h-screen bg-[#eef3f3] text-slate-800">
      <Navbar />
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />
        <main className="min-w-0 flex-1 xl:ml-[106px]">
          {false ? <EmptyState title="No API configured — alerts" message="Connect the Net-Lens API to load alert data." details="Set NEXT_PUBLIC_API_BASE_URL in the frontend environment." /> : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">alert operations</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-800">Alerts</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">Review monitoring alerts and manage their acknowledgement and resolution lifecycle.</p>
                <div className="mt-2"><RealtimeStatus /></div>
              </div>
              <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Refresh alerts">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Active on this page", counts.active, "text-red-700"],
                ["Seen on this page", counts.acknowledged, "text-amber-700"],
                ["Resolved on this page", counts.resolved, "text-emerald-700"],
              ].map(([title, count, tone]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
                  <p className={`mt-2 text-2xl font-bold ${tone}`}>{count}</p>
                  <p className="mt-1 text-xs text-slate-500">on this page</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              <FilterSelect labelText="Status" value={filters.status} onChange={(value) => updateFilter("status", value)} options={[{ value: "all", label: "All statuses" }, { value: "active", label: "Active" }, { value: "acknowledged", label: "Seen" }, { value: "resolved", label: "Resolved" }]} />
              <FilterSelect labelText="Severity" value={filters.severity} onChange={(value) => updateFilter("severity", value)} options={[{ value: "all", label: "All severities" }, { value: "critical", label: "Critical" }, { value: "warning", label: "Warning" }, { value: "info", label: "Info" }]} />
              <FilterSelect labelText="Source" value={filters.sourceType} onChange={(value) => updateFilter("sourceType", value)} options={[{ value: "all", label: "All sources" }, { value: "device", label: "Device" }, { value: "interface", label: "Interface" }]} />
              <FilterSelect labelText="Metric" value={filters.metric} onChange={(value) => updateFilter("metric", value)} options={[{ value: "all", label: "All metrics" }, "inBps", "outBps", "inUtilization", "outUtilization"].map((value) => typeof value === "string" ? { value, label: label(value) } : value)} />
              {[
                ["deviceId", "Device ID"],
                ["interfaceId", "Interface ID"],
                ["ruleId", "Rule ID"],
              ].map(([name, text]) => (
                <label key={name} className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
                  {text}
                  <input value={filters[name]} onChange={(event) => updateFilter(name, event.target.value)} placeholder={`Filter by ${text.toLowerCase()}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </label>
              ))}
            </div>

            {actionError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{actionError}</div> : null}
            {error ? (
              <div className="mt-5"><EmptyState title="Unable to load alerts" message={error} /><button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="text-sm font-semibold text-teal-700 underline">Retry</button></div>
            ) : loading ? (
              <div className="mt-5" role="status" aria-live="polite" aria-label="Loading alerts"><SkeletonLoader lines={8} /></div>
            ) : alerts.length === 0 ? (
              <div className="mt-5"><EmptyState title="No matching alerts" message="Nothing currently matches these filters. Device offline and recovery alerts appear here after monitoring detects a status change." /></div>
            ) : (
              <div className="mt-5 grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                  <div className="space-y-3 xl:hidden">
                    {alerts.map((alert) => (
                      <article
                        key={alert._id}
                        className={`min-w-0 cursor-pointer rounded-2xl border p-4 ${selectedAlert?._id === alert._id ? "border-teal-300 bg-teal-50/50" : "border-slate-200 bg-white"}`}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge className={severityStyles[alert.severity] || severityStyles.info}>{displayLabel(alert.severity)}</Badge>
                            <Badge className={statusStyles[alert.status] || "bg-slate-100 text-slate-700"}>{displayStatus(alert.status)}</Badge>
                          </div>
                          <span className="text-xs text-slate-500">{formatDate(alert.lastTriggeredAt)}</span>
                        </div>
                        <p className="mt-3 break-words text-sm font-semibold text-slate-800">{alert.message}</p>
                        <dl className="mt-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                          <dt className="text-slate-500">Source</dt><dd className="break-all text-right text-slate-700">{alert.sourceType}: {alert.sourceId}</dd>
                          <dt className="text-slate-500">Metric</dt><dd className="break-words text-right font-mono text-slate-700">{alert.metric}</dd>
                          <dt className="text-slate-500">Threshold</dt><dd className="text-right text-slate-700">{alert.condition} {alert.threshold}</dd>
                        </dl>
                        {alert.status === "active" || alert.status === "acknowledged" ? (
                          <div className="mt-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
                            {alert.status === "active" ? <button type="button" title="Mark alert as seen" aria-label="Mark alert as seen" disabled={Boolean(actionId)} aria-busy={actionId === alert._id} onClick={() => performAction(alert, "acknowledge")} className="whitespace-nowrap rounded-lg border border-amber-200 px-2 py-1.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">{actionId === alert._id ? "..." : "Seen"}</button> : null}
                            <button type="button" title="Resolve alert" aria-label="Resolve alert" disabled={Boolean(actionId)} aria-busy={actionId === alert._id} onClick={() => performAction(alert, "resolve")} className="whitespace-nowrap rounded-lg border border-emerald-200 px-2 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{actionId === alert._id ? "..." : "Resolve"}</button>
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                  <div className="hidden min-w-0 rounded-2xl border border-slate-200 xl:block">
                  <table className="w-full table-fixed text-left text-sm">
                    <caption className="sr-only">Alert instances</caption>
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        {[
                          ["Severity", "w-[9%]"],
                          ["Status", "w-[10%]"],
                          ["Message", "w-[20%]"],
                          ["Source", "w-[16%]"],
                          ["Metric", "w-[10%]"],
                          ["Threshold", "w-[10%]"],
                          ["Last triggered", "w-[14%]"],
                          ["Actions", "w-[11%]"],
                        ].map(([heading, width]) => <th key={heading} className={`${width} px-2 py-3 font-semibold`}>{heading}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alerts.map((alert) => (
                        <tr key={alert._id} tabIndex={0} role="button" aria-label={`View ${displayLabel(alert.severity)} alert: ${alert.message}`} className={`cursor-pointer hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 ${selectedAlert?._id === alert._id ? "bg-teal-50/50" : ""}`} onClick={() => setSelectedAlert(alert)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedAlert(alert); } }}>
                          <td className="break-words px-2 py-3"><Badge className={severityStyles[alert.severity] || severityStyles.info}>{displayLabel(alert.severity)}</Badge></td>
                          <td className="break-words px-2 py-3"><Badge className={statusStyles[alert.status] || "bg-slate-100 text-slate-700"}>{displayStatus(alert.status)}</Badge></td>
                          <td className="break-words px-2 py-3 font-medium text-slate-800">{alert.message}</td>
                          <td className="break-all px-2 py-3 text-xs text-slate-600">{alert.sourceType}: {alert.sourceId}</td>
                          <td className="break-words px-2 py-3 font-mono text-xs">{alert.metric}</td>
                          <td className="break-words px-2 py-3">{alert.condition} {alert.threshold}</td>
                          <td className="break-words px-2 py-3 text-xs text-slate-600">{formatDate(alert.lastTriggeredAt)}</td>
                          <td className="px-2 py-3">
                            <div className="flex flex-wrap gap-1" onClick={(event) => event.stopPropagation()}>
                              {alert.status === "active" ? <button type="button" title="Mark alert as seen" aria-label="Mark alert as seen" disabled={Boolean(actionId)} aria-busy={actionId === alert._id} onClick={() => performAction(alert, "acknowledge")} className="whitespace-nowrap rounded-lg border border-amber-200 px-1.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">{actionId === alert._id ? "..." : "Seen"}</button> : null}
                              {alert.status === "active" || alert.status === "acknowledged" ? <button type="button" title="Resolve alert" aria-label="Resolve alert" disabled={Boolean(actionId)} aria-busy={actionId === alert._id} onClick={() => performAction(alert, "resolve")} className="whitespace-nowrap rounded-lg border border-emerald-200 px-1.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">{actionId === alert._id ? "..." : "Resolve"}</button> : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="Alert details">
                  {selectedAlert ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Alert details</p><h2 className="mt-2 font-semibold text-slate-800">{selectedAlert.message}</h2></div>
                        <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-white" onClick={() => setSelectedAlert(null)} aria-label="Close alert details"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2"><Badge className={severityStyles[selectedAlert.severity] || severityStyles.info}>{displayLabel(selectedAlert.severity)}</Badge><Badge className={statusStyles[selectedAlert.status] || "bg-slate-100 text-slate-700"}>{displayStatus(selectedAlert.status)}</Badge></div>
                      <dl className="mt-4 space-y-3 text-sm">
                        {[
                          ["Rule", selectedAlert.ruleId],
                          ["Source", `${selectedAlert.sourceType} / ${selectedAlert.sourceId}`],
                          ["Device", selectedAlert.deviceId],
                          ["Interface", selectedAlert.interfaceId],
                          ["Metric", selectedAlert.metric],
                          ["Condition", `${selectedAlert.condition} ${selectedAlert.threshold}`],
                          ["Trigger count", selectedAlert.triggerCount],
                          ["First triggered", formatDate(selectedAlert.firstTriggeredAt)],
                          ["Last triggered", formatDate(selectedAlert.lastTriggeredAt)],
                          ["Seen", formatDate(selectedAlert.acknowledgedAt)],
                          ["Resolved", formatDate(selectedAlert.resolvedAt)],
                        ].map(([key, value]) => <div key={key} className="flex justify-between gap-3 border-b border-slate-200 pb-2"><dt className="text-slate-500">{key}</dt><dd className="max-w-[190px] break-words text-right font-medium text-slate-800">{value || "—"}</dd></div>)}
                      </dl>
                      {selectedAlert.sourceType === "device" && <Link href={`/devices/${encodeURIComponent(selectedAlert.deviceId)}`} className="mt-4 inline-flex text-sm font-semibold text-teal-700 underline">Open device details</Link>}
                      <div className="mt-5 flex gap-2">
                        {selectedAlert.status === "active" ? <button type="button" title="Mark alert as seen" aria-label="Mark alert as seen" disabled={Boolean(actionId)} aria-busy={actionId === selectedAlert._id} onClick={() => performAction(selectedAlert, "acknowledge")} className="flex-1 rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"><Check className="mr-1 inline h-4 w-4" />{actionId === selectedAlert._id ? "Working..." : "Seen"}</button> : null}
                        {selectedAlert.status === "active" || selectedAlert.status === "acknowledged" ? <button type="button" disabled={Boolean(actionId)} aria-busy={actionId === selectedAlert._id} onClick={() => performAction(selectedAlert, "resolve")} className="flex-1 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">{actionId === selectedAlert._id ? "Working..." : "Resolve"}</button> : null}
                      </div>
                    </>
                  ) : <p className="text-sm text-slate-500">Select an alert to view details.</p>}
                </aside>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">Page {page + 1} · Showing up to {PAGE_SIZE} alerts</p>
              <div className="flex gap-2">
                <button type="button" disabled={page === 0 || loading} onClick={() => changePage(page - 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" />Previous</button>
                <button type="button" disabled={loading || alerts.length < PAGE_SIZE} onClick={() => changePage(page + 1)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
