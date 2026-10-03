"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import API from "@/config";
import useRealtime from "@/hooks/useRealtime";
import { ensureRealtime } from "@/lib/realtime";

const INITIAL = { status: "idle", discoveryId: null, startedAt: null, devices: [], error: null, elapsedSeconds: 0 };
const DISCOVERY_REFRESH_INTERVAL_MS = 20 * 60 * 1000;
const DiscoveryContext = createContext(null);

function formatElapsedTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${remainder}s`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

export function DiscoveryProvider({ children }) {
  const pathname = usePathname();
  const [state, setState] = useState(INITIAL);
  const timerRef = useRef(null);
  const pollingRef = useRef(false);
  const abortRef = useRef(null);
  const startRef = useRef(null);
  const seenEvents = useRef(new Set());

  useEffect(() => {
    const record = (payload) => {
      API.fetch(API.routes.requests.create, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    };
    record({
      eventType: "ui.page.viewed",
      action: "Request page viewed",
      source: "ui",
      actor: { type: "user", label: "UI user" },
      message: `Viewed ${pathname}`,
      metadata: { pathname }
    });
    const handleClick = (event) => {
      const target = event.target.closest?.("button, a, [role='button'], input, select, textarea");
      if (!target) return;
      const label = (target.getAttribute("aria-label") || target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 120);
      if (!label) return;
      record({
        eventType: "ui.click",
        action: "User click",
        source: "ui",
        actor: { type: "user", label: "UI user" },
        message: `Clicked "${label}"`,
        metadata: { pathname: window.location.pathname, label, tag: target.tagName.toLowerCase() }
      });
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const finish = useCallback((nextState) => {
    stopTimer();
    pollingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setState(nextState);
  }, [stopTimer]);

  useRealtime(useCallback((event) => {
    const data = event?.data;
    if (!data) return;
    if (event.eventType !== "device.health.updated" && data.discoveryId !== state.discoveryId) return;
    if (event.eventId && seenEvents.current.has(event.eventId)) return;
    if (event.eventId) seenEvents.current.add(event.eventId);
    if (event.eventType === "discovery.started") {
      setState((current) => ({ ...current, status: "discovering" }));
    } else if (event.eventType === "discovery.device.discovered" && data.device?.id) {
      setState((current) => ({
        ...current,
        status: "discovering",
        devices: [...current.devices.filter((device) => device.id !== data.device.id), data.device],
      }));
    } else if (event.eventType === "discovery.device.failed") {
      setState((current) => ({ ...current, error: data.error || current.error }));
    } else if (event.eventType === "device.health.updated") {
      setState((current) => ({
        ...current,
        devices: current.devices.map((device) => {
          const id = device.id || device._id;
          return id === data.deviceId
            ? { ...device, status: data.status, ping: data.ping, lastChecked: data.lastChecked }
            : device;
        }),
      }));
    } else if (event.eventType === "discovery.completed") {
      finish({ ...state, status: "completed" });
    } else if (event.eventType === "discovery.failed") {
      finish({ ...state, status: "failed", error: data.error || "Discovery failed" });
    }
  }, [finish, state]), []); 

  const start = useCallback(async () => {
    if (pollingRef.current || ["starting", "discovering"].includes(state.status)) return;
    const startedAt = Date.now();
    setState({ ...INITIAL, status: "starting", startedAt });
    ensureRealtime();
    timerRef.current = window.setInterval(() => {
      setState((current) => ({ ...current, elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) }));
    }, 1000);
    pollingRef.current = true;

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const response = await API.fetch(API.routes.discovery.start, {
        method: "GET",
        signal: controller.signal
      });
      if (!response.ok) {
        let message = `Discovery request failed (${response.status})`;
        try {
          const payload = await response.json();
          if (payload?.error) message = `${message}: ${payload.error}`;
        } catch {
          // Preserve the status-based error when the backend has no JSON body.
        }
        throw new Error(message);
      }

      const result = await response.json();
      const devices = Array.isArray(result?.devices) ? result.devices : [];
      setState((current) => ({
        ...current,
        status: "completed",
        devices,
        elapsedSeconds: Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
      }));
      stopTimer();
      pollingRef.current = false;
      abortRef.current = null;
    } catch (error) {
      if (error?.name !== "AbortError") {
        finish({ ...INITIAL, status: "failed", error: error.message });
      }
    }
  }, [finish, state.status, stopTimer]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(() => {
    const refreshTimer = window.setInterval(() => {
      startRef.current?.();
    }, DISCOVERY_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(refreshTimer);
  }, []);

  useEffect(() => () => {
    pollingRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimer();
  }, [stopTimer]);

  return <DiscoveryContext.Provider value={{ ...state, start, formatElapsedTime }}>{children}</DiscoveryContext.Provider>;
}

export default function useDiscovery(onCompleted) {
  const context = useContext(DiscoveryContext);
  if (!context) throw new Error("useDiscovery must be used within DiscoveryProvider");
  const previousStatus = useRef(context.status);
  useEffect(() => {
    if (context.status === "completed" && previousStatus.current !== "completed") onCompleted?.();
    previousStatus.current = context.status;
  }, [context.status, onCompleted]);
  return context;
}
