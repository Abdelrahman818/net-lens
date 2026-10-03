"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Edit3, Plus, RefreshCw, X } from "lucide-react";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import API from "@/config";

import useRealtime from "@/hooks/useRealtime";
import RealtimeStatus from "@/components/RealtimeStatus";

const PAGE_SIZE = 25;
const REALTIME_REFRESH_COALESCE_MS = 100;
const emptyForm = {
  notificationId: "",
  name: "",
  enabled: true,
  channel: "email",
  destination: "",
  description: "",
  severityFilter: "",
  ruleIds: "",
};
const initialFilters = {
  notificationId: "",
  alertId: "",
  alertKey: "",
  channel: "all",
  status: "all",
  retryable: "all",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function textList(value) {
  return Array.isArray(value) && value.length ? value.join(", ") : "Any";
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    blue: "bg-sky-100 text-sky-800",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
}

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <label className="flex min-w-[170px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
    </label>
  );
}

function SelectFilter({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-xs font-semibold text-slate-600">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Pagination({ page, count, onPageChange }) {
  const hasNext = count === PAGE_SIZE;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
      <span>Page {page + 1} · showing {count} item{count === 1 ? "" : "s"}</span>
      <div className="flex gap-2">
        <button type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</button>
        <button type="button" disabled={!hasNext} onClick={() => onPageChange(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function ConfigForm({ initial, editing, onCancel, onSaved }) {
  const [form, setForm] = useState(initial || emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.destination.trim() || (!editing && !form.notificationId.trim())) {
      setError("Name, destination, and notification ID are required.");
      return;
    }
    const { notificationId, _editing, ...mutableFields } = form;
    const payload = {
      ...mutableFields,
      ...(editing ? {} : { notificationId: notificationId.trim() }),
      name: form.name.trim(),
      destination: form.destination.trim(),
      description: form.description.trim(),
      severityFilter: form.severityFilter.split(",").map((item) => item.trim()).filter(Boolean),
      ruleIds: form.ruleIds.split(",").map((item) => item.trim()).filter(Boolean),
    };
    setSaving(true);
    try {
      const result = editing
        ? await API.fetch(API.routes.notificationConfigs.detail(form.notificationId), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((response) => response.json())
        : await API.fetch(API.routes.notificationConfigs.list, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((response) => response.json());
      onSaved(result);
    } catch (saveError) {
      setError(saveError.message || "The configuration could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit configuration" : "Create configuration"}</h2>
        <button type="button" onClick={onCancel} aria-label="Close configuration form" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button>
      </div>
      {error ? <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">{error}</div> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-600">Notification ID
          <input value={form.notificationId} disabled={editing} onChange={(event) => update("notificationId", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100" />
          {editing ? <span className="mt-1 block text-xs font-normal text-slate-500">Immutable identity</span> : null}
        </label>
        <label className="text-xs font-semibold text-slate-600">Name<input value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Channel<select value={form.channel} onChange={(event) => update("channel", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="email">Email</option><option value="webhook">Webhook</option></select></label>
        <label className="text-xs font-semibold text-slate-600">Destination<input value={form.destination} onChange={(event) => update("destination", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Severity filter<input placeholder="critical, warning" value={form.severityFilter} onChange={(event) => update("severityFilter", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600">Rule IDs<input placeholder="rule-a, rule-b" value={form.ruleIds} onChange={(event) => update("ruleIds", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="text-xs font-semibold text-slate-600 md:col-span-2">Description<textarea value={form.description} onChange={(event) => update("description", event.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /></label>
      </div>
      <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.enabled} onChange={(event) => update("enabled", event.target.checked)} /> Enabled</label>
      <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save configuration"}</button></div>
    </form>
  );
}

function ConfigurationsSection() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listNotificationConfigs({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }, { signal: controller.signal })
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((requestError) => { if (requestError.name !== "AbortError") setError(requestError.message || "Unable to load configurations."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, refresh]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-800">Configurations</h2><p className="mt-1 text-sm text-slate-600">Manage destinations used for future notification planning.</p></div><div className="flex gap-2"><button type="button" onClick={() => { setLoading(true); setError(null); setRefresh((value) => value + 1); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button><button type="button" onClick={() => setForm(emptyForm)} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> New configuration</button></div></div>
      {form ? <div className="mt-5"><ConfigForm initial={form} editing={Boolean(form.notificationId && form._editing)} onCancel={() => setForm(null)} onSaved={() => { setForm(null); setRefresh((value) => value + 1); }} /></div> : null}
      {error ? <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} <button type="button" onClick={() => setRefresh((value) => value + 1)} className="ml-2 font-bold underline">Retry</button></div> : null}
      {loading ? <div role="status" aria-busy="true" className="mt-5"><SkeletonLoader /></div> : null}
      {!loading && !error && !items.length ? <div className="mt-5"><EmptyState title="No notification configurations" message="Create a configuration to plan deliveries for matching alerts." /></div> : null}
      {!loading && !error && items.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><caption className="sr-only">Notification configurations</caption><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">ID</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Destination</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Filters</th><th className="px-3 py-3">Updated</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{items.map((item) => <tr key={item.notificationId} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold">{item.name}</td><td className="px-3 py-3 font-mono text-xs">{item.notificationId}</td><td className="px-3 py-3 capitalize">{item.channel}</td><td className="px-3 py-3">{item.destination}</td><td className="px-3 py-3"><Badge tone={item.enabled ? "green" : "slate"}>{item.enabled ? "Enabled" : "Disabled"}</Badge></td><td className="px-3 py-3 text-xs">Severity: {textList(item.severityFilter)}<br />Rules: {textList(item.ruleIds)}</td><td className="px-3 py-3 text-xs">{formatDate(item.updatedAt)}</td><td className="px-3 py-3"><button type="button" onClick={() => setForm({ ...item, severityFilter: textList(item.severityFilter).replace("Any", ""), ruleIds: textList(item.ruleIds).replace("Any", ""), _editing: true })} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold hover:bg-slate-50"><Edit3 className="h-3.5 w-3.5" /> Edit</button></td></tr>)}</tbody></table></div> : null}
      <div className="mt-5"><Pagination page={page} count={items.length} onPageChange={(next) => { setLoading(true); setError(null); setItems([]); setPage(next); setForm(null); }} /></div>
    </section>
  );
}

function deliveryTone(status) {
  return status === "sent" ? "green" : status === "failed" ? "red" : status === "processing" ? "blue" : "amber";
}

function DeliveriesSection() {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [now, setNow] = useState(0);
  const realtimeRefreshTimer = useRef(null);
  useRealtime(useCallback((realtimeEvent) => {
    if ([
      "notification.delivery.created",
      "notification.delivery.sent",
      "notification.delivery.failed",
    ].includes(realtimeEvent.eventType)) {
      if (!realtimeRefreshTimer.current) {
        realtimeRefreshTimer.current = setTimeout(() => {
          realtimeRefreshTimer.current = null;
          setRefresh((value) => value + 1);
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
    listNotificationDeliveries({ ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE }, { signal: controller.signal })
      .then((data) => {
        const next = Array.isArray(data) ? data : [];
        setNow(Date.now());
        setItems(next);
        setSelected((current) => next.find((item) => item.deliveryId === current?.deliveryId) || next[0] || null);
      })
      .catch((requestError) => { if (requestError.name !== "AbortError") { setError(requestError.message || "Unable to load deliveries."); setItems([]); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, refresh]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setLoading(true); setError(null); setPage(0); setItems([]); setSelected(null);
  }

  async function performAction(delivery, type) {
    if (action) return;
    setAction(`${type}:${delivery.deliveryId}`); setActionError(null);
    try {
      const operation = type === "deliver" ? deliverNotification : retryNotificationDelivery;
      const updated = await operation(delivery.deliveryId);
      setSelected(updated);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setActionError(requestError.message || "The delivery operation could not be completed.");
    } finally {
      setAction(null);
    }
  }

  function canRetry(item) {
    return item.status === "failed" && item.retryable && item.nextAttemptAt && new Date(item.nextAttemptAt).getTime() <= now;
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-800">Deliveries</h2><p className="mt-1 text-sm text-slate-600">Inspect delivery history and run explicit delivery operations.</p><div className="mt-2"><RealtimeStatus /></div></div><button type="button" onClick={() =>  { setLoading(true); setError(null); setItems([]); setRefresh((value) => value + 1); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh</button></div>
      <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 md:grid-cols-3"><FilterInput label="Notification ID" value={filters.notificationId} onChange={(value) => updateFilter("notificationId", value)} /><FilterInput label="Alert ID" value={filters.alertId} onChange={(value) => updateFilter("alertId", value)} /><FilterInput label="Alert key" value={filters.alertKey} onChange={(value) => updateFilter("alertKey", value)} /><SelectFilter label="Channel" value={filters.channel} onChange={(value) => updateFilter("channel", value)} options={[{ value: "all", label: "All channels" }, { value: "email", label: "Email" }, { value: "webhook", label: "Webhook" }]} /><SelectFilter label="Status" value={filters.status} onChange={(value) => updateFilter("status", value)} options={[{ value: "all", label: "All statuses" }, { value: "pending", label: "Pending" }, { value: "processing", label: "Processing" }, { value: "sent", label: "Sent" }, { value: "failed", label: "Failed" }]} /><SelectFilter label="Retryable" value={filters.retryable} onChange={(value) => updateFilter("retryable", value)} options={[{ value: "all", label: "Any retryability" }, { value: "true", label: "Retryable" }, { value: "false", label: "Not retryable" }]} /></div>
      <div className="mt-3 flex justify-end"><button type="button" onClick={() => { setFilters(initialFilters); setLoading(true); setError(null); setPage(0); setItems([]); setSelected(null); }} className="text-sm font-semibold text-teal-700 hover:underline">Clear filters</button></div>
      {actionError ? <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</div> : null}
      {error ? <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} <button type="button" onClick={() => setRefresh((value) => value + 1)} className="ml-2 font-bold underline">Retry</button></div> : null}
      {loading ? <div role="status" aria-busy="true" className="mt-5"><SkeletonLoader /></div> : null}
      {!loading && !error && !items.length ? <div className="mt-5"><EmptyState title="No deliveries found" message="Try clearing filters or wait for a notification plan to create a delivery." /></div> : null}
      {!loading && !error && items.length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[1150px] text-left text-sm"><caption className="sr-only">Notification deliveries</caption><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Delivery</th><th className="px-3 py-3">Notification</th><th className="px-3 py-3">Alert</th><th className="px-3 py-3">Channel</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Attempts</th><th className="px-3 py-3">Next attempt</th><th className="px-3 py-3">Action</th></tr></thead><tbody>{items.map((item) => { const busy = action?.endsWith(`:${item.deliveryId}`); return <tr key={item.deliveryId} onClick={() => setSelected(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(item); } }} tabIndex={0} className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"><td className="px-3 py-3 font-mono text-xs">{item.deliveryId}</td><td className="px-3 py-3">{item.notificationId}</td><td className="max-w-[180px] truncate px-3 py-3 font-mono text-xs" title={item.alertKey}>{item.alertId}</td><td className="px-3 py-3 capitalize">{item.channel}</td><td className="px-3 py-3"><Badge tone={deliveryTone(item.status)}>{item.status}</Badge></td><td className="px-3 py-3">{item.attemptCount}</td><td className="px-3 py-3 text-xs">{formatDate(item.nextAttemptAt)}</td><td className="px-3 py-3"><div className="flex gap-1" onClick={(event) => event.stopPropagation()}>{item.status === "pending" ? <button type="button" disabled={Boolean(action)} onClick={() => performAction(item, "deliver")} className="rounded-lg border border-teal-200 px-2 py-1 text-xs font-semibold text-teal-800 disabled:opacity-50">{busy ? "Working..." : "Deliver"}</button> : null}{canRetry(item) ? <button type="button" disabled={Boolean(action)} onClick={() => performAction(item, "retry")} className="rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-800 disabled:opacity-50">{busy ? "Working..." : "Retry"}</button> : null}</div></td></tr>; })}</tbody></table></div> : null}
      <div className="mt-5"><Pagination page={page} count={items.length} onPageChange={(next) => { setLoading(true); setError(null); setItems([]); setPage(next); setSelected(null); }} /></div>
      {selected ? <DeliveryDetail delivery={selected} now={now} action={action} onAction={performAction} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function DeliveryDetail({ delivery, now, action, onAction, onClose }) {
  const retryable = delivery.status === "failed" && delivery.retryable && delivery.nextAttemptAt && new Date(delivery.nextAttemptAt).getTime() <= now;
  const fields = [["Delivery ID", delivery.deliveryId], ["Notification ID", delivery.notificationId], ["Alert ID", delivery.alertId], ["Alert key", delivery.alertKey], ["Channel", delivery.channel], ["Destination", delivery.destination], ["Status", delivery.status], ["Attempts", delivery.attemptCount], ["Retryable", delivery.retryable ? "Yes" : "No"], ["Next attempt", formatDate(delivery.nextAttemptAt)], ["Last attempt", formatDate(delivery.lastAttemptAt)], ["Sent", formatDate(delivery.sentAt)], ["Failed", formatDate(delivery.failedAt)], ["Created", formatDate(delivery.createdAt)], ["Updated", formatDate(delivery.updatedAt)], ["Last error", delivery.lastError || "—"]];
  return <aside aria-label="Delivery details" className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><h3 className="text-lg font-bold text-slate-800">Delivery details</h3><button type="button" onClick={onClose} aria-label="Close delivery details" className="rounded-lg p-1 text-slate-500 hover:bg-white"><X className="h-5 w-5" /></button></div><dl className="mt-4 grid gap-3 sm:grid-cols-2">{fields.map(([name, value]) => <div key={name} className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</dt><dd className="mt-1 break-words text-sm text-slate-800">{String(value)}</dd></div>)}</dl><div className="mt-4 flex flex-wrap gap-2">{delivery.status === "pending" ? <button type="button" disabled={Boolean(action)} onClick={() => onAction(delivery, "deliver")} className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{action ? "Working..." : "Deliver"}</button> : null}{retryable ? <button type="button" disabled={Boolean(action)} onClick={() => onAction(delivery, "retry")} className="rounded-xl bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{action ? "Working..." : "Retry"}</button> : null}</div></aside>;
}

export default function NotificationsPage() {
  const [tab, setTab] = useState("configurations");
  if (false) {
    return <><Navbar /><div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6"><Aside /><main className="min-w-0 flex-1 xl:ml-[106px]"><EmptyState title="No API configured — notifications" message="Connect the Net-Lens API to manage notifications." details="Set NEXT_PUBLIC_API_BASE_URL in the frontend environment." /></main></div></>;
  }
  return <div className="min-h-screen bg-[#eef3f3] text-slate-800"><Navbar /><div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6"><Aside /><main className="min-w-0 flex-1 xl:ml-[106px]"><section className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">notification operations</p><h1 className="mt-2 text-3xl font-bold text-slate-800">Notifications</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Manage notification destinations and inspect delivery operations without exposing provider internals.</p></section><div role="tablist" aria-label="Notification sections" className="mb-5 flex gap-2"><button type="button" role="tab" aria-selected={tab === "configurations"} onClick={() => setTab("configurations")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "configurations" ? "bg-teal-700 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>Configurations</button><button type="button" role="tab" aria-selected={tab === "deliveries"} onClick={() => setTab("deliveries")} className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "deliveries" ? "bg-teal-700 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>Deliveries</button></div>{tab === "configurations" ? <ConfigurationsSection /> : <DeliveriesSection />}</main></div></div>;
}
