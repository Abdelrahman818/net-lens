"use client";

import { useEffect, useMemo, useState } from "react";

import Navbar from "@/components/NavBar";
import Aside from "@/components/Aside";
import TopologyMap from "@/components/TopologyMap";
import API from "@/config";
import SkeletonLoader from "@/components/ui/SkeletonLoader";
import useDiscovery from "@/hooks/useDiscovery";
import TopologyInspector from "@/components/TopologyInspector";
import TopologySummary from "@/components/TopologySummary";
import { classifyDevice } from "@/lib/deviceTypeClassifier";
import { combineDeviceInventory } from "@/lib/deviceInventory";

const defaultNetworkData = {
  topology: { nodes: [] },
  devices: [],
  endpoints: [],
};

export default function TopologyPage() {
  const [network, setNetwork] = useState(defaultNetworkData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [refreshVersion, setRefreshVersion] = useState(0);
  const discovery = useDiscovery(() => setRefreshVersion((value) => value + 1));

  useEffect(() => {
    let ignore = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await API.fetch(API.routes.network.topology);
        if (!response.ok) throw new Error(`Topology request failed (${response.status})`);
        const payload = await response.json();
        if (!ignore) {
          const devices = (Array.isArray(payload?.devices) ? payload.devices : []).map(classifyDevice);
          const devicesById = new Map(devices.map((device) => [device.id, device]));
          setNetwork({
          devices,
          endpoints: Array.isArray(payload?.endpoints) ? payload.endpoints : [],
          topology: {
            nodes: (Array.isArray(payload?.topology?.nodes) ? payload.topology.nodes : []).map((node) => ({
              ...node,
              type: devicesById.get(node.deviceId)?.type || node.type,
              vendor: devicesById.get(node.deviceId)?.vendor || node.vendor,
            })),
            links: Array.isArray(payload?.topology?.links) ? payload.topology.links : [],
          },
          });
        }
      } catch (err) {
        if (!ignore) {
          console.error("Failed to fetch topology:", err);
          setError(err.message);
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

  const topologyNodes = useMemo(() => network.topology?.nodes ?? [], [network.topology?.nodes]);
  const topologyLinks = useMemo(() => network.topology?.links ?? [], [network.topology?.links]);
  const visibleNodes = useMemo(() => topologyNodes.filter((node) => (
    (statusFilter === "all" || node.status === statusFilter)
    && (typeFilter === "all"
      || (typeFilter === "network" && node.type !== "endpoint")
      || (typeFilter === "endpoints" && node.type === "endpoint")
      || node.type === typeFilter)
  )), [topologyNodes, statusFilter, typeFilter]);
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleLinks = useMemo(
    () => topologyLinks.filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target)),
    [topologyLinks, visibleIds]
  );
  const selectedNodeInfo = visibleNodes.find((node) => node.id === selectedNode) ?? visibleNodes[0] ?? null;
  const selectedDevice = [...network.devices, ...network.endpoints].find((device) => device.id === selectedNodeInfo?.deviceId);
  const connectionPath = selectedNodeInfo ? [selectedNodeInfo] : [];

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)]">
      <Navbar />

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-6 md:px-6">
        <Aside />

        <main className="flex-1 xl:ml-[106px]">
          {error ? (
            <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              Unable to load topology: {error}
              <button type="button" onClick={() => setRefreshVersion((value) => value + 1)} className="ml-3 font-semibold underline">Retry</button>
            </div>
          ) : null}
          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5">
            <div className="flex flex-col items-start justify-between gap-6 xl:flex-row">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">topology</p>
                <h1 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">Topology map</h1>
                <p className="mt-2 max-w-prose text-sm text-[var(--text-secondary)]">Explore persisted devices and their real network relationships.</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"><option value="all">All statuses</option><option value="online">Online</option><option value="offline">Offline</option><option value="unknown">Unknown</option></select>
                <select aria-label="Filter by device type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                  <option value="all">All types</option>
                  <option value="network">Network devices</option>
                  <option value="endpoints">Endpoints</option>
                  {[...new Set(topologyNodes.map((node) => node.type).filter((type) => type && type !== "endpoint"))].map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-4 shadow-sm">
                {loading && !topologyNodes.length ? (
                  <SkeletonLoader lines={6} />
                ) : (
                  <>
                    <TopologyMap
                      nodes={visibleNodes}
                      links={visibleLinks}
                      selectedNode={selectedNodeInfo?.id}
                      onSelect={setSelectedNode}
                      onDiscover={discovery.start}
                    />
                    <div className="mt-4"><TopologySummary nodes={topologyNodes} links={topologyLinks} devices={network.devices} endpoints={network.endpoints} inventoryCount={combineDeviceInventory(network.devices, network.endpoints).length} lastDiscovery={discovery.startedAt} /></div>
                  </>
                )}
              </div>

              <div className="space-y-4">
              <TopologyInspector node={selectedNodeInfo} device={selectedDevice} path={connectionPath} />
              <details className="h-fit rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-sm">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">Map legend</summary>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-secondary)]">
                  {[
                    ["Online", "bg-[var(--online)]"],
                    ["Warning", "bg-[var(--warning)]"],
                    ["Offline", "bg-[var(--offline)]"],
                    ["Unknown", "bg-[var(--text-muted)]"],
                  ].map(([label, color]) => <span key={label} className="inline-flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>)}
                  <span className="col-span-2 mt-1 inline-flex items-center gap-2"><span className="h-px w-5 bg-[var(--border-soft)]" />Connected link</span>
                </div>
              </details>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
