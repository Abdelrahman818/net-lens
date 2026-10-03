"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ServerCog } from "lucide-react";

import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import TableHead from "@/components/ui/devicesTableHead";
import TableRow from "@/components/ui/devicesTableRow";
import SearchBar from "@/components/ui/searchBar";
import Opts from "@/components/ui/showOpts";
import API from "@/config";
import EmptyState from "@/components/ui/EmptyState";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import useDiscovery from "@/hooks/useDiscovery";
import useRealtime from "@/hooks/useRealtime";
import { classifyDevice } from "@/lib/deviceTypeClassifier";
import { combineDeviceInventory } from "@/lib/deviceInventory";


const defaultNetworkData = {
  devices: [],
  endpoints: [],
};

function formatRelativeMinutes(minutes) {
  if (minutes === undefined || minutes === null || Number.isNaN(Number(minutes))) return "just now";
  const totalMinutes = Number(minutes);
  if (totalMinutes < 60) return `${Math.max(0, Math.round(totalMinutes))}m ago`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);
  return remainingMinutes === 0 ? `${hours}h ago` : `${hours}h ${remainingMinutes}m ago`;
}

export default function DevicesPage() {
  const router = useRouter();
  const [network, setNetwork] = useState(defaultNetworkData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useDiscovery(() => setRefreshVersion((value) => value + 1));
  useDiscovery(() => setRefreshVersion((value) => value + 1));
  useRealtime((event) => {
    if (event?.eventType !== "device.health.updated") return;
    const data = event.data;
    setNetwork((current) => ({
      ...current,
      devices: current.devices.map((device) => (
        String(device.id || device._id) === String(data.deviceId)
          ? { ...device, status: data.status, ping: data.ping, lastChecked: data.lastChecked }
          : device
      )),
    }));
  });

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const [devicePayload, endpointPayload] = await Promise.all([
          API.fetch(API.routes.network.devices).then((response) => response.json()),
          API.fetch(API.routes.network.endpoints).then((response) => response.json()),
        ]);
        const devices = (Array.isArray(devicePayload) ? devicePayload : devicePayload?.devices || []).map(classifyDevice);
        const endpoints = (Array.isArray(endpointPayload) ? endpointPayload : endpointPayload?.endpoints || [])
          .map((endpoint) => ({
            ...endpoint,
            id: endpoint.id || endpoint._id || endpoint.mac,
            name: endpoint.name || endpoint.ip || endpoint.mac || "Endpoint",
            type: "endpoint",
            status: endpoint.status || "unknown",
            lastSeenMinutes: endpoint.lastSeen ? Math.max(0, (Date.now() - new Date(endpoint.lastSeen).getTime()) / 60000) : null,
          }));
        const data = { devices: combineDeviceInventory(devices, endpoints), endpoints };
        if (!ignore) {
          setNetwork(data || defaultNetworkData);
          if (data?.devices?.length > 0) {
            setSelectedDevice(data.devices[0]);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to fetch devices:", err);
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
  }, [refreshVersion]);

  const filteredDevices = useMemo(() => {
    return (network.devices ?? []).filter((device) => {
      const matchesFilter = statusFilter === "all" || device.status === statusFilter;
      const matchesSearch = [device.name, device.ip, device.mac, device.vendor, device.segment]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [network.devices, search, statusFilter]);

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />

        <main className="flex-1 xl:ml-[106px]">
          { false && (
            <EmptyState
              title="No API configured — devices"
              message="Device inventory is unavailable because the backend has no device inventory endpoint."
              details="Run discovery to view devices reported by the realtime stream."
            />
          ) }
          {error ? (
            <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Unable to load devices: {error}
              <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="ml-3 font-semibold underline">Retry</button>
            </div>
          ) : null}

          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_12px_30px_rgba(23,63,67,0.04)]">
            <div className="flex flex-col items-start justify-between gap-6 xl:flex-row xl:items-center">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">devices</p>
                <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)]">Device inventory</h1>
                <p className="mt-3 max-w-prose text-[var(--text-secondary)]">All discovered devices with status, last-seen, and grouping. Use filters and search to narrow results.</p>
              </div>

              <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
                <SearchBar icon={<Search className="h-4 w-4" />} holder="Search devices, IP, MAC" value={search} onChange={setSearch} />
                <div className="flex gap-3">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">Import</div>
                  <div className="rounded-lg border border-[var(--teal-700)] bg-[var(--mint-100)] px-3 py-2 text-sm font-semibold text-[var(--teal-800)]">Export</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-4 xl:flex-row xl:items-center">
                <Opts value={statusFilter} onChange={setStatusFilter} />
                <div className="text-sm text-[var(--text-muted)]">Showing {filteredDevices.length} of {network.devices.length} devices</div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <TableHead />
                {loading ? (
                  <SkeletonLoader lines={8} />
                ) : (
                  !filteredDevices.length && !error ? (
                    <p className="py-8 text-center text-sm text-[var(--text-muted)]">No discovered devices found.</p>
                  ) : filteredDevices.map((d) => (
                    <TableRow
                      key={d.id}
                      icon={<ServerCog className="h-4 w-4" />}
                      name={d.name}
                      type={d.type}
                      ip={d.ip}
                      mac={d.mac}
                      vendor={d.vendor}
                      status={d.status}
                      lastSeen={formatRelativeMinutes(d.lastSeenMinutes)}
                      segment={d.segment}
                      selected={selectedDevice?.id === d.id}
                      onSelect={() => { setSelectedDevice(d); router.push(`/devices/${encodeURIComponent(d.id)}`); }}
                    />
                  ))
                )}

                <div className="mt-4 flex items-center justify-end text-sm text-[var(--text-muted)]">Page 1</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
