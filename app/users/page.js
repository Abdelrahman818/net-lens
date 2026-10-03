"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import { useAuth } from "@/components/AuthProvider";
import API from "@/config";

const emptyForm = { name: "", username: "", password: "", role: "viewer" };

export default function UsersPage() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hasRole("admin")) return;
    API.fetch(API.routes.users.list, { credentials: "include" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Unable to load users");
        setUsers(payload.users || []);
      })
      .catch((loadError) => setError(loadError.message));
  }, [hasRole]);

  if (!hasRole("admin")) {
    return <div className="p-8 text-sm text-[var(--critical-text)]">You do not have permission to manage users.</div>;
  }

  async function addUser(event) {
    event.preventDefault();
    setError("");
    const response = await API.fetch(API.routes.users.list, {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setError(payload.error || "Unable to create user"); return; }
    setUsers((current) => [...current, payload.user].sort((a, b) => a.username.localeCompare(b.username)));
    setForm(emptyForm);
  }

  return <div className="min-h-screen bg-[var(--canvas)]"><Navbar /><div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6"><Aside /><main className="flex-1 xl:ml-[106px]">
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">administration</p><h1 className="mt-2 text-3xl font-bold">Users</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">Manage access and role assignments.</p>
      {error && <p role="alert" className="mt-4 rounded-lg bg-[var(--critical-bg)] px-3 py-2 text-sm text-[var(--critical-text)]">{error}</p>}
      <form onSubmit={addUser} className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-[1fr_1fr_160px_auto]">
        <input required minLength={2} placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-lg border px-3 py-2" />
        <input required minLength={3} placeholder="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="rounded-lg border px-3 py-2" />
        <input required minLength={8} type="password" placeholder="Temporary password (8+ characters)" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="rounded-lg border px-3 py-2" />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="rounded-lg border px-3 py-2"><option value="viewer">Viewer</option><option value="operator">Operator</option><option value="admin">Admin</option></select>
        <button className="rounded-lg bg-[var(--teal-800)] px-4 py-2 text-sm font-semibold text-white">Add user</button>
      </form>
      <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wider text-[var(--text-muted)]"><tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">Username</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{users.map((item) => <tr key={item.id} onClick={() => router.push(`/users/${item.id}`)} className="cursor-pointer border-b border-slate-100 transition hover:bg-slate-50"><td className="px-3 py-3 font-medium">{item.name}</td><td className="px-3 py-3">{item.username}</td><td className="px-3 py-3 capitalize">{item.role}</td><td className="px-3 py-3">{item.isActive ? "Active" : "Inactive"}</td></tr>)}</tbody></table></div>
    </div>
  </main></div></div>;
}
