"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BellRing,
  Gauge,
  MonitorCheck,
  Search,
  ServerCog,
} from "lucide-react";

import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import Button from "@/components/ui/button";
import InfoCard from "@/components/ui/infoCard";
import SearchBar from "@/components/ui/searchBar";
import TableHead from "@/components/ui/devicesTableHead";
import TableRow from "@/components/ui/devicesTableRow";
import Opts from "@/components/ui/showOpts";
import API from "@/config";
import { formatRelativeMinutes } from "@/lib/format";
import { classifyDevice } from "@/lib/deviceTypeClassifier";
import { combineDeviceInventory } from "@/lib/deviceInventory";

import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import useDiscovery from "@/hooks/useDiscovery";
import useRealtime from "@/hooks/useRealtime";

const defaultNetworkData = {
  overview: {
    onlineDevices: 0,
    networkHealth: "0%",
    alerts: 0,
  },
  devices: [],
  endpoints: [],
  topology: { nodes: [] },
};

export default function Home() {
  const router = useRouter();
  const [network, setNetwork] = useState(defaultNetworkData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("network");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [healthScore, setHealthScore] = useState(null);
  const discovery = useDiscovery(() => setRefreshVersion((value) => value + 1));
  useRealtime(useCallback((event) => {
    if (event?.eventType !== "device.health.updated") return;
    const data = event.data;
    setNetwork((current) => ({
      ...current,
      devices: current.devices.map((device) => (
        String(device.id || device._id) === String(data.deviceId)
          ? { ...device, status: data.status, ping: data.ping, lastChecked: data.lastChecked }
          : device
      )),
      endpoints: current.endpoints.map((endpoint) => (
        String(endpoint.id || endpoint._id) === String(data.deviceId)
          ? { ...endpoint, status: data.status, ping: data.ping, lastChecked: data.lastChecked }
          : endpoint
      )),
    }));
  }, []));

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [alerts, devices, endpoints] = await Promise.all([
          API.fetch(API.routes.network.alerts, { signal: controller.signal }).then((response) => response.json()).then((payload) => (Array.isArray(payload) ? payload : [])),
          API.fetch(API.routes.network.devices, { signal: controller.signal }).then((response) => response.json()).then((payload) => (Array.isArray(payload) ? payload : payload?.devices || [])),
          API.fetch(API.routes.network.endpoints, { signal: controller.signal }).then((response) => response.json()).then((payload) => (Array.isArray(payload) ? payload : payload?.endpoints || [])),
        ]);
        const data = {
          ...defaultNetworkData,
          devices: devices.map(classifyDevice),
          endpoints,
          alerts,
          overview: {
            ...defaultNetworkData.overview,
            alerts: alerts.length,
          },
        };
        if (!ignore) {
          setNetwork(data || defaultNetworkData);
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to fetch network data:", err);
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
      controller.abort();
    };
  }, [refreshVersion]);

  useEffect(() => {
    const controller = new AbortController();
    API.fetch(API.routes.health.snapshot, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Health request failed (${response.status})`);
        return response.json();
      })
      .then((payload) => setHealthScore(Number.isFinite(payload?.networkHealth?.score) ? payload.networkHealth.score : null))
      .catch((error) => {
        if (error?.name !== "AbortError") console.error("Failed to load health score:", error);
      });
    return () => controller.abort();
  }, [refreshVersion]);

  const filteredDevices = useMemo(() => {
    const endpointRows = (network.endpoints ?? []).map((endpoint) => ({
      ...endpoint,
      id: endpoint.id || endpoint._id || endpoint.mac,
      name: endpoint.mac || endpoint.ip || "Endpoint",
      type: "endpoint",
      status: endpoint.status || "unknown",
      lastSeenMinutes: endpoint.lastSeen ? Math.max(0, (now - new Date(endpoint.lastSeen).getTime()) / 60000) : null,
    }));
    const source = statusFilter === "endpoints"
      ? endpointRows
      : statusFilter === "all"
        ? combineDeviceInventory(network.devices ?? [], endpointRows)
        : network.devices ?? [];
    return source.filter((device) => {
      const matchesFilter = ["network", "all", "endpoints"].includes(statusFilter) || device.status === statusFilter;
      return matchesFilter;
    });
  }, [network.devices, network.endpoints, statusFilter, now]);

  const inventory = combineDeviceInventory(network.devices, network.endpoints);
  const onlineDevices = inventory.filter((device) => device.status === "online").length;
  const overviewCards = [
    {
      title: "discovered devices",
      number: String(inventory.length),
      label: "inventory",
      color: "#4F83A5",
      icon: <ServerCog className="h-5 w-5" />,
    },
    {
      title: "online devices",
      number: String(onlineDevices),
      label: "active",
      color: "#2DBB79",
      icon: <MonitorCheck className="h-5 w-5" />,
    },
    {
      title: "alerts",
      number: String(network.overview?.alerts ?? 0),
      label: "needs review",
      color: "#D89C38",
      icon: <BellRing className="h-5 w-5" />,
    },
    {
      title: "network health",
      number: healthScore === null ? "—" : `${healthScore}%`,
      label: inventory.length ? "operational score" : "no inventory",
      color: "#338B89",
      icon: <Gauge className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#eef3f3] text-slate-800">
      <Navbar onStartScan={discovery.start} scanState={discovery.status} />

      <div className="mx-auto flex max-w-[1600px] gap-6 px-5 py-6">
        <Aside />

        <main className="flex-1 xl:ml-[106px]">
          <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">workspace overview</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-800">Network operations center</h1>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <SearchBar icon={<Search className="h-4 w-4" />} holder="Search devices, IPs, VLANs" />
              <div className="flex gap-3">
                <Button
                  text="Refresh data"
                  icon={<Activity className="h-4 w-4" />}
                  onClick={() => setRefreshVersion((value) => value + 1)}
                />
              </div>
            </div>
          </div>

          {error ? (
            <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Unable to load dashboard data: {error}
              <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="ml-3 font-semibold underline">Retry</button>
            </div>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading ? (
              <SkeletonLoader lines={4} />
            ) : (
              overviewCards.map((card) => (
                <InfoCard
                  key={card.title}
                  title={card.title}
                  icon={card.icon}
                  number={card.number}
                  lable={card.label}
                  lableColor={card.color}
                />
              ))
            )}
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">device inventory</p>
                <h2 className="mt-2 text-xl font-bold text-slate-800">Connected assets</h2>
              </div>

              <Opts value={statusFilter} onChange={setStatusFilter} options={["network", "all", "endpoints", "online", "warning", "offline"]} />
            </div>

            <div className="mt-4">
              <TableHead />
            {loading ? (
              <SkeletonLoader lines={6} />
            ) : (
              !filteredDevices.length && !error ? (
                <p className="py-8 text-center text-sm text-slate-500">No discovered devices found.</p>
              ) : filteredDevices.map((device) => (
                <TableRow
                  key={device.id}
                  icon={<ServerCog className="h-4 w-4 text-slate-600" />}
                  name={device.name}
                  type={device.type}
                  ip={device.ip}
                  mac={device.mac}
                  vendor={device.vendor}
                  status={device.status}
                  lastSeen={formatRelativeMinutes(device.lastSeenMinutes)}
                  segment={device.segment}
                  groupNames={device.groupNames}
                  selected={false}
                  onSelect={() => router.push(`/devices/${encodeURIComponent(device.id)}`)}
                />
              ))
            )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
