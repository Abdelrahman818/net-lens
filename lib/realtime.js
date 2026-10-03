import API from "@/config";

export const REALTIME_EVENT_TYPES = [
  "alert.created",
  "alert.acknowledged",
  "alert.resolved",
  "device.status.changed",
  "interface.status.changed",
  "notification.delivery.created",
  "notification.delivery.sent",
  "notification.delivery.failed",
  "discovery.started",
  "discovery.device.discovered",
  "discovery.device.failed",
  "discovery.completed",
  "discovery.failed",
];

const eventListeners = new Set();
const statusListeners = new Set();
let eventSource = null;
let status = "disconnected";

function setStatus(nextStatus) {
  status = nextStatus;
  statusListeners.forEach((listener) => {
    try {
      listener(status);
    } catch {
      // A status consumer must not affect the shared connection.
    }
  });
}

function parseEvent(message) {
  if (!message || typeof message.data !== "string") {
    return null;
  }

  try {
    const data = JSON.parse(message.data);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return null;
    }
    return {
      event: message.type,
      id: message.lastEventId || "",
      data,
      eventId: data.eventId,
      eventType: data.eventType,
      occurredAt: data.occurredAt,
      source: data.source,
    };
  } catch {
    return null;
  }
}

function notifyEvent(message) {
  const event = parseEvent(message);
  if (!event) {
    return;
  }

  eventListeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // One dashboard must not prevent other dashboards receiving events.
    }
  });
}

function closeConnection() {
  if (!eventSource) {
    return;
  }
  eventSource.close();
  eventSource = null;
  setStatus("disconnected");
}

function openConnection() {
  if (eventSource || typeof window === "undefined" || typeof EventSource === "undefined") {
    return;
  }

  setStatus("connecting");
  eventSource = new EventSource(API.routes.realtime.events, { withCredentials: true });
  REALTIME_EVENT_TYPES.forEach((eventType) => {
    eventSource.addEventListener(eventType, notifyEvent);
  });
  eventSource.onopen = () => setStatus("connected");
  eventSource.onerror = () => {
    setStatus(eventSource?.readyState === EventSource.CONNECTING ? "connecting" : "disconnected");
  };
}

export function ensureRealtime() {
  openConnection();
}

export function subscribeRealtime(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("realtime listener must be a function");
  }
  eventListeners.add(listener);
  openConnection();
  return () => {
    eventListeners.delete(listener);
    if (!eventListeners.size && !statusListeners.size) {
      closeConnection();
    }
  };
}

export function subscribeRealtimeStatus(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("realtime status listener must be a function");
  }
  statusListeners.add(listener);
  listener(status);
  openConnection();
  return () => {
    statusListeners.delete(listener);
    if (!eventListeners.size && !statusListeners.size) {
      closeConnection();
    }
  };
}

export function getRealtimeStatus() {
  return status;
}

export function closeRealtime() {
  eventListeners.clear();
  statusListeners.clear();
  closeConnection();
}

export { parseEvent };
