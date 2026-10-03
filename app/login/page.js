"use client";

import { useState } from "react";
import { Network } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-raised)] p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--navy-teal-900)] text-white"><Network className="h-5 w-5" /></div>
          <div><h1 className="text-xl font-bold text-[var(--navy-teal-900)]">Net Lens</h1><p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">network operations</p></div>
        </div>
        <h2 className="mt-10 text-2xl font-bold">Sign in</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Use your Net Lens account to access the operations workspace.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">Username<input required autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 outline-none focus:border-[var(--teal-700)]" /></label>
          <label className="block text-sm font-medium">Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2.5 outline-none focus:border-[var(--teal-700)]" /></label>
          {error && <p role="alert" className="rounded-lg bg-[var(--critical-bg)] px-3 py-2 text-sm text-[var(--critical-text)]">{error}</p>}
          <button disabled={submitting || isLoading} className="w-full rounded-xl bg-[var(--teal-800)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--navy-teal-900)] disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Signing in…" : "Sign in"}</button>
        </form>
      </section>
    </main>
  );
}
