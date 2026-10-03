"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Printer, ShieldCheck } from "lucide-react";

import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import { useAuth } from "@/components/AuthProvider";

import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import API from "@/config";

const defaultNetworkData = {
  groups: [],
};

const iconMap = {
  camera: <Camera className="h-5 w-5" />,
  printer: <Printer className="h-5 w-5" />,
  shield: <ShieldCheck className="h-5 w-5" />,
};
const emptyForm = { name: "", description: "", icon: "shield", deviceIds: [] };

export default function GroupsPage() {
  const router = useRouter();
  const { can } = useAuth();
  const [network, setNetwork] = useState(defaultNetworkData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [groupsResponse, devicesResponse, endpointsResponse] = await Promise.all([
          API.fetch(API.routes.groups.list),
          API.fetch(API.routes.network.devices),
          API.fetch(API.routes.network.endpoints),
        ]);
        const groupsPayload = await groupsResponse.json();
        const devicesPayload = await devicesResponse.json();
        const endpointsPayload = await endpointsResponse.json();
        if (!groupsResponse.ok) throw new Error(groupsPayload.error || "Unable to load groups");
        if (!devicesResponse.ok) throw new Error(devicesPayload.error || "Unable to load devices");
        if (!endpointsResponse.ok) throw new Error(endpointsPayload.error || "Unable to load endpoints");
        if (!ignore) {
          setNetwork({ groups: groupsPayload.groups || [] });
          setDevices(devicesPayload.devices || []);
          setEndpoints(endpointsPayload.endpoints || []);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to fetch groups:", err);
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
    };
  }, []);

  function openCreate() {
    router.push("/groups/create");
  }

  function openEdit(group) {
    setEditingId(group.id);
    setForm({ name: group.name, description: group.description || "", icon: group.icon || "shield", deviceIds: group.deviceIds || [] });
    setError(null);
    setShowForm(true);
  }

  async function saveGroup(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const response = await API.fetch(editingId ? API.routes.groups.detail(editingId) : API.routes.groups.list, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Unable to save group");
      return;
    }
    setNetwork((current) => ({
      groups: editingId
        ? current.groups.map((group) => group.id === editingId ? payload.group : group)
        : [...current.groups, payload.group].sort((a, b) => a.name.localeCompare(b.name)),
    }));
    setShowForm(false);
  }

  function toggleDevice(deviceId) {
    setForm((current) => ({
      ...current,
      deviceIds: current.deviceIds.includes(deviceId)
        ? current.deviceIds.filter((id) => id !== deviceId)
        : [...current.deviceIds, deviceId],
    }));
  }

  const selectedDevices = devices.filter((device) => form.deviceIds.includes(device.id));

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />

        <main className="flex-1 xl:ml-[106px]">
          { false && (
            <EmptyState
              title="No API configured — groups"
              message="Groups will be empty until a backend is connected or mock mode is enabled."
              details={"Configure the API in Settings or enable mock data for local testing."}
            />
          ) }

          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_30px_rgba(23,63,67,0.04)]">
            <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">groups</p>
                <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Device groups</h1>
                <p className="mt-3 max-w-prose text-[var(--text-secondary)]">Organize devices into logical groups for easier scanning, policies, and bulk actions.</p>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={openCreate} disabled={!can("groups:manage")} className="rounded-lg border border-[var(--teal-700)] bg-[var(--mint-100)] px-3 py-2 text-sm font-semibold text-[var(--teal-800)] disabled:cursor-not-allowed disabled:opacity-50">Create group</button>
              </div>
            </div>
            {!can("groups:manage") && <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-[var(--text-secondary)]">Viewer access is read-only. Administrators and operators can create and modify groups.</p>}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {loading ? (
                <SkeletonLoader lines={6} />
              ) : (
                network.groups.map((group) => (
                        <div key={group.id} role="button" tabIndex={0} onClick={() => setSelectedGroup(group)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedGroup(group); }} className="cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_8px_24px_rgba(23,63,67,0.04)] transition hover:border-[var(--teal-700)]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--mint-200)] text-[var(--teal-800)]">
                          {iconMap[group.icon] || <ShieldCheck className="h-5 w-5" />}
                        </span>
                        <div>
                          <div className="text-lg font-bold text-[var(--text-primary)]">{group.label}</div>
                          <div className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{group.source === "default-lldp" ? "Default LLDP group" : "Custom group"}</div>
                          <div className="text-sm text-[var(--text-muted)]">{group.count} devices</div>
                        </div>
                      </div>
                      {can("groups:manage") && group.source !== "default-lldp" && <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(group); }} className="rounded-full bg-[var(--online-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--online-text)]">Edit</button>}
                    </div>

                    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 text-sm text-[var(--text-secondary)]">
                      {group.description || `${group.count} assigned device${group.count === 1 ? "" : "s"}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {selectedGroup && <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label={`${selectedGroup.name} members`} onClick={() => setSelectedGroup(null)}>
            <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{selectedGroup.source === "default-lldp" ? "Default LLDP group" : "Custom group"}</p><h2 className="mt-1 text-2xl font-bold">{selectedGroup.name}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{selectedGroup.description || "Devices assigned to this group"}</p></div>
                <button type="button" onClick={() => setSelectedGroup(null)} className="rounded-lg border px-3 py-2 text-sm">Close</button>
              </div>
              <div className="mt-5 space-y-2">{[
                ...devices.filter((device) => selectedGroup.deviceIds.includes(device.id)).map((device) => ({ ...device, memberType: "device" })),
                ...endpoints.filter((endpoint) => (selectedGroup.endpointIds || []).includes(endpoint.id)).map((endpoint) => ({ ...endpoint, memberType: "endpoint" }))
              ].map((member) => <button type="button" key={`${member.memberType}-${member.id}`} onClick={() => router.push(`/devices/${encodeURIComponent(member.id)}`)} className="flex w-full items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 text-left hover:bg-slate-50"><div><p className="font-semibold">{member.name}</p><p className="text-xs text-[var(--text-muted)]">{member.ip || member.mac || "Endpoint"} · {member.type || member.memberType}</p></div><span className="text-xs capitalize text-[var(--text-secondary)]">{member.status || "unknown"}</span></button>)}</div>
              {!selectedGroup.count && <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-[var(--text-secondary)]">This group has no members.</p>}
            </div>
          </div>}
          {showForm && <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-900/40 p-4 md:p-8" role="dialog" aria-modal="true" aria-label={editingId ? "Edit group" : "Create group"}>
            <form onSubmit={saveGroup} className="mx-auto min-h-[calc(100vh-4rem)] max-w-6xl rounded-2xl bg-white p-6 shadow-xl md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">group configuration</p><h2 className="mt-2 text-2xl font-bold">{editingId ? "Edit group" : "Create group"}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Define the group and choose the devices that belong to it.</p></div>
                <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-3 py-2 text-sm text-[var(--text-secondary)]">Close</button>
              </div>
              {error && <p role="alert" className="mt-3 rounded-lg bg-[var(--critical-bg)] px-3 py-2 text-sm text-[var(--critical-text)]">{error}</p>}
              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="text-sm font-semibold text-[var(--text-primary)]">Group name<input required minLength={2} placeholder="e.g. Core switches" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" /></label>
                    <label className="text-sm font-semibold text-[var(--text-primary)]">Icon<select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal"><option value="shield">Shield</option><option value="camera">Camera</option><option value="printer">Printer</option></select></label>
                  </div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)]">Description<textarea placeholder="Explain what this group is for" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2 font-normal" rows={4} /></label>
                  <section className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between"><h3 className="font-semibold">Available devices</h3><span className="text-xs text-[var(--text-muted)]">{form.deviceIds.length} selected</span></div>
                    <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">{devices.length ? devices.map((device) => <label key={device.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-2 hover:border-[var(--border)] hover:bg-slate-50"><input type="checkbox" checked={form.deviceIds.includes(device.id)} onChange={() => toggleDevice(device.id)} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{device.name}</span><span className="block text-xs text-[var(--text-muted)]">{device.ip || device.mac || "No address"}</span></span><span className="text-xs capitalize text-[var(--text-muted)]">{device.status || "unknown"}</span></label>) : <p className="py-6 text-center text-sm text-[var(--text-muted)]">No discovered devices available.</p>}</div>
                  </section>
                </div>
                <aside className="rounded-xl border border-[var(--border)] bg-slate-50 p-4">
                  <div className="flex items-center justify-between"><h3 className="font-semibold">Selected devices</h3><span className="rounded-full bg-[var(--mint-100)] px-2 py-1 text-xs font-semibold text-[var(--teal-800)]">{selectedDevices.length}</span></div>
                  <div className="mt-4 space-y-2">{selectedDevices.length ? selectedDevices.map((device) => <div key={device.id} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2"><span className="min-w-0 flex-1 truncate text-sm">{device.name}</span><button type="button" onClick={() => toggleDevice(device.id)} aria-label={`Remove ${device.name}`} className="text-xs font-semibold text-[var(--critical-text)]">Remove</button></div>) : <p className="text-sm text-[var(--text-secondary)]">Select devices from the list to add them here.</p>}</div>
                </aside>
              </div>
              <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[var(--teal-800)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save group"}</button></div>
            </form>
          </div>}
        </main>
      </div>
    </div>
  );
}
