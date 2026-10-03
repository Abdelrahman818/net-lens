"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import { useAuth } from "@/components/AuthProvider";
import API from "@/config";

const emptyForm = { name: "", description: "", deviceIds: [] };
const emptyFilters = { search: "", type: "all", status: "all" };

export default function CreateGroupPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(emptyFilters);

  useEffect(() => {
    if (!can("groups:manage")) return;
    Promise.all([
      API.fetch(API.routes.network.devices),
      API.fetch(API.routes.network.endpoints),
    ])
      .then(async ([devicesResponse, endpointsResponse]) => {
        const devicesPayload = await devicesResponse.json();
        const endpointsPayload = await endpointsResponse.json();
        if (!devicesResponse.ok) throw new Error(devicesPayload.error || "Unable to load devices");
        if (!endpointsResponse.ok) throw new Error(endpointsPayload.error || "Unable to load endpoints");
        const networkDevices = (devicesPayload.devices || []).map((device) => ({ ...device, inventoryType: "network device" }));
        const endpoints = (endpointsPayload.endpoints || []).map((endpoint) => ({
          ...endpoint,
          inventoryType: "endpoint",
          name: endpoint.name || endpoint.ip || endpoint.mac || "Endpoint",
        }));
        setDevices([...networkDevices, ...endpoints].sort((left, right) => left.name.localeCompare(right.name)));
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [can]);

  function toggleDevice(deviceId) {
    setForm((current) => ({
      ...current,
      deviceIds: current.deviceIds.includes(deviceId)
        ? current.deviceIds.filter((id) => id !== deviceId)
        : [...current.deviceIds, deviceId],
    }));
  }

  async function saveGroup(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await API.fetch(API.routes.groups.list, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Unable to create group");
      return;
    }
    router.push("/groups");
  }

  if (!can("groups:manage")) {
    return <div className="min-h-screen bg-[var(--canvas)]"><Navbar /><div className="mx-auto max-w-3xl p-8 text-sm text-[var(--critical-text)]">You do not have permission to create groups.</div></div>;
  }

  const selectedDevices = devices.filter((device) => form.deviceIds.includes(device.id));
  const filteredDevices = devices.filter((device) => {
    const search = filters.search.trim().toLowerCase();
    const matchesSearch = !search || [device.name, device.ip, device.mac]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
    const matchesType = filters.type === "all" || device.inventoryType === filters.type;
    const matchesStatus = filters.status === "all" || (device.status || "unknown") === filters.status;
    return matchesSearch && matchesType && matchesStatus;
  });
  const deviceTypes = [...new Set(devices.map((device) => device.inventoryType).filter(Boolean))];
  const deviceStatuses = [...new Set(devices.map((device) => device.status || "unknown"))];

  return <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
    <Navbar />
    <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
      <Aside />
      <main className="flex-1 xl:ml-[106px]">
        <form onSubmit={saveGroup} className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm md:p-8">
          <button type="button" onClick={() => router.push("/groups")} className="text-sm font-semibold text-[var(--teal-700)]">← Back to groups</button>
          <div className="mt-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">group configuration</p><h1 className="mt-2 text-3xl font-bold">Create group</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Define the group and choose the devices that belong to it.</p></div>
            <div className="flex gap-3"><button type="button" onClick={() => router.push("/groups")} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[var(--teal-800)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Creating..." : "Create group"}</button></div>
          </div>
          {error && <p role="alert" className="mt-5 rounded-lg bg-[var(--critical-bg)] px-3 py-2 text-sm text-[var(--critical-text)]">{error}</p>}
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">Group name<input required minLength={2} placeholder="e.g. Core switches" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
              </div>
              <label className="block text-sm font-semibold">Description<textarea placeholder="Explain what this group is for" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" rows={4} /></label>
              <section className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-center justify-between"><h2 className="font-semibold">Available devices</h2><span className="text-xs text-[var(--text-muted)]">{form.deviceIds.length} selected</span></div>
                <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_160px_160px]">
                  <input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search name, IP, or MAC" aria-label="Search devices" className="rounded-lg border px-3 py-2 text-sm" />
                  <select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })} aria-label="Filter by inventory type" className="rounded-lg border px-3 py-2 text-sm"><option value="all">All types</option>{deviceTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
                  <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })} aria-label="Filter by status" className="rounded-lg border px-3 py-2 text-sm"><option value="all">All statuses</option>{deviceStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                </div>
                <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">{loading ? <p className="py-6 text-center text-sm text-[var(--text-muted)]">Loading devices...</p> : filteredDevices.length ? filteredDevices.map((device) => <label key={device.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 hover:border-[var(--border)] hover:bg-slate-50"><input type="checkbox" checked={form.deviceIds.includes(device.id)} onChange={() => toggleDevice(device.id)} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{device.name}</span><span className="block text-xs text-[var(--text-muted)]">{device.ip || device.mac || "No address"} · {device.inventoryType}</span></span><span className="text-xs capitalize text-[var(--text-muted)]">{device.status || "unknown"}</span></label>) : <p className="py-6 text-center text-sm text-[var(--text-muted)]">No devices match the current filters.</p>}</div>
              </section>
            </div>
            <aside className="h-fit rounded-xl border border-[var(--border)] bg-slate-50 p-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between"><h2 className="font-semibold">Selected devices</h2><span className="rounded-full bg-[var(--mint-100)] px-2 py-1 text-xs font-semibold text-[var(--teal-800)]">{selectedDevices.length}</span></div>
              <div className="mt-4 space-y-2">{selectedDevices.length ? selectedDevices.map((device) => <div key={device.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2"><span className="min-w-0 flex-1 truncate text-sm">{device.name}</span><button type="button" onClick={() => toggleDevice(device.id)} className="text-xs font-semibold text-[var(--critical-text)]">Remove</button></div>) : <p className="text-sm text-[var(--text-secondary)]">Select devices from the list to add them here.</p>}</div>
            </aside>
          </div>
        </form>
      </main>
    </div>
  </div>;
}
