"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import EmptyState from "@/components/ui/EmptyState";
import { useAuth } from "@/components/AuthProvider";
import API from "@/config";

export default function SettingsPage() {
  const { user } = useAuth();
  const [baseUrl, setBaseUrl] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("NETLENS_API_BASE") || "" : ""));
  const [useMock, setUseMock] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("NETLENS_USE_MOCK_DATA") === "true" : false));
  const [saved, setSaved] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetResult, setResetResult] = useState("");

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  function saveSettings() {
    if (typeof window === "undefined") return;
    localStorage.setItem("NETLENS_API_BASE", baseUrl);
    localStorage.setItem("NETLENS_USE_MOCK_DATA", useMock ? "true" : "false");
    setSaved(true);
    // force reload to let runtime endpoints pick up new base URL
    window.location.reload();
  }

  async function resetApplicationData(event) {
    event.preventDefault();
    if (resetConfirmation !== "RESET ALL DATA") return;

    setResetting(true);
    setResetError("");
    setResetResult("");
    try {
      const response = await API.fetch(API.routes.admin.resetData, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: resetConfirmation }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Unable to reset application data.");
      setResetResult(`Reset complete. Removed ${payload.droppedCollections.length} collection(s); user accounts were preserved.`);
      setShowResetConfirmation(false);
      setResetConfirmation("");
    } catch (error) {
      setResetError(error.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />

        <main className="flex-1 xl:ml-[106px]">
          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">settings</p>
              <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Runtime configuration</h1>
              <p className="mt-3 max-w-prose text-[var(--text-secondary)]">Configure the NETLENS API endpoint and mock mode at runtime without rebuilding.</p>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">API base URL</label>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" placeholder="https://api.example.com" />
              </div>

              <div className="flex items-center gap-3">
                <input id="mock" type="checkbox" checked={useMock} onChange={(e) => setUseMock(e.target.checked)} />
                <label htmlFor="mock" className="text-sm text-[var(--text-secondary)]">Enable local mock data</label>
              </div>

              <div className="flex gap-3">
                <button onClick={saveSettings} className="rounded bg-[var(--teal-700)] px-4 py-2 text-white">Save</button>
                {saved ? <div className="text-sm text-[var(--online-text)]">Saved</div> : null}
              </div>
            </div>
          </div>

          {user?.role === "admin" && <section className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">Danger zone</p>
            <h2 className="mt-2 text-xl font-bold text-red-900">Reset application data</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-red-900">
              Permanently drops all MongoDB collections used by the application except the users collection. This removes devices, interfaces, alerts, groups, monitoring history, requests, and other application data. User accounts remain, but this action cannot be undone.
            </p>
            {resetError && <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-white p-3 text-sm text-red-800">{resetError}</p>}
            {resetResult && <p role="status" className="mt-4 rounded-lg border border-emerald-300 bg-white p-3 text-sm text-emerald-800">{resetResult}</p>}
            <button
              type="button"
              onClick={() => {
                setResetError("");
                setResetResult("");
                setResetConfirmation("");
                setShowResetConfirmation(true);
              }}
              className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Reset all data
            </button>
          </section>}

          {showResetConfirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="reset-confirmation-title"
              aria-describedby="reset-confirmation-description"
              className="w-full max-w-lg rounded-xl border border-red-300 bg-white p-6 shadow-2xl"
            >
              <h2 id="reset-confirmation-title" className="text-xl font-bold text-red-900">Confirm permanent data reset</h2>
              <p id="reset-confirmation-description" className="mt-3 text-sm leading-6 text-slate-700">
                All application collections except user accounts will be dropped. This cannot be undone. To continue, type <strong>RESET ALL DATA</strong>.
              </p>
              <form onSubmit={resetApplicationData}>
                <label htmlFor="reset-confirmation" className="mt-4 block text-sm font-semibold text-slate-700">Confirmation phrase</label>
                <input
                  id="reset-confirmation"
                  type="text"
                  autoFocus
                  value={resetConfirmation}
                  onChange={(event) => setResetConfirmation(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                  autoComplete="off"
                />
                {resetError && <p role="alert" className="mt-3 text-sm text-red-700">{resetError}</p>}
                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={resetting}
                    onClick={() => setShowResetConfirmation(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting || resetConfirmation !== "RESET ALL DATA"}
                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resetting ? "Resetting..." : "Permanently reset"}
                  </button>
                </div>
              </form>
            </section>
          </div>}

          <EmptyState title="Runtime settings" message="Use the form above to point the app at a backend or enable mock mode for development." />
        </main>
      </div>
    </div>
  );
}
