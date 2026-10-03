const base_url = (process.env.NEXT_PUBLIC_BASE_API_URL || 'http://localhost:8000').replace(/\/$/, "");
const route = (path) => `${base_url}${path}`;
const apiFetch = (input, options = {}) => fetch(input, { credentials: "include", ...options });

const API = {
  fetch: apiFetch,
  routes: {
    network: {
      alerts: route("/api/alerts"),
      devices: route("/api/devices"),
      device: (deviceId) => route(`/api/devices/${encodeURIComponent(deviceId)}`),
      renameDevice: (deviceId) => route(`/api/devices/${encodeURIComponent(deviceId)}/name`),
      updateDevice: (deviceId) => route(`/api/devices/${encodeURIComponent(deviceId)}/update`),
      topology: route("/api/topology"),
      endpoints: route("/api/endpoints"),
      interfaces: (deviceId) => route(`/api/interfaces/${encodeURIComponent(deviceId)}`),
    },
    health: {
      snapshot: route("/api/health"),
      check: route("/api/health/check"),
    },
    bandwidth: route("/api/bandwidth"),
    historicalMetrics: {
      query: route("/api/historical-metrics/query"),
      summary: route("/api/historical-metrics/summary"),
      analyticsSummary: route("/api/historical-metrics/analytics/summary"),
      compare: route("/api/historical-metrics/compare"),
      analyticsCompare: route("/api/historical-metrics/analytics/compare"),
      analyticsTrend: route("/api/historical-metrics/analytics/trend"),
      byDevice: (deviceId) => route(`/api/historical-metrics/device/${encodeURIComponent(deviceId)}`),
      byInterface: (deviceId, interfaceId) => route(`/api/historical-metrics/interface/${encodeURIComponent(deviceId)}/${encodeURIComponent(interfaceId)}`),
      latest: route("/api/historical-metrics/latest"),
      aggregate: route("/api/historical-metrics/aggregate"),
    },
    alerts: {
      list: route("/api/alerts"),
      detail: (alertId) => route(`/api/alerts/${encodeURIComponent(alertId)}`),
      acknowledge: (alertId) => route(`/api/alerts/${encodeURIComponent(alertId)}/acknowledge`),
      resolve: (alertId) => route(`/api/alerts/${encodeURIComponent(alertId)}/resolve`),
    },
    auth: {
      login: route("/api/auth/login"),
      me: route("/api/auth/me"),
      logout: route("/api/auth/logout"),
    },
    admin: {
      resetData: route("/api/admin/reset-data"),
    },
    users: {
      list: route("/api/users"),
      detail: (userId) => route(`/api/users/${encodeURIComponent(userId)}`),
    },
    groups: {
      list: route("/api/groups"),
      detail: (groupId) => route(`/api/groups/${encodeURIComponent(groupId)}`),
    },
    notificationConfigs: {
      list: route("/api/notification-configs"),
      detail: (notificationId) => route(`/api/notification-configs/${encodeURIComponent(notificationId)}`),
    },
    notificationDeliveries: {
      list: route("/api/notification-deliveries"),
      detail: (deliveryId) => route(`/api/notification-deliveries/${encodeURIComponent(deliveryId)}`),
      deliver: (deliveryId) => route(`/api/notification-deliveries/${encodeURIComponent(deliveryId)}/deliver`),
      retry: (deliveryId) => route(`/api/notification-deliveries/${encodeURIComponent(deliveryId)}/retry`),
      recover: (deliveryId) => route(`/api/notification-deliveries/${encodeURIComponent(deliveryId)}/recover`),
    },
    realtime: { events: route("/api/events") },
    requests: {
      list: route("/api/audit-logs"),
      create: route("/api/audit-logs"),
    },
    discovery: {
      start: route("/api/discovery-init"),
      manualScan: route("/api/discovery/manual-scan"),
      gateway: route("/api/discover-gw"),
      lan: (ip, community) => {
        const url = route(`/api/discover-lan/${encodeURIComponent(ip)}`);
        return community ? `${url}?community=${encodeURIComponent(community)}` : url;
      },
    },
    deviceImport: route("/api/devices/import"),
    terminal: {
      devices: route("/api/terminal/devices"),
      session: route("/api/terminal/session"),
      execute: route("/api/terminal/execute"),
      cancel: route("/api/terminal/cancel"),
    },
    diagnostics: {
      discovery: (ip, community) => {
        const query = new URLSearchParams({ ip, community }).toString();
        return route(`/api/test?${query}`);
      },
      lldpByMac: (ip, mac, community) => {
        const query = new URLSearchParams({ ip, mac, community }).toString();
        return route(`/api/test/lldp-by-mac?${query}`);
      },
    },
  },
};

export default API;
export { API };
