"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  CircleHelp,
  Fingerprint,
  LayoutGrid,
  Laptop,
  Maximize2,
  Minus,
  Monitor,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Router,
  Search,
  Server,
  Shield,
  Smartphone,
  Wifi,
  Minimize2,
} from "lucide-react";
import { calculateOrthogonalPath, calculateTopologyLayout } from "@/lib/topologyLayout";

const NODE_STYLES = {
  router: { icon: Router, label: "Router" },
  switch: { icon: Server, label: "Switch" },
  firewall: { icon: Shield, label: "Firewall" },
  server: { icon: Server, label: "Server" },
  access_point: { icon: Wifi, label: "Access point" },
  "access-point": { icon: Wifi, label: "Access point" },
  phone: { icon: Phone, label: "Phone" },
  ip_phone: { icon: Phone, label: "IP phone" },
  smartphone: { icon: Smartphone, label: "Smartphone" },
  laptop: { icon: Laptop, label: "PC" },
  pc: { icon: Monitor, label: "PC" },
  printer: { icon: Printer, label: "Printer" },
  camera: { icon: Camera, label: "Camera" },
  access_control: { icon: Fingerprint, label: "Access control" },
  endpoint: { icon: Laptop, label: "Endpoint" },
};

const STATUS_STYLES = {
  online: {
    label: "Online",
    dot: "bg-[var(--online)]",
    badge: "text-[var(--online-text)]",
  },
  warning: {
    label: "Warning",
    dot: "bg-[var(--warning)]",
    badge: "text-[var(--warning-text)]",
  },
  degraded: {
    label: "Warning",
    dot: "bg-[var(--warning)]",
    badge: "text-[var(--warning-text)]",
  },
  timeout: {
    label: "Warning",
    dot: "bg-[var(--warning)]",
    badge: "text-[var(--warning-text)]",
  },
  offline: {
    label: "Offline",
    dot: "bg-[var(--offline)]",
    badge: "text-[var(--offline-text)]",
  },
  unknown: {
    label: "Unknown",
    dot: "bg-[var(--text-muted)]",
    badge: "text-[var(--text-muted)]",
  },
};

function statusFor(value) {
  return STATUS_STYLES[String(value || "unknown").toLowerCase()] || STATUS_STYLES.unknown;
}

const TopologyNode = memo(function TopologyNode({
  node,
  selected,
  dimmed,
  onSelect,
  onHover,
}) {
  const style = NODE_STYLES[node.type] || { icon: CircleHelp, label: "Unknown device" };
  const Icon = style.icon;
  const status = statusFor(node.status);
  const endpoint = node.type === "endpoint" || ["pc", "laptop", "printer", "camera", "phone", "ip_phone", "smartphone"].includes(node.type);

  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      aria-label={`Select ${node.label || style.label}, ${status.label}`}
      aria-pressed={selected}
      className={`group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5 rounded-lg border bg-[var(--surface-raised)] px-2.5 text-left transition-[opacity,border-color,box-shadow,background-color] duration-150 hover:z-30 hover:border-[var(--teal-600)] hover:shadow-md focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal-600)] ${
        endpoint ? "h-[62px] w-[164px]" : "h-[72px] w-[184px]"
      } ${selected ? "border-[var(--teal-700)] ring-2 ring-[var(--teal-700)]/30" : "border-[var(--border)] shadow-sm"} ${dimmed ? "opacity-70" : "opacity-100"}`}
      style={{ left: `${node.x}px`, top: `${node.y}px` }}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--border-soft)] bg-[var(--canvas)] ${endpoint ? "text-[var(--text-secondary)]" : "text-[var(--teal-700)]"}`}>
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">{node.label || "Unknown device"}</span>
        </span>
        <span className="mt-1 block truncate text-[10px] text-[var(--text-muted)]">{style.label}</span>
        {node.ip ? <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--text-secondary)]">{node.ip}</span> : null}
      </span>
      <span className="sr-only">{status.label}</span>
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 hidden w-52 -translate-x-1/2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 text-left shadow-lg group-hover:block group-focus-visible:block">
        <span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{node.label || "Unknown device"}</span>
        <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">{style.label}{node.vendor ? ` · ${node.vendor}` : ""}</span>
        {node.ip ? <span className="mt-1 block font-mono text-[10px] text-[var(--text-secondary)]">IP: {node.ip}</span> : null}
        <span className={`mt-1 flex items-center gap-1.5 text-[10px] font-medium ${status.badge}`}><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
      </span>
    </button>
  );
});

export default function TopologyMap({ nodes = [], links = [], selectedNode, onSelect, onDiscover }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [search, setSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const safeNodes = useMemo(() => (Array.isArray(nodes) ? nodes : []).filter(Boolean), [nodes]);
  const safeLinks = useMemo(() => (Array.isArray(links) ? links : []).filter(Boolean), [links]);
  const layout = useMemo(() => calculateTopologyLayout(safeNodes, safeLinks), [safeNodes, safeLinks]);
  const activeNode = hoveredNode || selectedNode;
  const selectedConnectedNodeIds = useMemo(() => {
    const connected = new Set(selectedNode ? [selectedNode] : []);
    if (selectedNode) {
      safeLinks.forEach((link) => {
        if (link.source === selectedNode) connected.add(link.target);
        if (link.target === selectedNode) connected.add(link.source);
      });
    }
    return connected;
  }, [selectedNode, safeLinks]);
  const routedLinks = useMemo(() => safeLinks.map((link) => ({
    ...link,
    path: calculateOrthogonalPath(link, layout.nodeById),
  })), [layout.nodeById, safeLinks]);
  const matches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return [];
    return layout.nodes.filter((node) => (
      [node.label, node.ip, node.mac, node.type, node.vendor]
        .some((value) => String(value || "").toLowerCase().includes(query))
    )).slice(0, 8);
  }, [layout.nodes, search]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === mapRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const focusNode = useCallback((node) => {
    if (!node) return;
    setOffset({
      x: (layout.width / 2 - node.x) * zoom,
      y: (layout.height / 2 - node.y) * zoom,
    });
    onSelect?.(node.id);
    setSearch("");
  }, [layout.height, layout.width, onSelect, zoom]);

  const handleNodeSelect = useCallback((id) => {
    onSelect?.(id);
    setSearch("");
  }, [onSelect]);

  const fitToScreen = useCallback(() => {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds || !layout.nodes.length) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      return;
    }
    const nextZoom = Math.max(0.25, Math.min(
      1.5,
      (bounds.width - 64) / layout.width,
      (bounds.height - 112) / layout.height
    ));
    setZoom(nextZoom);
    setOffset({ x: 0, y: 0 });
  }, [layout.height, layout.nodes.length, layout.width]);

  const changeZoom = useCallback((delta) => {
    setZoom((current) => Math.max(0.25, Math.min(2, Number((current + delta).toFixed(2)))));
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await mapRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
    requestAnimationFrame(fitToScreen);
  };

  const beginDrag = (event) => {
    if (event.button !== 0 || event.target.closest?.("button, input")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const moveDrag = (event) => {
    const currentDrag = dragRef.current;
    if (!currentDrag) return;
    event.preventDefault();
    const deltaX = event.clientX - currentDrag.x;
    const deltaY = event.clientY - currentDrag.y;
    setOffset((current) => ({
      x: current.x + deltaX,
      y: current.y + deltaY,
    }));
    dragRef.current = { x: event.clientX, y: event.clientY };
  };

  const endDrag = (event) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={mapRef}
      className={`relative ${isFullscreen ? "h-screen w-screen rounded-none" : "h-[760px] min-h-[560px] w-full rounded-lg"} overflow-hidden border border-[var(--border)] bg-[var(--canvas)] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onWheel={(event) => {
        event.preventDefault();
        changeZoom(event.deltaY < 0 ? 0.08 : -0.08);
      }}
      style={{
        touchAction: "none",
        backgroundImage: "radial-gradient(color-mix(in srgb, var(--border-soft) 65%, transparent) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2" onPointerDown={(event) => event.stopPropagation()}>
        <div className="relative w-full max-w-xs">
          <label className="flex h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-2.5 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches.length) focusNode(matches[0]);
                if (event.key === "Escape") setSearch("");
              }}
              aria-label="Search topology by name, IP, MAC, or type"
              placeholder="Find device, IP, MAC…"
              className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
          {search.trim() ? (
            <div className="absolute left-0 right-0 top-10 max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-lg">
              {matches.length ? matches.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => focusNode(node)}
                  className="flex w-full items-center justify-between gap-3 rounded px-2 py-1.5 text-left hover:bg-[var(--canvas)]"
                >
                  <span className="truncate text-xs font-medium text-[var(--text-primary)]">{node.label || "Unknown device"}</span>
                  <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]">{node.ip || node.type}</span>
                </button>
              )) : <p className="px-2 py-2 text-xs text-[var(--text-muted)]">No matching devices</p>}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)] p-1 shadow-sm">
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => changeZoom(-0.1)} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--canvas)]"><Minus className="h-4 w-4" /></button>
          <span className="min-w-10 text-center font-mono text-[10px] text-[var(--text-muted)]">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => changeZoom(0.1)} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--canvas)]"><Plus className="h-4 w-4" /></button>
          <span className="mx-0.5 h-5 w-px bg-[var(--border)]" />
          <button type="button" aria-label="Fit to screen" title="Fit to screen" onClick={fitToScreen} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--canvas)]"><Maximize2 className="h-4 w-4" /></button>
          <button type="button" aria-label="Reset layout" title="Reset layout and view" onClick={() => { setOffset({ x: 0, y: 0 }); setZoom(1); }} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--canvas)]"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" aria-label="Auto layout" title="Auto layout" onClick={fitToScreen} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--canvas)]"><LayoutGrid className="h-4 w-4" /></button>
          <button type="button" aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen} className="rounded p-1.5 text-[var(--text-secondary)] hover:bg-[var(--canvas)]">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div
        className={`absolute origin-center ${dragging ? "transition-none" : "transition-[left,top,transform] duration-150"}`}
        style={{
          left: `calc(50% + ${offset.x}px)`,
          top: `calc(50% + ${offset.y}px)`,
          width: `${layout.width}px`,
          height: `${layout.height}px`,
          transform: `translate(-50%, -50%) scale(${zoom})`,
        }}
      >
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-label="Topology connections">
          {routedLinks.map((link) => {
            const selectedEdge = activeNode && (link.source === activeNode || link.target === activeNode);
            const status = String(link.status || "unknown").toLowerCase();
            const down = ["down", "offline", "failed"].includes(status);
            const warning = ["warning", "degraded"].includes(status);
            const stroke = selectedEdge
              ? "var(--teal-700)"
              : down
                ? "var(--offline)"
                : warning
                  ? "var(--warning)"
                  : "var(--border-soft)";
            return (
              <path
                key={link.id || `${link.source}-${link.target}`}
                d={link.path}
                fill="none"
                stroke={stroke}
                strokeWidth={selectedEdge ? 2.5 : 1.5}
                strokeDasharray={down ? "5 4" : undefined}
                opacity={activeNode && !selectedEdge ? 0.5 : selectedEdge ? 1 : 0.9}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </svg>
        {layout.nodes.map((node) => (
          <TopologyNode
            key={node.id}
            node={node}
            selected={selectedNode === node.id}
            dimmed={Boolean(selectedNode && !selectedConnectedNodeIds.has(node.id))}
            onSelect={handleNodeSelect}
            onHover={setHoveredNode}
          />
        ))}
      </div>

      {!layout.nodes.length ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
          <div className="max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-5 text-center">
            <Router className="mx-auto h-6 w-6 text-[var(--text-muted)]" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">No topology discovered yet</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Run discovery to build the network map.</p>
            {onDiscover ? <button type="button" onClick={onDiscover} className="mt-3 rounded-md bg-[var(--teal-800)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--teal-700)]">Start discovery</button> : null}
          </div>
        </div>
      ) : null}
      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[var(--border)] bg-[var(--surface-raised)]/95 px-2.5 py-2 text-[10px] text-[var(--text-secondary)]">
        {["online", "warning", "offline", "unknown"].map((value) => {
          const status = statusFor(value);
          return <span key={value} className="inline-flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>;
        })}
        <span className="mx-0.5 h-3 w-px bg-[var(--border)]" />
        <span className="inline-flex items-center gap-1.5"><span className="h-px w-4 bg-[var(--border-soft)]" />Connected</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-px w-4 border-t border-dashed border-[var(--offline)]" />Down</span>
      </div>
    </div>
  );
}
