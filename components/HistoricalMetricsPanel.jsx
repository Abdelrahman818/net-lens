"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Database, Gauge, Minus, RefreshCcw, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import API from "@/config";
import formatThroughput from "@/lib/formatThroughput";
import {
  HISTORICAL_METRIC_OPTIONS,
  compareHistoricalPeriods,
  getHistoricalTimeRange,
  getHistoricalMetricSummary,
  getHistoricalMetricTrend,
  queryHistoricalMetrics,
} from "@/lib/historicalMetricsApi";

const RANGE_OPTIONS = [
  { label: "Last 15 minutes", value: "15m" },
  { label: "Last 1 hour", value: "1h" },
  { label: "Last 6 hours", value: "6h" },
  { label: "Last 24 hours", value: "24h" },
];

function formatMetricValue(value, metric) {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "n/a";
  if (metric === "inUtilization" || metric === "outUtilization") {
    return `${numericValue.toFixed(2)}%`;
  }
  return formatThroughput(numericValue);
}

function formatSignedMetricValue(value, metric) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "Unavailable";
  const numericValue = Number(value);
  const sign = numericValue > 0 ? "+" : "";
  return `${sign}${formatMetricValue(numericValue, metric)}`;
}

function formatChartTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "n/a"
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatElapsed(milliseconds) {
  const totalMinutes = Math.round(Number(milliseconds) / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function ComparisonTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-700">Elapsed {formatElapsed(label)}</p>
      {payload.map((entry) => {
        const timestamp = entry.dataKey === "currentValue"
          ? entry.payload.currentValueTimestamp
          : entry.payload.previousValueTimestamp;
        return (
          <p key={entry.dataKey} className="mt-1 text-slate-600">
            <span className="font-medium">{entry.name}:</span> {formatMetricValue(entry.value, metric)}
            <span className="ml-1 text-slate-400">({new Date(timestamp).toLocaleString()})</span>
          </p>
        );
      })}
    </div>
  );
}

export default function HistoricalMetricsPanel({ devices = [] }) {
  const router = useRouter();
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedInterfaceId, setSelectedInterfaceId] = useState("");
  const [interfaces, setInterfaces] = useState([]);
  const [interfacesDeviceId, setInterfacesDeviceId] = useState("");
  const [selectedMetric, setSelectedMetric] = useState("inBps");
  const [selectedRange, setSelectedRange] = useState("1h");
  const [samples, setSamples] = useState([]);
  const [samplesKey, setSamplesKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [analytics, setAnalytics] = useState({ summary: null, comparison: null, trend: null });
  const [analyticsKey, setAnalyticsKey] = useState("");
  const [analyticsErrors, setAnalyticsErrors] = useState({ summary: null, comparison: null, trend: null });
  const [analyticsLoading, setAnalyticsLoading] = useState({ summary: false, comparison: false, trend: false });
  const [previousSamples, setPreviousSamples] = useState([]);
  const [previousSamplesKey, setPreviousSamplesKey] = useState("");
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState(null);

  const activeDeviceId = selectedDeviceId || devices[0]?.id || "";

  useEffect(() => {
    if (!activeDeviceId) {
      return undefined;
    }
    const controller = new AbortController();
    API.fetch(API.routes.network.interfaces(activeDeviceId), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Interfaces request failed (${response.status})`);
        return response.json();
      })
      .then((payload) => {
        setInterfaces(Array.isArray(payload?.interfaces) ? payload.interfaces : []);
        setInterfacesDeviceId(activeDeviceId);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Failed to load device interfaces:", err.message);
          setInterfaces([]);
          setInterfacesDeviceId(activeDeviceId);
        }
      })
    return () => controller.abort();
  }, [activeDeviceId]);

  const interfaceOptions = useMemo(() => {
    if (interfacesDeviceId !== activeDeviceId) return [];
    return interfaces.map((item) => ({
      id: item._id || item.id || item.name,
      label: item.name || item._id || item.id,
    }));
  }, [interfaces, interfacesDeviceId, activeDeviceId]);

  const activeInterfaceId = interfaceOptions.some((item) => item.id === selectedInterfaceId)
    ? selectedInterfaceId
    : interfaceOptions[0]?.id || "";
  const selectionKey = `${activeDeviceId}|${activeInterfaceId}|${selectedMetric}|${selectedRange}|${refreshVersion}`;
  const periodBounds = useMemo(() => {
    const current = getHistoricalTimeRange(selectedRange);
    const currentFrom = new Date(current.from);
    const currentTo = new Date(current.to);
    const duration = currentTo.getTime() - currentFrom.getTime();
    const previousTo = currentFrom;
    const previousFrom = new Date(previousTo.getTime() - duration);

    return {
      currentFrom: current.from,
      currentTo: current.to,
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
    };
  }, [selectedRange]);

  useEffect(() => {
    if (!activeDeviceId || !activeInterfaceId) {
      return;
    }

    const controller = new AbortController();

    async function loadHistoricalMetrics() {
      try {
        setLoading(true);
        setError(null);

        const response = await queryHistoricalMetrics({
          deviceId: activeDeviceId,
          interfaceId: activeInterfaceId,
          metric: selectedMetric,
          from: periodBounds.currentFrom,
          to: periodBounds.currentTo,
          limit: 25,
          sort: "asc",
        }, { signal: controller.signal });

        setSamples(response?.documents ?? []);
        setSamplesKey(selectionKey);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError(err.message || "Unable to load historical metrics.");
          setSamples([]);
          setSamplesKey(selectionKey);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadHistoricalMetrics();

    return () => {
      controller.abort();
    };
  }, [refreshVersion, selectionKey, activeDeviceId, activeInterfaceId, selectedMetric, periodBounds]);

  useEffect(() => {
    if (!activeDeviceId || !activeInterfaceId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadPreviousSamples() {
      setComparisonLoading(true);
      setComparisonError(null);

      try {
        const response = await queryHistoricalMetrics({
          deviceId: activeDeviceId,
          interfaceId: activeInterfaceId,
          metric: selectedMetric,
          from: periodBounds.previousFrom,
          to: periodBounds.previousTo,
          limit: 25,
          sort: "asc",
        }, { signal: controller.signal });

        setPreviousSamples(response?.documents ?? []);
        setPreviousSamplesKey(selectionKey);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setPreviousSamples([]);
          setPreviousSamplesKey(selectionKey);
          setComparisonError(err.message || "Unable to load previous-period samples.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setComparisonLoading(false);
        }
      }
    }

    loadPreviousSamples();

    return () => {
      controller.abort();
    };
  }, [refreshVersion, selectionKey, activeDeviceId, activeInterfaceId, selectedMetric, periodBounds]);

  useEffect(() => {
    if (!activeDeviceId || !activeInterfaceId) {
      return undefined;
    }

    const controller = new AbortController();
    const commonParams = {
      deviceId: activeDeviceId,
      interfaceId: activeInterfaceId,
      metric: selectedMetric,
    };

    async function loadAnalytics() {
      setAnalyticsLoading({ summary: true, comparison: true, trend: true });
      setAnalyticsErrors({ summary: null, comparison: null, trend: null });

      const results = await Promise.allSettled([
        getHistoricalMetricSummary({ ...commonParams, from: periodBounds.currentFrom, to: periodBounds.currentTo }, { signal: controller.signal }),
        compareHistoricalPeriods({
          ...commonParams,
          currentFrom: periodBounds.currentFrom,
          currentTo: periodBounds.currentTo,
          previousFrom: periodBounds.previousFrom,
          previousTo: periodBounds.previousTo,
        }, { signal: controller.signal }),
        getHistoricalMetricTrend({
          ...commonParams,
          from: periodBounds.currentFrom,
          to: periodBounds.currentTo,
          tolerance: 0,
        }, { signal: controller.signal }),
      ]);

      if (controller.signal.aborted) return;

      const nextAnalytics = {
        summary: results[0].status === "fulfilled" ? results[0].value : null,
        comparison: results[1].status === "fulfilled" ? results[1].value : null,
        trend: results[2].status === "fulfilled" ? results[2].value : null,
      };
      const nextErrors = {
        summary: results[0].status === "rejected" ? results[0].reason?.message || "Summary unavailable." : null,
        comparison: results[1].status === "rejected" ? results[1].reason?.message || "Comparison unavailable." : null,
        trend: results[2].status === "rejected" ? results[2].reason?.message || "Trend unavailable." : null,
      };

      setAnalytics(nextAnalytics);
      setAnalyticsErrors(nextErrors);
      setAnalyticsKey(selectionKey);
      setAnalyticsLoading({ summary: false, comparison: false, trend: false });
    }

    loadAnalytics();

    return () => {
      controller.abort();
    };
  }, [refreshVersion, selectionKey, activeDeviceId, activeInterfaceId, selectedMetric, periodBounds]);

  const visibleSamples = useMemo(
    () => (samplesKey === selectionKey ? samples.filter((sample) => sample && sample.timestamp) : []),
    [samples, samplesKey, selectionKey]
  );
  const chartData = useMemo(() => visibleSamples.map((sample) => ({
    timestamp: sample.timestamp,
    value: Number(sample.value),
  })), [visibleSamples]);
  const chartUnit = selectedMetric.includes("Utilization") ? "%" : "bps";
  const comparisonData = useMemo(() => {
    const currentStart = new Date(periodBounds.currentFrom).getTime();
    const previousStart = new Date(periodBounds.previousFrom).getTime();
    const toPoint = (sample, start, key) => ({
      offset: Math.max(0, new Date(sample.timestamp).getTime() - start),
      [key]: Number(sample.value),
      [`${key}Timestamp`]: sample.timestamp,
    });

    const alignedPoints = [
      ...visibleSamples.map((sample) => toPoint(sample, currentStart, "currentValue")),
      ...((previousSamplesKey === selectionKey) ? previousSamples : []).map((sample) => toPoint(sample, previousStart, "previousValue")),
    ].reduce((points, point) => {
      const existing = points.get(point.offset) || {};
      points.set(point.offset, { ...existing, ...point });
      return points;
    }, new Map());

    return [...alignedPoints.values()].sort((left, right) => left.offset - right.offset);
  }, [periodBounds, previousSamples, previousSamplesKey, selectionKey, visibleSamples]);
  const trendClassification = analytics.trend?.trend || "insufficient_data";
  const currentLoading = Boolean(activeDeviceId) && loading;
  const currentComparisonLoading = Boolean(activeDeviceId && activeInterfaceId) && comparisonLoading;
  const currentError = samplesKey === selectionKey ? error : null;
  const currentComparisonError = previousSamplesKey === selectionKey ? comparisonError : null;
  const trendPresentation = {
    increasing: { label: "Increasing", icon: <ArrowUp className="h-4 w-4" /> },
    decreasing: { label: "Decreasing", icon: <ArrowDown className="h-4 w-4" /> },
    stable: { label: "Stable", icon: <Minus className="h-4 w-4" /> },
    insufficient_data: { label: "Insufficient data", icon: <Minus className="h-4 w-4" /> },
  }[trendClassification] || { label: trendClassification, icon: <Minus className="h-4 w-4" /> };

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">historical metrics</p>
          <h2 className="mt-2 text-xl font-bold text-slate-800">Recent network performance</h2>
        </div>

        <button
          type="button"
          onClick={() => setRefreshVersion((current) => current + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Device
          <select
            value={activeDeviceId}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none focus:border-cyan-500"
          >
            {devices.length > 0 ? (
              devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.name || device.id}
                </option>
              ))
            ) : (
              <option value="">No devices available</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Interface
          <select
            value={activeInterfaceId}
            onChange={(event) => setSelectedInterfaceId(event.target.value)}
            disabled={!activeDeviceId || interfaceOptions.length === 0}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none focus:border-cyan-500"
          >
            {interfaceOptions.length > 0 ? interfaceOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            )) : <option value="">No interfaces available</option>}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Metric
          <select
            value={selectedMetric}
            onChange={(event) => setSelectedMetric(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none focus:border-cyan-500"
          >
            {HISTORICAL_METRIC_OPTIONS.map((metric) => (
              <option key={metric} value={metric}>
                {metric}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-600">
          Time range
          <select
            value={selectedRange}
            onChange={(event) => setSelectedRange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-800 outline-none focus:border-cyan-500"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!activeDeviceId ? (
        <div className="mt-4">
          <EmptyState
            title="No device available"
            message="Historical metrics require a discovered network device."
            details="Run discovery or refresh the dashboard device inventory."
          />
        </div>
      ) : !activeInterfaceId ? (
        <div className="mt-4">
          <EmptyState
            title="Interface data not collected yet"
            message="This device has no SNMP interface records available for historical metrics."
            details="Open the device details and use Update device to collect supported interface data."
          />
          <button type="button" onClick={() => router.push(`/devices/${encodeURIComponent(activeDeviceId)}`)} className="mt-2 text-sm font-semibold text-teal-700 underline">Open device details</button>
        </div>
      ) : null}

      {activeDeviceId && activeInterfaceId && currentLoading ? (
        <div className="mt-5">
          <SkeletonLoader lines={5} />
        </div>
      ) : activeDeviceId && activeInterfaceId && currentError ? (
        <div className="mt-5">
          <EmptyState title="Historical metrics error" message={currentError} details="The dashboard could not load the requested history." />
          <button type="button" onClick={() => setRefreshVersion((current) => current + 1)} className="mt-2 text-sm font-semibold text-teal-700 underline">
            Retry historical data
          </button>
        </div>
      ) : activeDeviceId && activeInterfaceId && visibleSamples.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No historical data"
            message="There are no historical samples for this device, interface, metric, and time range."
            details={`${selectedMetric} • ${activeDeviceId || "device"} • ${activeInterfaceId}`}
          />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div
            className="h-72 w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
            aria-label={`${selectedMetric} historical time series chart`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 18, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="#dbe5e7" strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatChartTimestamp}
                  minTickGap={24}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => formatMetricValue(value, selectedMetric)}
                  width={72}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: chartUnit, angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                  formatter={(value) => [formatMetricValue(value, selectedMetric), selectedMetric]}
                  contentStyle={{ borderRadius: 12, borderColor: "#cbd5e1", backgroundColor: "#ffffff" }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selectedMetric}
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  dot={{ r: chartData.length === 1 ? 5 : 3, fill: "#0f766e", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <details className="overflow-hidden rounded-2xl border border-slate-200">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-700">
              Inspect raw samples ({visibleSamples.length})
            </summary>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-2 font-medium">Timestamp</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                    <th className="px-3 py-2 font-medium">Metric</th>
                    <th className="px-3 py-2 font-medium">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSamples.map((sample) => (
                    <tr key={`${sample.deviceId}-${sample.interfaceId}-${sample.metric}-${sample.timestamp}`} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-3 py-2 text-slate-700">{new Date(sample.timestamp).toLocaleString()}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{sample.value ?? "n/a"}</td>
                      <td className="px-3 py-2 text-slate-700">{sample.metric}</td>
                      <td className="px-3 py-2 text-slate-700">{sample.unit || "n/a"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4" aria-labelledby="historical-summary-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">analytics summary</p>
              <h3 id="historical-summary-heading" className="mt-1 text-base font-semibold text-slate-800">Selected period</h3>
            </div>
            {analyticsLoading.summary && activeDeviceId ? <span className="text-xs text-slate-500">Loading summary...</span> : null}
          </div>
          {analyticsKey !== selectionKey ? (
            <p className="mt-4 text-sm text-slate-500">Select a valid device and interface to load summary analytics.</p>
          ) : analyticsErrors.summary ? (
            <p className="mt-4 text-sm text-amber-700">Summary unavailable: {analyticsErrors.summary}</p>
          ) : analytics.summary ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Samples", analytics.summary.count],
                ["Minimum", formatMetricValue(analytics.summary.min, selectedMetric)],
                ["Average", formatMetricValue(analytics.summary.average, selectedMetric)],
                ["Maximum", formatMetricValue(analytics.summary.max, selectedMetric)],
                ["First", formatMetricValue(analytics.summary.first?.value, selectedMetric)],
                ["Last", formatMetricValue(analytics.summary.last?.value, selectedMetric)],
                ["Delta", formatSignedMetricValue(analytics.summary.delta, selectedMetric)],
                ["Unit", analytics.summary.unit || "Unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{value ?? "Unavailable"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No summary data is available for this selection.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4" aria-labelledby="historical-comparison-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">period comparison</p>
          <h3 id="historical-comparison-heading" className="mt-1 text-base font-semibold text-slate-800">Current vs previous period</h3>
          {analyticsKey !== selectionKey ? (
            <p className="mt-4 text-sm text-slate-500">Select a valid device and interface to compare periods.</p>
          ) : analyticsErrors.comparison ? (
            <div className="mt-4">
              <p className="text-sm text-amber-700">Comparison unavailable: {analyticsErrors.comparison}</p>
              <button type="button" onClick={() => setRefreshVersion((current) => current + 1)} className="mt-2 text-sm font-semibold text-teal-700 underline">
                Retry comparison
              </button>
            </div>
          ) : analyticsLoading.comparison ? (
            <div className="mt-4"><SkeletonLoader lines={3} /></div>
          ) : analytics.comparison?.comparison ? (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ["Average delta", formatSignedMetricValue(analytics.comparison.comparison.averageDelta, selectedMetric)],
                ["Average %", analytics.comparison.comparison.averagePercentChange === null ? "Unavailable" : `${analytics.comparison.comparison.averagePercentChange > 0 ? "+" : ""}${analytics.comparison.comparison.averagePercentChange.toFixed(2)}%`],
                ["Minimum delta", formatSignedMetricValue(analytics.comparison.comparison.minDelta, selectedMetric)],
                ["Maximum delta", formatSignedMetricValue(analytics.comparison.comparison.maxDelta, selectedMetric)],
                ["Sample count delta", analytics.comparison.comparison.countDelta ?? "Unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Comparison is unavailable because one or both periods have insufficient data.</p>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4" aria-labelledby="historical-comparison-chart-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">shape comparison</p>
            <h3 id="historical-comparison-chart-heading" className="mt-1 text-base font-semibold text-slate-800">Aligned current vs previous samples</h3>
          </div>
          <span className="text-xs text-slate-500">Aligned by elapsed time, original timestamps in tooltip</span>
        </div>
        {currentComparisonLoading ? (
          <div className="mt-4">
            <SkeletonLoader lines={5} />
          </div>
        ) : currentComparisonError ? (
          <p className="mt-4 text-sm text-amber-700">Comparison chart unavailable: {currentComparisonError}</p>
        ) : previousSamples.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No previous-period samples are available for comparison.</p>
        ) : comparisonData.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No samples are available for the selected periods.</p>
        ) : (
          <div className="mt-4 h-72 w-full" aria-label="Current and previous historical metric comparison chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData} margin={{ top: 12, right: 18, left: 4, bottom: 4 }}>
                <CartesianGrid stroke="#dbe5e7" strokeDasharray="3 3" />
                <XAxis
                  dataKey="offset"
                  tickFormatter={formatElapsed}
                  minTickGap={24}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={false}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => formatMetricValue(value, selectedMetric)}
                  width={72}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: chartUnit, angle: -90, position: "insideLeft", fill: "#64748b", fontSize: 12 }}
                />
                <Tooltip content={<ComparisonTooltip metric={selectedMetric} />} />
                <Legend />
                {visibleSamples.length > 0 ? (
                  <Line
                    type="monotone"
                    dataKey="currentValue"
                    name="Current period"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#0f766e", strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                ) : null}
                <Line
                  type="monotone"
                  dataKey="previousValue"
                  name="Previous period"
                  stroke="#64748b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={{ r: 3, fill: "#64748b", strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4" aria-labelledby="historical-trend-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">trend</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h3 id="historical-trend-heading" className="text-base font-semibold text-slate-800">Backend classification</h3>
          {analyticsKey !== selectionKey ? (
            <span className="text-sm text-slate-500">Select a valid device and interface to load trend data.</span>
          ) : analyticsErrors.trend ? (
            <span className="text-sm text-amber-700">Unavailable: {analyticsErrors.trend}</span>
          ) : analyticsLoading.trend ? (
            <span className="text-sm text-slate-500">Loading trend...</span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-700">
              {trendPresentation.icon}
              {trendPresentation.label}
            </span>
          )}
        </div>
      </section>

      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700">
          <Database className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-slate-500" />
          <span>
            {visibleSamples.length} historical sample{visibleSamples.length === 1 ? "" : "s"} for {selectedMetric}
          </span>
        </div>
        <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
          <TrendingUp className="h-4 w-4" />
          <span>{selectedRange}</span>
        </div>
      </div>
    </section>
  );
}
