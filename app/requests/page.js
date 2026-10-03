"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import API from "@/config";

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "—";
}

const severityStyles = {
  info: "bg-sky-50 text-sky-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  critical: "bg-red-100 text-red-800"
};

export default function RequestsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "200" });
    if (search) params.set("search", search);
    if (source) params.set("source", source);
    API.fetch(`${API.routes.requests.list}?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Requests history request failed (${response.status})`);
        return response.json();
      })
      .then((payload) => setLogs(Array.isArray(payload?.logs) ? payload.logs : []))
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search, source]);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />
        <main className="flex-1 xl:ml-[106px]">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">audit trail</p>
                <h1 className="mt-2 text-3xl font-bold">Requests</h1>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">History of user actions, device discoveries, and every device status change.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input aria-label="Search requests" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search requests" className="w-48 bg-transparent text-sm outline-none" />
                </label>
                <select value={source} onChange={(event) => setSource(event.target.value)} className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm">
                  <option value="">All sources</option>
                  <option value="ui">UI</option>
                  <option value="discovery">Discovery</option>
                  <option value="health">Health</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            {error ? <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
            <div className="mt-6 overflow-x-auto">
              {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading requests...</p> : null}
              {!loading && !logs.length ? <p className="p-8 text-center text-sm text-slate-500">No requests found.</p> : null}
              {!loading && logs.length ? (
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-3">Time</th><th className="px-3 py-3">Event</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Actor / entity</th><th className="px-3 py-3">Details</th></tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-3 py-4 text-xs text-slate-500">{formatDate(log.createdAt)}</td>
                        <td className="px-3 py-4"><div className="font-semibold">{log.eventType}</div><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${severityStyles[log.severity] || severityStyles.info}`}>{log.severity}</span></td>
                        <td className="px-3 py-4 capitalize">{log.source}</td>
                        <td className="px-3 py-4 text-slate-600">{log.actor?.label || log.actor?.type || "system"}{log.entity?.label ? <div className="text-xs text-slate-400">{log.entity.label}</div> : null}</td>
                        <td className="max-w-xl px-3 py-4"><div>{log.message}</div><details className="mt-1 text-xs text-slate-500"><summary className="cursor-pointer">metadata</summary><pre className="mt-2 whitespace-pre-wrap">{JSON.stringify(log.metadata || {}, null, 2)}</pre></details></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
