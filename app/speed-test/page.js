"use client";

import { useRef, useState } from "react";
import { Activity, Download, Gauge, Upload, Zap } from "lucide-react";
import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";

const TEST_BASE_URL = "https://speed.cloudflare.com";
const LATENCY_SAMPLES = 8;
const TRANSFER_DURATION_MS = 6000;
const TRANSFER_CHUNK_BYTES = 4 * 1024 * 1024;
const UPLOAD_CHUNK_BYTES = 512 * 1024;
const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;
const TRANSFER_CONCURRENCY = 4;

const INITIAL_RESULTS = {
  latency: null,
  jitter: null,
  download: null,
  upload: null,
};

function percentile(values, fraction) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * fraction))];
}

function createEndpointUrl(path) {
  const url = new URL(path, TEST_BASE_URL);
  url.searchParams.set("netlens", `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return url.toString();
}

async function measureLatency(signal, setProgress) {
  const samples = [];

  for (let sample = 0; sample < LATENCY_SAMPLES; sample += 1) {
    if (signal.aborted) throw new DOMException("Test cancelled", "AbortError");
    const startedAt = performance.now();
    const response = await fetch(createEndpointUrl("/__down?bytes=0"), {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      signal,
    });
    if (!response.ok) throw new Error(`Latency check failed (${response.status})`);
    await response.arrayBuffer();
    samples.push(performance.now() - startedAt);
    setProgress(`Latency check ${sample + 1} of ${LATENCY_SAMPLES}`);
  }

  const latency = percentile(samples, 0.5);
  const jitter = samples.length > 1
    ? samples.slice(1).reduce((total, value, index) => total + Math.abs(value - samples[index]), 0) / (samples.length - 1)
    : 0;

  return { latency: Math.round(latency), jitter: Math.round(jitter) };
}

function uploadChunk(url, body, signal, onProgress) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Test cancelled", "AbortError"));
      return;
    }

    const request = new XMLHttpRequest();
    let settled = false;
    let uploadedBytes = 0;

    const cleanup = () => {
      signal.removeEventListener("abort", abortRequest);
      request.upload.removeEventListener("progress", trackProgress);
      request.removeEventListener("load", handleLoad);
      request.removeEventListener("error", handleError);
      request.removeEventListener("abort", handleAbort);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const trackProgress = (event) => {
      uploadedBytes = Math.max(uploadedBytes, event.loaded);
      onProgress(uploadedBytes);
    };
    const abortRequest = () => request.abort();
    const handleLoad = () => {
      if (request.status < 200 || request.status >= 300) {
        finish(reject, new Error(`upload test failed (${request.status})`));
        return;
      }
      uploadedBytes = Math.max(uploadedBytes, body.byteLength);
      onProgress(uploadedBytes);
      finish(resolve);
    };
    const handleError = () => finish(reject, new Error("Upload request failed"));
    const handleAbort = () => finish(reject, new DOMException("Test cancelled", "AbortError"));

    request.upload.addEventListener("progress", trackProgress);
    request.addEventListener("load", handleLoad);
    request.addEventListener("error", handleError);
    request.addEventListener("abort", handleAbort);
    signal.addEventListener("abort", abortRequest, { once: true });
    request.open("POST", url);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.send(body);
  });
}

async function measureTransfer(direction, signal, setProgress, onSpeed) {
  const startedAt = performance.now();
  const stageController = new AbortController();
  const abortStage = () => stageController.abort();
  const timeout = window.setTimeout(abortStage, TRANSFER_DURATION_MS);
  signal.addEventListener("abort", abortStage, { once: true });
  let reservedBytes = 0;
  let transferredBytes = 0;

  const updateSpeed = () => {
    const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
    onSpeed((transferredBytes * 8) / elapsedSeconds / 1_000_000);
  };
  const speedInterval = window.setInterval(updateSpeed, 250);

  const workers = Array.from({ length: TRANSFER_CONCURRENCY }, async () => {
    while (!stageController.signal.aborted) {
      const nextChunkBytes = Math.min(
        direction === "upload" ? UPLOAD_CHUNK_BYTES : TRANSFER_CHUNK_BYTES,
        MAX_TRANSFER_BYTES - reservedBytes
      );
      if (nextChunkBytes <= 0) return;

      reservedBytes += nextChunkBytes;
      try {
        if (direction === "upload") {
          let chunkUploadedBytes = 0;
          await uploadChunk(
            createEndpointUrl("/__up"),
            new Uint8Array(nextChunkBytes),
            stageController.signal,
            (loadedBytes) => {
              const uploadedBytes = Math.min(loadedBytes, nextChunkBytes);
              transferredBytes += uploadedBytes - chunkUploadedBytes;
              chunkUploadedBytes = uploadedBytes;
            }
          );
        } else {
          const response = await fetch(createEndpointUrl(`/__down?bytes=${nextChunkBytes}`), {
            method: "GET",
            cache: "no-store",
            credentials: "omit",
            signal: stageController.signal,
          });
          if (!response.ok) throw new Error(`download test failed (${response.status})`);

          if (response.body) {
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              transferredBytes += value.byteLength;
            }
          } else {
            const payload = await response.arrayBuffer();
            transferredBytes += payload.byteLength;
          }
        }
        setProgress(`${direction === "download" ? "Download" : "Upload"} test · ${Math.round(transferredBytes / 1_000_000)} MB`);
      } catch (error) {
        if (signal.aborted) throw new DOMException("Test cancelled", "AbortError");
        if (stageController.signal.aborted && error.name === "AbortError") return;
        throw error;
      }
    }
  });

  try {
    await Promise.all(workers);
  } catch (error) {
    stageController.abort();
    throw error;
  } finally {
    window.clearTimeout(timeout);
    window.clearInterval(speedInterval);
    signal.removeEventListener("abort", abortStage);
  }

  if (signal.aborted) throw new DOMException("Test cancelled", "AbortError");
  updateSpeed();
  const elapsedSeconds = Math.max((performance.now() - startedAt) / 1000, 0.001);
  return (transferredBytes * 8) / elapsedSeconds / 1_000_000;
}

function formatSpeed(value) {
  return value === null ? "—" : value < 10 ? value.toFixed(2) : value.toFixed(1);
}

function MetricCard({ label, value, unit, icon: Icon, accent, live = false }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
        <span className="flex items-center gap-2">
          {live ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--teal-800)]"><span className="h-2 w-2 animate-pulse rounded-full bg-[var(--online)]" />Live</span> : null}
          <span className={`rounded-lg p-2 ${accent}`}><Icon className="h-5 w-5" /></span>
        </span>
      </div>
      <p className="mt-5 font-mono text-4xl font-bold tabular-nums tracking-tight text-[var(--text-primary)]" aria-live={live ? "polite" : undefined}>{value}</p>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{unit}</p>
    </div>
  );
}

export default function SpeedTestPage() {
  const [results, setResults] = useState(INITIAL_RESULTS);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [completedAt, setCompletedAt] = useState(null);
  const [activeMetric, setActiveMetric] = useState(null);
  const controllerRef = useRef(null);

  async function startTest() {
    const controller = new AbortController();
    controllerRef.current = controller;
    setResults(INITIAL_RESULTS);
    setError("");
    setCompletedAt(null);
    setActiveMetric("latency");
    setStatus("running");

    try {
      setProgress("Measuring latency");
      const latency = await measureLatency(controller.signal, setProgress);
      setResults((current) => ({ ...current, ...latency }));

      setActiveMetric("download");
      setProgress("Measuring download speed");
      const download = await measureTransfer("download", controller.signal, setProgress, (value) => {
        setResults((current) => ({ ...current, download: value }));
      });
      setResults((current) => ({ ...current, download }));

      setActiveMetric("upload");
      setProgress("Measuring upload speed");
      const upload = await measureTransfer("upload", controller.signal, setProgress, (value) => {
        setResults((current) => ({ ...current, upload: value }));
      });
      setResults((current) => ({ ...current, upload }));

      setCompletedAt(new Date());
      setActiveMetric(null);
      setStatus("complete");
      setProgress("");
    } catch (testError) {
      if (testError.name === "AbortError") {
        setActiveMetric(null);
        setStatus("idle");
        setProgress("Test cancelled");
      } else {
        setActiveMetric(null);
        setStatus("error");
        setProgress("");
        setError(
          "Unable to reach the internet speed-test service. Check your internet connection or browser network restrictions, then try again."
        );
        console.error("Internet speed test failed:", testError);
      }
    } finally {
      controllerRef.current = null;
    }
  }

  function cancelTest() {
    controllerRef.current?.abort();
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />
        <main className="min-w-0 flex-1 xl:ml-[106px]">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Internet connection test</p>
                <h1 className="mt-2 text-3xl font-bold">Network speed test</h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                  Test latency, jitter, download, and upload speed from this browser to the internet.
                </p>
              </div>
              <div className="flex gap-3">
                {status === "running" ? (
                  <button type="button" onClick={cancelTest} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-slate-50">
                    Stop test
                  </button>
                ) : (
                  <button type="button" onClick={startTest} className="inline-flex items-center gap-2 rounded-xl bg-[var(--teal-800)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--navy-teal-900)]">
                    <Zap className="h-4 w-4" />
                    {status === "complete" || status === "error" ? "Test again" : "Start test"}
                  </button>
                )}
              </div>
            </div>

            {status === "running" ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-900" role="status" aria-live="polite">
                <Activity className="h-4 w-4 animate-pulse" />
                {progress}
              </div>
            ) : null}
            {status === "idle" && progress ? (
              <p className="mt-5 text-sm text-[var(--text-secondary)]" role="status">{progress}</p>
            ) : null}
            {error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
            ) : null}

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Download" value={formatSpeed(results.download)} unit="Mbps" icon={Download} accent="bg-sky-50 text-sky-700" live={status === "running" && activeMetric === "download"} />
              <MetricCard label="Upload" value={formatSpeed(results.upload)} unit="Mbps" icon={Upload} accent="bg-violet-50 text-violet-700" live={status === "running" && activeMetric === "upload"} />
              <MetricCard label="Latency" value={results.latency === null ? "—" : results.latency} unit="ms" icon={Gauge} accent="bg-emerald-50 text-emerald-700" />
              <MetricCard label="Jitter" value={results.jitter === null ? "—" : results.jitter} unit="ms" icon={Activity} accent="bg-amber-50 text-amber-700" />
            </div>

            {completedAt ? (
              <p className="mt-5 text-xs text-[var(--text-muted)]">Test completed {completedAt.toLocaleTimeString()}.</p>
            ) : null}

          </section>
        </main>
      </div>
    </div>
  );
}
