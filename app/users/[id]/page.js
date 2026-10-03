"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import { useAuth } from "@/components/AuthProvider";
import API from "@/config";

export default function UserDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { hasRole, user: currentUser } = useAuth();
  const [form, setForm] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasRole("admin") || !id) return;
    API.fetch(API.routes.users.detail(id))
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load user");
        setForm(payload.user);
      })
      .catch((loadError) => setError(loadError.message));
  }, [hasRole, id]);

  if (!hasRole("admin")) return <div className="p-8 text-sm text-[var(--critical-text)]">You do not have permission to manage users.</div>;
  if (!form) return <div className="min-h-screen bg-[var(--canvas)]"><Navbar /><div className="p-8 text-sm text-[var(--text-secondary)]">{error || "Loading user..."}</div></div>;

  async function save(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const body = { name: form.name, username: form.username, role: form.role, isActive: form.isActive };
    if (password) body.password = password;
    const response = await API.fetch(API.routes.users.detail(id), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setError(payload.error || "Unable to update user");
      return;
    }
    setForm(payload.user);
    setPassword("");
  }

  async function remove() {
    if (id === currentUser.id || !window.confirm(`Delete ${form.username}?`)) return;
    const response = await API.fetch(API.routes.users.detail(id), { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload.error || "Unable to delete user");
      return;
    }
    router.push("/users");
  }

  return <div className="min-h-screen bg-[var(--canvas)]"><Navbar /><div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6"><Aside /><main className="flex-1 xl:ml-[106px]"><div className="max-w-2xl rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-sm"><button type="button" onClick={() => router.push("/users")} className="text-sm font-semibold text-[var(--teal-700)]">← Back to users</button><p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">administration</p><h1 className="mt-2 text-3xl font-bold">User details</h1>{error && <p role="alert" className="mt-4 rounded-lg bg-[var(--critical-bg)] px-3 py-2 text-sm text-[var(--critical-text)]">{error}</p>}<form onSubmit={save} className="mt-6 space-y-4"><label className="block text-sm font-medium">Name<input required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="block text-sm font-medium">Username<input required minLength={3} value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="block text-sm font-medium">New password<input minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current password" className="mt-1 w-full rounded-lg border px-3 py-2" /></label><label className="block text-sm font-medium">Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="viewer">Viewer</option><option value="operator">Operator</option><option value="admin">Admin</option></select></label><label className="flex items-center gap-3 text-sm font-medium"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} /> Active</label><div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-[var(--teal-800)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button><button type="button" onClick={remove} className="rounded-lg border border-[var(--critical-text)] px-4 py-2 text-sm font-semibold text-[var(--critical-text)]">Delete user</button></div></form></div></main></div></div>;
}
